-- Drop the existing check constraint and add a new one that includes 'partner'
ALTER TABLE public.agency_invites DROP CONSTRAINT IF EXISTS agency_invites_invite_type_check;

ALTER TABLE public.agency_invites ADD CONSTRAINT agency_invites_invite_type_check 
  CHECK (invite_type IN ('agency', 'new_agency', 'subaccount', 'agency_subaccount', 'partner'));