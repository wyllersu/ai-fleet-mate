import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";
import { MaintenanceCard } from "@/components/MaintenanceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Maintenance {
  id: string;
  vehicle_id: string;
  service_type: string;
  service_date: string | null;
  km_at_service: number | null;
  cost: number | null;
  description: string | null;
  attachment_url: string | null;
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

export default function Maintenances() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchMaintenances();

    const channel = supabase
      .channel("maintenances-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenances" }, fetchMaintenances)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMaintenances() {
    const { data } = await supabase
      .from("maintenances")
      .select(`
        *,
        vehicles (
          vehicle_number,
          license_plate,
          brand,
          model
        )
      `)
      .order("created_at", { ascending: false });

    if (data) setMaintenances(data as any);
  }

  const completedMaintenances = maintenances.filter(m => m.status === "Concluído");
  const scheduledMaintenances = maintenances.filter(m => m.status === "Agendado");

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manutenções</h1>
          <p className="text-muted-foreground mt-1">Gerencie serviços e agendamentos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Manutenção
        </Button>
      </div>

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="completed">
            Concluídas ({completedMaintenances.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Agendadas ({scheduledMaintenances.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="mt-6">
          {completedMaintenances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma manutenção concluída registrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedMaintenances.map((maintenance) => (
                <MaintenanceCard key={maintenance.id} maintenance={maintenance} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          {scheduledMaintenances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma manutenção agendada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledMaintenances.map((maintenance) => (
                <MaintenanceCard key={maintenance.id} maintenance={maintenance} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MaintenanceDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchMaintenances}
      />
    </div>
  );
}