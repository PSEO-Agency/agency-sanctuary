
# Country Partner Level Implementation

## Overview

Add a new "Country Partner" role between Super Admin and Agency Admin. Country Partners will have access to the Super Admin interface but filtered to only show agencies and subaccounts assigned to them. They can invite new agencies (which are automatically assigned to them) and Super Admins can also manually assign existing agencies.

## Hierarchy Structure

```text
┌─────────────────┐
│   Super Admin   │  Full platform access
└────────┬────────┘
         │
┌────────▼────────┐
│ Country Partner │  Filtered access to assigned agencies
└────────┬────────┘
         │
┌────────▼────────┐
│  Agency Admin   │  Access to own agency
└────────┬────────┘
         │
┌────────▼────────┐
│ Subaccount User │  Access to own subaccount
└─────────────────┘
```

## Implementation Phases

### Phase 1: Database Schema Changes

**1.1 Add new role to app_role enum**
- Add `country_partner` to the existing `app_role` enum

**1.2 Create country_partners table**
Store country partner metadata (name, region/country, settings):

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Partner name (e.g., "Netherlands Partner") |
| country | text | Country or region code |
| owner_user_id | uuid | User who owns this partner account |
| settings | jsonb | Additional configuration |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**1.3 Add country_partner_id to agencies table**
- Add nullable `country_partner_id` column to `agencies` table
- This links agencies to their assigned country partner
- Allows both invited and manually assigned agencies

**1.4 Create helper functions**
- `get_user_country_partner_id(_user_id uuid)` - Get partner ID for a user
- `has_country_partner_role(_user_id uuid)` - Check if user is a country partner
- `user_can_access_agency(_user_id uuid, _agency_id uuid)` - Check agency access

**1.5 Update RLS policies**
- Update agencies table: Country partners can see/manage agencies where `country_partner_id` matches their partner
- Update subaccounts table: Country partners can see/manage subaccounts belonging to their agencies
- Update related tables (profiles, invites, etc.) with country partner access

### Phase 2: Authentication & Role Updates

**2.1 Update AuthContext.tsx**
- Add `country_partner` to the `AppRole` type
- Update navigation logic in `impersonateUser` to handle country partners
- Add routing for country partners to `/super-admin` (since they use the same interface)

**2.2 Update ProtectedRoute.tsx**
- Add handling for `country_partner` role
- Redirect country partners to `/super-admin` dashboard
- Allow country partners to access Super Admin routes

### Phase 3: Frontend - Super Admin Interface Updates

**3.1 Update SuperAdminSidebar.tsx**
- Add "Country Partners" menu item (only visible to super admins)
- Conditionally show/hide items based on role

**3.2 Create CountryPartnersPage**
New page at `/super-admin/partners` for Super Admins to:
- View all country partners
- Create new country partners
- Assign agencies to partners
- Generate invite links for new partners

**3.3 Update Agencies page (src/pages/super-admin/Agencies.tsx)**
- Filter agencies based on user role:
  - Super Admin: See all agencies
  - Country Partner: See only assigned agencies
- Add "Assign to Partner" dropdown for Super Admins
- Show partner column in agencies table
- Update invite generation to include partner assignment

**3.4 Update Subaccounts page (src/pages/super-admin/Subaccounts.tsx)**
- Filter subaccounts based on accessible agencies
- Show which partner owns each subaccount's agency

**3.5 Update SuperAdminLayout.tsx**
- Display "Country Partner" in header when logged in as partner
- Adjust branding/messaging for partners

### Phase 4: Edge Functions

**4.1 Create create-country-partner-invite edge function**
- Super Admin can generate invite links for new country partners
- Token-based invitation system (similar to agency invites)
- Creates partner record + user role on acceptance

**4.2 Update create-agency-invite edge function**
- Accept optional `country_partner_id` parameter
- When country partner generates invite, auto-assign their ID
- Store partner ID in invite record for agency creation

**4.3 Update accept-agency-invite edge function**
- Set `country_partner_id` on the new agency
- Ensure proper role assignment

**4.4 Create assign-agency-to-partner edge function**
- Super Admin can manually assign/reassign agencies
- Updates agency's `country_partner_id`
- Validates permissions

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/super-admin/Partners.tsx` | Country Partners management page |
| `src/components/CountryPartnerSelector.tsx` | Dropdown to select/assign partner |
| `supabase/functions/create-partner-invite/index.ts` | Generate partner invites |
| `supabase/functions/assign-agency-to-partner/index.ts` | Manual agency assignment |
| `src/pages/auth/PartnerInvite.tsx` | Partner invitation acceptance page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Add `country_partner` role handling |
| `src/components/ProtectedRoute.tsx` | Add country partner routing |
| `src/components/SuperAdminSidebar.tsx` | Add Partners menu, conditional items |
| `src/components/layout/SuperAdminLayout.tsx` | Partner-aware header |
| `src/pages/SuperAdmin.tsx` | Add Partners route |
| `src/pages/super-admin/Agencies.tsx` | Filter by partner, add assignment UI |
| `src/pages/super-admin/Subaccounts.tsx` | Filter by partner's agencies |
| `src/App.tsx` | Add partner invite route |
| `supabase/functions/create-agency-invite/index.ts` | Support partner context |
| `supabase/functions/accept-agency-invite/index.ts` | Set partner on agency |

## Technical Details

### Database Migration SQL

```sql
-- 1. Add country_partner to app_role enum
ALTER TYPE app_role ADD VALUE 'country_partner';

-- 2. Create country_partners table
CREATE TABLE public.country_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  owner_user_id uuid REFERENCES auth.users(id),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Add country_partner_id to agencies
ALTER TABLE public.agencies 
ADD COLUMN country_partner_id uuid REFERENCES country_partners(id);

-- 4. Add country_partner_id to agency_invites for tracking
ALTER TABLE public.agency_invites 
ADD COLUMN country_partner_id uuid REFERENCES country_partners(id);

-- 5. Create helper function
CREATE OR REPLACE FUNCTION get_user_country_partner_id(_user_id uuid)
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

-- 6. RLS policies for country_partners table
ALTER TABLE public.country_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all partners"
  ON country_partners FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partners can view their own record"
  ON country_partners FOR SELECT
  USING (id = get_user_country_partner_id(auth.uid()));

-- 7. Update agencies RLS to include country partners
CREATE POLICY "Country partners can manage their agencies"
  ON agencies FOR ALL
  USING (country_partner_id = get_user_country_partner_id(auth.uid()));

CREATE POLICY "Country partners can view their agencies"
  ON agencies FOR SELECT
  USING (country_partner_id = get_user_country_partner_id(auth.uid()));

-- 8. Update subaccounts RLS
CREATE POLICY "Country partners can view agencies subaccounts"
  ON subaccounts FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies 
      WHERE country_partner_id = get_user_country_partner_id(auth.uid())
    )
  );
```

### Role Context in user_roles

For country partners, the `user_roles` entry will be:
- `role`: `country_partner`
- `context_type`: `country_partner`
- `context_id`: UUID of the `country_partners` record

## Security Considerations

1. **RLS Enforcement**: All data access is enforced at database level
2. **Role Verification**: Edge functions verify partner role before actions
3. **Scoped Access**: Partners can only see/manage their assigned agencies
4. **Invite Security**: Partner invites use same secure token system as agencies
5. **Super Admin Override**: Super admins maintain full access across all partners

## Testing Checklist

- [ ] Super Admin can create country partners
- [ ] Super Admin can generate partner invite links
- [ ] New users can accept partner invites and get correct role
- [ ] Country partners see only assigned agencies
- [ ] Country partners can generate agency invites (auto-assigned)
- [ ] Super Admin can manually assign agencies to partners
- [ ] Country partners can impersonate agency admins
- [ ] Country partners can view subaccounts of their agencies
- [ ] RLS correctly filters data for all roles
