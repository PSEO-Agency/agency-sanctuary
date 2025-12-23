-- Phase 1: Database Foundation

-- 1. Create user_roles table (multi-role support)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  context_id uuid, -- agency_id or subaccount_id depending on role
  context_type text CHECK (context_type IN ('agency', 'subaccount', 'platform')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role, context_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create agency_invites table
CREATE TABLE public.agency_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviting_user_id uuid REFERENCES auth.users(id) NOT NULL,
  email text,
  invite_type text NOT NULL CHECK (invite_type IN ('new_agency', 'subaccount', 'agency_subaccount')),
  token text UNIQUE NOT NULL,
  target_agency_id uuid REFERENCES agencies(id), -- for subaccount invites under specific agency
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on agency_invites
ALTER TABLE public.agency_invites ENABLE ROW LEVEL SECURITY;

-- 3. Create transfer_requests table
CREATE TABLE public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subaccount_id uuid REFERENCES subaccounts(id) NOT NULL,
  from_agency_id uuid REFERENCES agencies(id) NOT NULL,
  to_agency_id uuid REFERENCES agencies(id) NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on transfer_requests
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- 4. Add is_main column to agencies (cleaner than JSON settings)
ALTER TABLE public.agencies ADD COLUMN is_main boolean DEFAULT false;

-- Update existing PSEO agency to be the main agency
UPDATE public.agencies 
SET is_main = true 
WHERE settings->>'is_main' = 'true';

-- 5. Create helper function to check roles from user_roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create helper function to get user's agency id from user_roles
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT context_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'agency_admin'
    AND context_type = 'agency'
  LIMIT 1
$$;

-- 7. Create helper function to get user's subaccount id from user_roles
CREATE OR REPLACE FUNCTION public.get_user_subaccount_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT context_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'sub_account_user'
    AND context_type = 'subaccount'
  LIMIT 1
$$;

-- 8. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, context_id, context_type)
SELECT 
  id as user_id,
  role,
  CASE 
    WHEN role = 'super_admin' THEN NULL
    WHEN role = 'agency_admin' THEN agency_id
    WHEN role = 'sub_account_user' THEN sub_account_id
  END as context_id,
  CASE 
    WHEN role = 'super_admin' THEN 'platform'
    WHEN role = 'agency_admin' THEN 'agency'
    WHEN role = 'sub_account_user' THEN 'subaccount'
  END as context_type
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role, context_id) DO NOTHING;

-- Also add agency_admin role for super_admin's agency
INSERT INTO public.user_roles (user_id, role, context_id, context_type)
SELECT 
  id as user_id,
  'agency_admin'::app_role as role,
  agency_id as context_id,
  'agency' as context_type
FROM public.profiles
WHERE role = 'super_admin' AND agency_id IS NOT NULL
ON CONFLICT (user_id, role, context_id) DO NOTHING;

-- 9. RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view roles in their agency"
ON public.user_roles
FOR SELECT
USING (
  context_type = 'subaccount' AND
  EXISTS (
    SELECT 1 FROM subaccounts s
    WHERE s.id = user_roles.context_id
    AND s.agency_id = get_user_agency_id(auth.uid())
  )
);

-- 10. RLS Policies for agency_invites table
CREATE POLICY "Super admins can manage all invites"
ON public.agency_invites
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view their agency invites"
ON public.agency_invites
FOR SELECT
USING (
  target_agency_id = get_user_agency_id(auth.uid())
  OR inviting_user_id = auth.uid()
);

CREATE POLICY "Agency admins can create invites for their agency"
ON public.agency_invites
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agency_admin')
  AND target_agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Anyone can view invites by token for acceptance"
ON public.agency_invites
FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- 11. RLS Policies for transfer_requests table
CREATE POLICY "Super admins can manage all transfers"
ON public.transfer_requests
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view transfers involving their agency"
ON public.transfer_requests
FOR SELECT
USING (
  from_agency_id = get_user_agency_id(auth.uid())
  OR to_agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Agency admins can create transfer requests from their agency"
ON public.transfer_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agency_admin')
  AND from_agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Receiving agency admins can update transfer status"
ON public.transfer_requests
FOR UPDATE
USING (
  to_agency_id = get_user_agency_id(auth.uid())
  AND status = 'pending'
);