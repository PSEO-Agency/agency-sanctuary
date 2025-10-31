-- Allow users to view profiles in their subaccount
CREATE POLICY "Users can view profiles in their subaccount"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  sub_account_id IS NOT NULL 
  AND sub_account_id = (
    SELECT sub_account_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);