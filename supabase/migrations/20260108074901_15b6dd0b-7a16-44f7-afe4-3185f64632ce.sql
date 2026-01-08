-- Drop the insecure policy that allows anyone to view invites by token
DROP POLICY IF EXISTS "Anyone can view invites by token for acceptance" ON public.agency_invites;

-- Create a more restrictive policy that only allows authenticated users to view invites
-- where the invite email matches their authenticated email
CREATE POLICY "Users can view pending invites matching their email" 
ON public.agency_invites 
FOR SELECT 
USING (
  status = 'pending' 
  AND expires_at > now() 
  AND (
    -- Allow if authenticated user's email matches the invite email
    (auth.jwt() ->> 'email') = email
    -- OR allow agency admins/super admins to view (handled by other policies)
  )
);