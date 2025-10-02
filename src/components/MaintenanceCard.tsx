import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Gauge, Car } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Maintenance {
  service_type: string;
  service_date: string | null;
  km_at_service: number | null;
  cost: number | null;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_km: number | null;
  vehicles: {
    vehicle_number: string;
    license_plate: string;
    brand: string;
    model: string;
  };
}

export function MaintenanceCard({ maintenance }: { maintenance: Maintenance }) {
  const isScheduled = maintenance.status === "Agendado";

  return (
    <Card className="shadow-card hover:shadow-hover transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">{maintenance.service_type}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Car className="h-4 w-4" />
              <span>{maintenance.vehicles.vehicle_number} - {maintenance.vehicles.license_plate}</span>
            </div>
          </div>
          <Badge variant={isScheduled ? "secondary" : "default"}>
            {maintenance.status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          {!isScheduled ? (
            <>
              {maintenance.service_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(maintenance.service_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {maintenance.km_at_service && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span>{maintenance.km_at_service.toLocaleString("pt-BR")} km</span>
                </div>
              )}
              {maintenance.cost && (
                <div className="flex items-center gap-2 text-success font-semibold pt-2 border-t border-border">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(maintenance.cost)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {maintenance.scheduled_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Previsto: {format(new Date(maintenance.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              {maintenance.scheduled_km && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span>Previsto: {maintenance.scheduled_km.toLocaleString("pt-BR")} km</span>
                </div>
              )}
            </>
          )}

          {maintenance.description && (
            <p className="text-muted-foreground pt-2 border-t border-border">
              {maintenance.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}