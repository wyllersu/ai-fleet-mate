import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MaintenanceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MaintenanceDialog({ open, onClose, onSuccess }: MaintenanceDialogProps) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    service_type: "",
    service_date: "",
    km_at_service: 0,
    cost: 0,
    description: "",
    attachment_url: "",
    scheduled_date: "",
    scheduled_km: 0,
  });

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  async function fetchVehicles() {
    const { data } = await supabase.from("vehicles").select("*");
    if (data) setVehicles(data);
  }

  async function handleSubmitCompleted(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const maintenanceData = {
        vehicle_id: formData.vehicle_id,
        service_type: formData.service_type,
        service_date: formData.service_date || null,
        km_at_service: formData.km_at_service || null,
        cost: formData.cost || null,
        description: formData.description || null,
        attachment_url: formData.attachment_url || null,
        status: "Concluído",
        is_scheduled: false,
      };

      const { error } = await supabase.from("maintenances").insert([maintenanceData]);
      if (error) throw error;

      // Update vehicle KM if service KM is greater
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle && formData.km_at_service > vehicle.km_current) {
        await supabase
          .from("vehicles")
          .update({ km_current: formData.km_at_service })
          .eq("id", formData.vehicle_id);
      }

      toast.success("Manutenção registrada com sucesso!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar manutenção");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitScheduled(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const maintenanceData = {
        vehicle_id: formData.vehicle_id,
        service_type: formData.service_type,
        scheduled_date: formData.scheduled_date || null,
        scheduled_km: formData.scheduled_km || null,
        description: formData.description || null,
        status: "Agendado",
        is_scheduled: true,
      };

      const { error } = await supabase.from("maintenances").insert([maintenanceData]);
      if (error) throw error;

      toast.success("Manutenção agendada com sucesso!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao agendar manutenção");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      vehicle_id: "",
      service_type: "",
      service_date: "",
      km_at_service: 0,
      cost: 0,
      description: "",
      attachment_url: "",
      scheduled_date: "",
      scheduled_km: 0,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Manutenção</DialogTitle>
          <DialogDescription>
            Registre um serviço concluído ou agende uma manutenção futura
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="completed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="completed">Concluído</TabsTrigger>
            <TabsTrigger value="scheduled">Agendar</TabsTrigger>
          </TabsList>

          <TabsContent value="completed">
            <form onSubmit={handleSubmitCompleted} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Veículo</Label>
                <Select
                  required
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number} - {vehicle.license_plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_type">Tipo de Serviço</Label>
                <Input
                  id="service_type"
                  required
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  placeholder="Ex: Troca de Óleo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_date">Data</Label>
                  <Input
                    id="service_date"
                    type="date"
                    value={formData.service_date}
                    onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="km_at_service">KM</Label>
                  <Input
                    id="km_at_service"
                    type="number"
                    value={formData.km_at_service || ""}
                    onChange={(e) => setFormData({ ...formData, km_at_service: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Custo (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost || ""}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do serviço..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment_url">Link do Anexo/Nota</Label>
                <Input
                  id="attachment_url"
                  type="url"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Registrando..." : "Registrar"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="scheduled">
            <form onSubmit={handleSubmitScheduled} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_scheduled">Veículo</Label>
                <Select
                  required
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number} - {vehicle.license_plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_type_scheduled">Tipo de Serviço</Label>
                <Input
                  id="service_type_scheduled"
                  required
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  placeholder="Ex: Revisão"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Data Prevista</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled_km">KM Prevista</Label>
                  <Input
                    id="scheduled_km"
                    type="number"
                    value={formData.scheduled_km || ""}
                    onChange={(e) => setFormData({ ...formData, scheduled_km: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_scheduled">Descrição</Label>
                <Textarea
                  id="description_scheduled"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Observações sobre o agendamento..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Agendando..." : "Agendar"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}