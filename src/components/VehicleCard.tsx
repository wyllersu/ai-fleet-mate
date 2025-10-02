import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Gauge } from "lucide-react";

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

export function VehicleCard({ vehicle, onClick }: { vehicle: Vehicle; onClick: () => void }) {
  const statusColors = {
    "Ativo": "bg-success text-success-foreground",
    "Em Manutenção": "bg-warning text-warning-foreground",
    "Inativo": "bg-destructive text-destructive-foreground",
  };

  return (
    <Card
      className="shadow-card hover:shadow-hover transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {vehicle.vehicle_number}
              </h3>
              <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
            </div>
          </div>
          <Badge className={statusColors[vehicle.status as keyof typeof statusColors]}>
            {vehicle.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-foreground">
            <span className="font-medium">{vehicle.brand}</span> {vehicle.model}
          </p>
          <p className="text-sm text-muted-foreground">Ano: {vehicle.year}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
            <Gauge className="h-4 w-4" />
            <span>{vehicle.km_current.toLocaleString("pt-BR")} km</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}