import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const vehicleSchema = z.object({
  vehicle_number: z.string().trim().min(1, "Número do veículo é obrigatório"),
  license_plate: z.string().trim().min(1, "Placa é obrigatória"),
  brand: z.string().trim().min(1, "Marca é obrigatória"),
  model: z.string().trim().min(1, "Modelo é obrigatório"),
  year: z.number().int().min(1900, "Ano inválido").max(new Date().getFullYear(), "Ano não pode ser no futuro"),
  km_current: z.number().int().min(0, "Quilometragem não pode ser negativa"),
  status: z.string(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VehicleDialog({ open, onClose, onSuccess }: VehicleDialogProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    vehicle_number: "",
    license_plate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    km_current: 0,
    status: "Ativo",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = vehicleSchema.parse(formData);

      // Check if vehicle_number already exists
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("vehicle_number", validatedData.vehicle_number)
        .single();

      if (existingVehicle) {
        toast.error("Número de veículo já existe!");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("vehicles").insert([{
        vehicle_number: validatedData.vehicle_number,
        license_plate: validatedData.license_plate,
        brand: validatedData.brand,
        model: validatedData.model,
        year: validatedData.year,
        km_current: validatedData.km_current,
        status: validatedData.status,
      }]);

      if (error) throw error;

      toast.success("Veículo cadastrado com sucesso!");
      onSuccess();
      onClose();
      setFormData({
        vehicle_number: "",
        license_plate: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        km_current: 0,
        status: "Ativo",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof VehicleFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof VehicleFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error(error.message || "Erro ao cadastrar veículo");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Veículo</DialogTitle>
          <DialogDescription>
            Preencha os dados do veículo para adicioná-lo à frota
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle_number">Número do Veículo (ID)</Label>
            <Input
              id="vehicle_number"
              required
              value={formData.vehicle_number}
              onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
              placeholder="Ex: V001"
            />
            {errors.vehicle_number && <p className="text-sm text-destructive">{errors.vehicle_number}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="license_plate">Placa</Label>
            <Input
              id="license_plate"
              required
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
              placeholder="Ex: ABC-1234"
            />
            {errors.license_plate && <p className="text-sm text-destructive">{errors.license_plate}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ex: Fiat"
              />
              {errors.brand && <p className="text-sm text-destructive">{errors.brand}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: Uno"
              />
              {errors.model && <p className="text-sm text-destructive">{errors.model}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
              {errors.year && <p className="text-sm text-destructive">{errors.year}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_current">KM Inicial</Label>
              <Input
                id="km_current"
                type="number"
                required
                value={formData.km_current}
                onChange={(e) => setFormData({ ...formData, km_current: parseInt(e.target.value) })}
              />
              {errors.km_current && <p className="text-sm text-destructive">{errors.km_current}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}