-- Create a sequence for 8-digit location IDs starting from 10000000
CREATE SEQUENCE IF NOT EXISTS location_id_seq
  START WITH 10000000
  INCREMENT BY 1
  MINVALUE 10000000
  MAXVALUE 99999999
  CYCLE;

-- Update the location_id column to use the sequence
ALTER TABLE public.subaccounts 
  ALTER COLUMN location_id SET DEFAULT nextval('location_id_seq')::text;

-- Add a comment to document the auto-generation
COMMENT ON COLUMN public.subaccounts.location_id IS 'Auto-generated unique 8-digit integer';
