-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view profiles in their subaccount" ON public.profiles;

-- Allow users to view their own profile (no recursion)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to view other profiles in their agency (avoiding recursion by using a simpler check)
CREATE POLICY "Users can view profiles in their agency"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  agency_id IS NOT NULL 
  AND agency_id IN (
    SELECT agency_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND agency_id IS NOT NULL
  )
);