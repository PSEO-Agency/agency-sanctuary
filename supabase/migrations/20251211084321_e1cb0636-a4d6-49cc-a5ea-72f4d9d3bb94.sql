-- Allow authenticated users to create agencies where they are the owner
CREATE POLICY "Users can create their own agency"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());