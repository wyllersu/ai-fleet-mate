import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VehicleDialog({ open, onClose, onSuccess }: VehicleDialogProps) {
  const [formData, setFormData] = useState({
    vehicle_number: "",
    license_plate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    km_current: 0,
    status: "Ativo",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if vehicle_number already exists
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("vehicle_number", formData.vehicle_number)
        .single();

      if (existingVehicle) {
        toast.error("Número de veículo já existe!");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("vehicles").insert([formData]);

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
      toast.error(error.message || "Erro ao cadastrar veículo");
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