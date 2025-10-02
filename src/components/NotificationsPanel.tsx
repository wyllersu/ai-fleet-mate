import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Calendar, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  vehicleNumber: string;
  licensePlate: string;
  serviceType: string;
  type: "date" | "km";
  daysUntil?: number;
  kmUntil?: number;
  scheduledDate?: string;
  scheduledKm?: number;
  currentKm?: number;
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenances" }, fetchNotifications)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotifications() {
    const { data: scheduledMaintenances } = await supabase
      .from("maintenances")
      .select(`
        id,
        service_type,
        scheduled_date,
        scheduled_km,
        vehicles (
          vehicle_number,
          license_plate,
          km_current
        )
      `)
      .eq("status", "Agendado");

    if (!scheduledMaintenances) return;

    const alerts: Notification[] = [];
    const today = new Date();

    scheduledMaintenances.forEach((maintenance: any) => {
      const vehicle = maintenance.vehicles;
      
      // Date alert (7 days or less)
      if (maintenance.scheduled_date) {
        const scheduledDate = new Date(maintenance.scheduled_date);
        const daysUntil = differenceInDays(scheduledDate, today);
        
        if (daysUntil <= 7 && daysUntil >= 0) {
          alerts.push({
            id: maintenance.id,
            vehicleNumber: vehicle.vehicle_number,
            licensePlate: vehicle.license_plate,
            serviceType: maintenance.service_type,
            type: "date",
            daysUntil,
            scheduledDate: maintenance.scheduled_date,
          });
        }
      }

      // KM alert (500 km or less)
      if (maintenance.scheduled_km && vehicle.km_current) {
        const kmUntil = maintenance.scheduled_km - vehicle.km_current;
        
        if (kmUntil <= 500 && kmUntil >= 0) {
          alerts.push({
            id: maintenance.id,
            vehicleNumber: vehicle.vehicle_number,
            licensePlate: vehicle.license_plate,
            serviceType: maintenance.service_type,
            type: "km",
            kmUntil,
            scheduledKm: maintenance.scheduled_km,
            currentKm: vehicle.km_current,
          });
        }
      }
    });

    setNotifications(alerts);
  }

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-card border-l border-border shadow-lg z-50 overflow-y-auto animate-slide-in-right">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Notificações</h2>
            <p className="text-sm text-muted-foreground">Manutenções próximas</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma notificação no momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-2"
              >
                <div className="flex items-start gap-3">
                  {notification.type === "date" ? (
                    <Calendar className="h-5 w-5 text-warning mt-0.5" />
                  ) : (
                    <Gauge className="h-5 w-5 text-warning mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {notification.vehicleNumber} - {notification.licensePlate}
                    </h3>
                    <p className="text-sm text-muted-foreground">{notification.serviceType}</p>
                    
                    {notification.type === "date" && (
                      <p className="text-sm text-warning mt-1">
                        {notification.daysUntil === 0 
                          ? "⚠️ Vence hoje!" 
                          : `⚠️ Vence em ${notification.daysUntil} dia${notification.daysUntil > 1 ? "s" : ""}`
                        }
                      </p>
                    )}
                    
                    {notification.type === "km" && (
                      <p className="text-sm text-warning mt-1">
                        ⚠️ Faltam {notification.kmUntil} km ({notification.currentKm} / {notification.scheduledKm} km)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}