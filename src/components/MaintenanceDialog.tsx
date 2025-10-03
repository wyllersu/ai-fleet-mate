import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

const completedMaintenanceSchema = z.object({
  vehicle_id: z.string().uuid("Selecione um veículo válido"),
  service_type: z.string().trim().min(1, "Tipo de serviço é obrigatório"),
  service_date: z.string().optional(),
  km_at_service: z.number().int().min(0, "Quilometragem não pode ser negativa").optional(),
  cost: z.number().min(0, "Custo não pode ser negativo").optional(),
  description: z.string().optional(),
  attachment_url: z.string().url("URL inválida").or(z.literal("")).optional(),
}).refine((data) => {
  if (data.service_date) {
    const serviceDate = new Date(data.service_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return serviceDate <= today;
  }
  return true;
}, {
  message: "Data não pode ser no futuro",
  path: ["service_date"],
});

const scheduledMaintenanceSchema = z.object({
  vehicle_id: z.string().uuid("Selecione um veículo válido"),
  service_type: z.string().trim().min(1, "Tipo de serviço é obrigatório"),
  scheduled_date: z.string().optional(),
  scheduled_km: z.number().int().min(0, "Quilometragem não pode ser negativa").optional(),
  description: z.string().optional(),
}).refine((data) => {
  return data.scheduled_date || data.scheduled_km;
}, {
  message: "Defina pelo menos uma data ou quilometragem prevista",
  path: ["scheduled_date"],
});

interface MaintenanceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MaintenanceDialog({ open, onClose, onSuccess }: MaintenanceDialogProps) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showKmWarning, setShowKmWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});

    try {
      // Validate form data
      const validatedData = completedMaintenanceSchema.parse({
        vehicle_id: formData.vehicle_id,
        service_type: formData.service_type,
        service_date: formData.service_date || undefined,
        km_at_service: formData.km_at_service || undefined,
        cost: formData.cost || undefined,
        description: formData.description || undefined,
        attachment_url: formData.attachment_url || undefined,
      });

      // Check if KM is less than current KM
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle && formData.km_at_service > 0 && formData.km_at_service < vehicle.km_current) {
        setShowKmWarning(true);
        setPendingSubmit(true);
        return;
      }

      await performMaintenanceSubmit();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error(error.message || "Erro ao registrar manutenção");
      }
    }
  }

  async function performMaintenanceSubmit() {
    setLoading(true);

    try {
      // Use RPC function for atomic transaction
      const { data, error } = await supabase.rpc('register_maintenance_and_update_km', {
        p_vehicle_id: formData.vehicle_id,
        p_service_type: formData.service_type,
        p_service_date: formData.service_date || null,
        p_km_at_service: formData.km_at_service || null,
        p_cost: formData.cost || null,
        p_description: formData.description || null,
        p_attachment_url: formData.attachment_url || null,
      });

      if (error) throw error;

      toast.success("Manutenção registrada com sucesso!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar manutenção");
    } finally {
      setLoading(false);
      setPendingSubmit(false);
    }
  }

  async function handleSubmitScheduled(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = scheduledMaintenanceSchema.parse({
        vehicle_id: formData.vehicle_id,
        service_type: formData.service_type,
        scheduled_date: formData.scheduled_date || undefined,
        scheduled_km: formData.scheduled_km || undefined,
        description: formData.description || undefined,
      });

      const maintenanceData = {
        vehicle_id: validatedData.vehicle_id,
        service_type: validatedData.service_type,
        scheduled_date: validatedData.scheduled_date || null,
        scheduled_km: validatedData.scheduled_km || null,
        description: validatedData.description || null,
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
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error(error.message || "Erro ao agendar manutenção");
      }
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
    setErrors({});
  }

  return (
    <>
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
                  {errors.vehicle_id && <p className="text-sm text-destructive">{errors.vehicle_id}</p>}
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
                  {errors.service_type && <p className="text-sm text-destructive">{errors.service_type}</p>}
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
                    {errors.service_date && <p className="text-sm text-destructive">{errors.service_date}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="km_at_service">KM</Label>
                    <Input
                      id="km_at_service"
                      type="number"
                      value={formData.km_at_service || ""}
                      onChange={(e) => setFormData({ ...formData, km_at_service: parseInt(e.target.value) || 0 })}
                    />
                    {errors.km_at_service && <p className="text-sm text-destructive">{errors.km_at_service}</p>}
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
                  {errors.cost && <p className="text-sm text-destructive">{errors.cost}</p>}
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
                  {errors.attachment_url && <p className="text-sm text-destructive">{errors.attachment_url}</p>}
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
                  {errors.vehicle_id && <p className="text-sm text-destructive">{errors.vehicle_id}</p>}
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
                  {errors.service_type && <p className="text-sm text-destructive">{errors.service_type}</p>}
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
                    {errors.scheduled_date && <p className="text-sm text-destructive">{errors.scheduled_date}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled_km">KM Prevista</Label>
                    <Input
                      id="scheduled_km"
                      type="number"
                      value={formData.scheduled_km || ""}
                      onChange={(e) => setFormData({ ...formData, scheduled_km: parseInt(e.target.value) || 0 })}
                    />
                    {errors.scheduled_km && <p className="text-sm text-destructive">{errors.scheduled_km}</p>}
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

      <AlertDialog open={showKmWarning} onOpenChange={setShowKmWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção: Quilometragem Retroativa</AlertDialogTitle>
            <AlertDialogDescription>
              A quilometragem inserida ({formData.km_at_service.toLocaleString("pt-BR")} km) é menor que a quilometragem atual do veículo. 
              Isso irá retroceder a quilometragem registrada. Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmit(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performMaintenanceSubmit}>
              Sim, Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
