-- Mark the PSEO agency as the main agency for all new signups
UPDATE public.agencies 
SET settings = COALESCE(settings, '{}'::jsonb) || '{"is_main": true}'::jsonb 
WHERE id = 'fa8f2358-aaa8-48b3-8136-90046d9e1cb3';

-- Create a security definer function to create subaccount for new users
CREATE OR REPLACE FUNCTION public.create_user_subaccount(
  _user_id uuid,
  _business_name text,
  _business_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _main_agency_id uuid;
  _subaccount_id uuid;
BEGIN
  -- Find the main agency
  SELECT id INTO _main_agency_id 
  FROM public.agencies 
  WHERE settings->>'is_main' = 'true'
  LIMIT 1;
  
  IF _main_agency_id IS NULL THEN
    RAISE EXCEPTION 'Main agency not found';
  END IF;
  
  -- Create the subaccount
  INSERT INTO public.subaccounts (agency_id, name, business_settings)
  VALUES (_main_agency_id, _business_name, _business_settings)
  RETURNING id INTO _subaccount_id;
  
  -- Update the user's profile
  UPDATE public.profiles
  SET 
    sub_account_id = _subaccount_id,
    agency_id = _main_agency_id,
    role = 'sub_account_user',
    onboarding_completed = true
  WHERE id = _user_id;
  
  RETURN _subaccount_id;
END;
$$;