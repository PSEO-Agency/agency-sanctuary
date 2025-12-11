-- Create a security definer function to create agency (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_user_agency(
  _user_id uuid,
  _agency_name text,
  _agency_slug text,
  _settings jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id uuid;
BEGIN
  -- Create the agency
  INSERT INTO public.agencies (name, slug, owner_user_id, settings)
  VALUES (_agency_name, _agency_slug, _user_id, _settings)
  RETURNING id INTO _agency_id;
  
  -- Update the user's profile with agency_id and role
  UPDATE public.profiles
  SET agency_id = _agency_id, role = 'agency_admin'
  WHERE id = _user_id;
  
  RETURN _agency_id;
END;
$$;