-- Add policy for agency admins to create projects in their agency's subaccounts
CREATE POLICY "Agency admins can create projects in their subaccounts" 
ON public.blog_projects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subaccounts
    WHERE subaccounts.id = subaccount_id
    AND subaccounts.agency_id = user_agency_id(auth.uid())
  )
);