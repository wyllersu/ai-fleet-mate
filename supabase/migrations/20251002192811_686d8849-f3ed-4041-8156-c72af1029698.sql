-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number text UNIQUE NOT NULL,
  license_plate text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  km_current integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Em Manutenção', 'Inativo')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow everyone to read vehicles (public data for fleet management)
CREATE POLICY "Allow public read access to vehicles"
  ON public.vehicles
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Allow authenticated users to insert vehicles
CREATE POLICY "Allow authenticated users to insert vehicles"
  ON public.vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update vehicles
CREATE POLICY "Allow authenticated users to update vehicles"
  ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create maintenances table
CREATE TABLE IF NOT EXISTS public.maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_date date,
  km_at_service integer,
  cost numeric(10, 2),
  description text,
  attachment_url text,
  is_scheduled boolean NOT NULL DEFAULT false,
  scheduled_date date,
  scheduled_km integer,
  status text NOT NULL DEFAULT 'Concluído' CHECK (status IN ('Agendado', 'Concluído')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow everyone to read maintenances
CREATE POLICY "Allow public read access to maintenances"
  ON public.maintenances
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Allow authenticated users to insert maintenances
CREATE POLICY "Allow authenticated users to insert maintenances"
  ON public.maintenances
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update maintenances
CREATE POLICY "Allow authenticated users to update maintenances"
  ON public.maintenances
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vehicles
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_number ON public.vehicles(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_maintenances_vehicle_id ON public.maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON public.maintenances(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_service_date ON public.maintenances(service_date);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenances;