-- 2. Create country_partners table
CREATE TABLE public.country_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  owner_user_id uuid,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Add country_partner_id to agencies
ALTER TABLE public.agencies 
ADD COLUMN country_partner_id uuid REFERENCES public.country_partners(id);

-- 4. Add country_partner_id to agency_invites for tracking
ALTER TABLE public.agency_invites 
ADD COLUMN country_partner_id uuid REFERENCES public.country_partners(id);

-- 5. Create helper function to get user's country partner ID
CREATE OR REPLACE FUNCTION public.get_user_country_partner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT context_id FROM user_roles 
  WHERE user_id = _user_id 
    AND role = 'country_partner' 
    AND context_type = 'country_partner'
  LIMIT 1
$$;

-- 6. Enable RLS on country_partners table
ALTER TABLE public.country_partners ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for country_partners table
CREATE POLICY "Super admins can manage all partners"
  ON public.country_partners FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partners can view their own record"
  ON public.country_partners FOR SELECT
  USING (id = get_user_country_partner_id(auth.uid()));

CREATE POLICY "Partners can update their own record"
  ON public.country_partners FOR UPDATE
  USING (id = get_user_country_partner_id(auth.uid()));

-- 8. Add RLS policies for agencies to include country partners
CREATE POLICY "Country partners can view their agencies"
  ON public.agencies FOR SELECT
  USING (country_partner_id = get_user_country_partner_id(auth.uid()));

CREATE POLICY "Country partners can update their agencies"
  ON public.agencies FOR UPDATE
  USING (country_partner_id = get_user_country_partner_id(auth.uid()));

-- 9. Add RLS policies for subaccounts to include country partners
CREATE POLICY "Country partners can view their agencies subaccounts"
  ON public.subaccounts FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies 
      WHERE country_partner_id = get_user_country_partner_id(auth.uid())
    )
  );

CREATE POLICY "Country partners can manage their agencies subaccounts"
  ON public.subaccounts FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM agencies 
      WHERE country_partner_id = get_user_country_partner_id(auth.uid())
    )
  );

-- 10. Add RLS policies for profiles to include country partners viewing agency users
CREATE POLICY "Country partners can view profiles in their agencies"
  ON public.profiles FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies 
      WHERE country_partner_id = get_user_country_partner_id(auth.uid())
    )
  );

-- 11. Add RLS policies for agency_invites to include country partners
CREATE POLICY "Country partners can create invites for their agencies"
  ON public.agency_invites FOR INSERT
  WITH CHECK (
    (target_agency_id IN (
      SELECT id FROM agencies 
      WHERE country_partner_id = get_user_country_partner_id(auth.uid())
    ))
    OR 
    (country_partner_id = get_user_country_partner_id(auth.uid()))
  );

CREATE POLICY "Country partners can view their invites"
  ON public.agency_invites FOR SELECT
  USING (
    country_partner_id = get_user_country_partner_id(auth.uid())
    OR
    target_agency_id IN (
      SELECT id FROM agencies 
      WHERE country_partner_id = get_user_country_partner_id(auth.uid())
    )
  );

-- 12. Add updated_at trigger for country_partners
CREATE TRIGGER update_country_partners_updated_at
  BEFORE UPDATE ON public.country_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();