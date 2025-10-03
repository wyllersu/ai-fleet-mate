-- Create function to register maintenance and update vehicle KM atomically
CREATE OR REPLACE FUNCTION public.register_maintenance_and_update_km(
  p_vehicle_id UUID,
  p_service_type TEXT,
  p_service_date DATE,
  p_km_at_service INTEGER,
  p_cost NUMERIC,
  p_description TEXT,
  p_attachment_url TEXT
) RETURNS UUID AS $$
DECLARE
  v_maintenance_id UUID;
  v_current_km INTEGER;
BEGIN
  -- Get current KM of the vehicle
  SELECT km_current INTO v_current_km
  FROM vehicles
  WHERE id = p_vehicle_id;

  -- Insert maintenance record
  INSERT INTO maintenances (
    vehicle_id,
    service_type,
    service_date,
    km_at_service,
    cost,
    description,
    attachment_url,
    status,
    is_scheduled
  ) VALUES (
    p_vehicle_id,
    p_service_type,
    p_service_date,
    p_km_at_service,
    p_cost,
    p_description,
    p_attachment_url,
    'Concluído',
    false
  ) RETURNING id INTO v_maintenance_id;

  -- Update vehicle KM if service KM is greater
  IF p_km_at_service IS NOT NULL AND p_km_at_service > v_current_km THEN
    UPDATE vehicles
    SET km_current = p_km_at_service
    WHERE id = p_vehicle_id;
  END IF;

  RETURN v_maintenance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;