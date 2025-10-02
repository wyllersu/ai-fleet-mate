import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, DollarSign, FileText, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vehicle {
  id: string;
  vehicle_number: string;
  license_plate: string;
  brand: string;
  model: string;
  year: number;
  km_current: number;
  status: string;
}

interface Maintenance {
  id: string;
  service_type: string;
  service_date: string | null;
  km_at_service: number | null;
  cost: number | null;
  description: string | null;
  attachment_url: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_km: number | null;
}

export function VehicleDetailDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);

  useEffect(() => {
    if (vehicle) {
      fetchMaintenances();
    }
  }, [vehicle]);

  async function fetchMaintenances() {
    const { data } = await supabase
      .from("maintenances")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false });

    if (data) setMaintenances(data);
  }

  return (
    <Dialog open={!!vehicle} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalhes do Veículo</DialogTitle>
        </DialogHeader>

        {/* Vehicle Info */}
        <div className="space-y-4 pb-4 border-b border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Número do Veículo</p>
              <p className="text-lg font-semibold text-foreground">{vehicle.vehicle_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Placa</p>
              <p className="text-lg font-semibold text-foreground">{vehicle.license_plate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Marca/Modelo</p>
              <p className="text-lg font-semibold text-foreground">{vehicle.brand} {vehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ano</p>
              <p className="text-lg font-semibold text-foreground">{vehicle.year}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Quilometragem Atual</p>
              <p className="text-lg font-semibold text-foreground">{vehicle.km_current.toLocaleString("pt-BR")} km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="mt-1">
                {vehicle.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Maintenance History */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Histórico de Manutenções
          </h3>

          {maintenances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma manutenção registrada para este veículo
            </p>
          ) : (
            <div className="space-y-3">
              {maintenances.map((maintenance) => (
                <Card key={maintenance.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{maintenance.service_type}</h4>
                        <Badge variant={maintenance.status === "Concluído" ? "default" : "secondary"} className="mt-1">
                          {maintenance.status}
                        </Badge>
                      </div>
                      {maintenance.cost && (
                        <div className="flex items-center gap-2 text-success font-semibold">
                          <DollarSign className="h-4 w-4" />
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(maintenance.cost)}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {maintenance.service_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(maintenance.service_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                      {maintenance.km_at_service && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">KM:</span> {maintenance.km_at_service.toLocaleString("pt-BR")}
                        </div>
                      )}
                    </div>

                    {maintenance.description && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 mt-0.5" />
                          <p>{maintenance.description}</p>
                        </div>
                      </div>
                    )}

                    {maintenance.attachment_url && (
                      <div className="mt-3">
                        <a
                          href={maintenance.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          📎 Ver anexo
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}