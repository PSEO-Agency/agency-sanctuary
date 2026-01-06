-- Update create_user_subaccount function to also insert into user_roles
CREATE OR REPLACE FUNCTION public.create_user_subaccount(_user_id uuid, _business_name text, _business_settings jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Insert into user_roles table for proper role tracking
  INSERT INTO public.user_roles (user_id, role, context_type, context_id)
  VALUES (_user_id, 'sub_account_user', 'subaccount', _subaccount_id)
  ON CONFLICT DO NOTHING;
  
  RETURN _subaccount_id;
END;
$$;

-- Backfill missing user_roles for existing users with sub_account_id but no role entry
INSERT INTO public.user_roles (user_id, role, context_type, context_id)
SELECT 
  p.id as user_id,
  'sub_account_user'::app_role as role,
  'subaccount' as context_type,
  p.sub_account_id as context_id
FROM public.profiles p
WHERE p.sub_account_id IS NOT NULL
  AND p.role = 'sub_account_user'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id 
      AND ur.role = 'sub_account_user'
      AND ur.context_id = p.sub_account_id
  );