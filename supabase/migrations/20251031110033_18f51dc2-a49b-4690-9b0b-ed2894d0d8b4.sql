-- Drop the policy that still causes recursion
DROP POLICY IF EXISTS "Users can view profiles in their agency" ON public.profiles;

-- Create proper policies using security definer functions (no recursion)
CREATE POLICY "Users can view profiles in same agency"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  agency_id IS NOT NULL 
  AND agency_id = user_agency_id(auth.uid())
);

CREATE POLICY "Users can view profiles in same subaccount"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  sub_account_id IS NOT NULL 
  AND sub_account_id = user_subaccount_id(auth.uid())
);