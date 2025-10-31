-- Drop old user_roles table and functions
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency admins can view roles in their agency" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_agency(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_subaccount(uuid) CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create simplified role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'agency_admin', 'sub_account_user');

-- Add role and references to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN role public.app_role DEFAULT 'sub_account_user',
  ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN sub_account_id UUID REFERENCES public.subaccounts(id) ON DELETE CASCADE;

-- Add owner to agencies
ALTER TABLE public.agencies
  ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create security definer function to check role
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Create function to get user's agency
CREATE OR REPLACE FUNCTION public.user_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.profiles WHERE id = _user_id
$$;

-- Create function to get user's subaccount
CREATE OR REPLACE FUNCTION public.user_subaccount_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sub_account_id FROM public.profiles WHERE id = _user_id
$$;

-- Update RLS policies for agencies
DROP POLICY IF EXISTS "Agency admins can view their agency" ON public.agencies;
DROP POLICY IF EXISTS "Super admins can manage agencies" ON public.agencies;
DROP POLICY IF EXISTS "Super admins can view all agencies" ON public.agencies;

CREATE POLICY "Super admins can view all agencies"
  ON public.agencies FOR SELECT
  USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view their agency"
  ON public.agencies FOR SELECT
  USING (id = public.user_agency_id(auth.uid()));

CREATE POLICY "Super admins can manage agencies"
  ON public.agencies FOR ALL
  USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can update their agency"
  ON public.agencies FOR UPDATE
  USING (id = public.user_agency_id(auth.uid()));

-- Update RLS policies for subaccounts
DROP POLICY IF EXISTS "Super admins can view all subaccounts" ON public.subaccounts;
DROP POLICY IF EXISTS "Agency admins can view their subaccounts" ON public.subaccounts;
DROP POLICY IF EXISTS "Subaccount users can view their subaccount" ON public.subaccounts;
DROP POLICY IF EXISTS "Super admins can manage all subaccounts" ON public.subaccounts;
DROP POLICY IF EXISTS "Agency admins can manage their subaccounts" ON public.subaccounts;

CREATE POLICY "Super admins can view all subaccounts"
  ON public.subaccounts FOR SELECT
  USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view their subaccounts"
  ON public.subaccounts FOR SELECT
  USING (agency_id = public.user_agency_id(auth.uid()));

CREATE POLICY "Subaccount users can view their subaccount"
  ON public.subaccounts FOR SELECT
  USING (id = public.user_subaccount_id(auth.uid()));

CREATE POLICY "Super admins can manage all subaccounts"
  ON public.subaccounts FOR ALL
  USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can manage their subaccounts"
  ON public.subaccounts FOR ALL
  USING (agency_id = public.user_agency_id(auth.uid()));

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view their agency users"
  ON public.profiles FOR SELECT
  USING (agency_id = public.user_agency_id(auth.uid()));

-- Update existing super admin user
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE id = '72e9ecca-259d-4894-9764-8ff683736f02';