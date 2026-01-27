# Agency Sanctuary - Project Knowledge (T=0)

## Overview

**Agency Sanctuary** is a white-label, multi-tenant SaaS platform designed for marketing/SEO agencies. It provides programmatic SEO (pSEO) campaign management, content creation, and WordPress publishing capabilities with a hierarchical organizational structure.

---

## Architecture

### Multi-Tenant Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                     SUPER ADMIN                          │
│  (Platform owner - full access to everything)            │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│ COUNTRY PARTNER │      │ COUNTRY PARTNER │
│ (Regional reseller)    │ (Regional reseller)
└────────┬────────┘      └────────┬────────┘
         │                        │
    ┌────┴────┐              ┌────┴────┐
    ▼         ▼              ▼         ▼
┌───────┐ ┌───────┐     ┌───────┐ ┌───────┐
│AGENCY │ │AGENCY │     │AGENCY │ │AGENCY │
└───┬───┘ └───┬───┘     └───┬───┘ └───┬───┘
    │         │              │         │
    ▼         ▼              ▼         ▼
┌────────┐ ┌────────┐   ┌────────┐ ┌────────┐
│SUBACCT │ │SUBACCT │   │SUBACCT │ │SUBACCT │
│(Client)│ │(Client)│   │(Client)│ │(Client)│
└────────┘ └────────┘   └────────┘ └────────┘
```

### User Roles (app_role enum)

| Role | Access Level |
|------|--------------|
| `super_admin` | Full platform access, manage all entities |
| `country_partner` | Manage agencies within their region |
| `agency_admin` | Manage their agency and all subaccounts |
| `sub_account_user` | Access only their assigned subaccount |

---

## Core Features

### 1. Programmatic SEO (pSEO) Campaigns

**Location**: `src/pages/subaccount/Campaigns.tsx`, `src/components/campaigns/`

A wizard-based system to create landing pages at scale:

- **Campaign Wizard Steps**:
  1. Business details (name, logo, address)
  2. Data upload method (CSV or build from scratch)
  3. Dataset approval
  4. Template selection/generation
  5. Template editor (content, images, styles)
  6. Sample page preview

- **Campaign Detail Tabs**:
  - Matrix Builder - data grid management
  - Keyword Mapper - SEO keyword assignment
  - Pages - generated landing pages
  - CMS Editor - page content editing
  - Content Generator - AI-powered content
  - Deployment Settings - publishing configuration
  - Reusable Blocks - shared content components

### 2. Blog/Article Management

**Location**: `src/pages/subaccount/Blogs.tsx`, `src/components/articles/`

- Blog projects with categorization
- Article creation and editing (TipTap rich text editor)
- Article status tracking (draft → in progress → review → published)
- WordPress publishing integration
- Project-level knowledge bases for AI context

### 3. WordPress Integration

**Location**: `src/pages/subaccount/WordPress.tsx`, `src/hooks/useWordPressConnections.ts`

- Multiple WordPress site connections per subaccount
- API key authentication
- Connection health monitoring
- Direct article publishing
- Supabase Edge Functions:
  - `publish-to-wordpress`
  - `wordpress-publish`
  - `wordpress-handshake`
  - `test-wordpress-connection`

### 4. Knowledge Base System

**Location**: `src/pages/subaccount/KnowledgeBase.tsx`

Two levels of knowledge bases:
- **Subaccount-level**: Brand voice, industry, target audience
- **Project-level**: Per-blog project customization
- Used to provide context for AI content generation

### 5. Page Builder

**Location**: `src/components/page-builder/`

Unified page builder with:
- Drag-and-drop blocks panel
- Live preview canvas
- Settings panel for customization
- AI assistant integration

### 6. Billing & Subscriptions

**Location**: `src/components/BillingWidget.tsx`, `src/hooks/useTrialStatus.ts`

- Stripe integration for payments
- Subscription plans with article limits
- Trial period management
- Usage tracking (articles used per billing period)
- Edge Functions:
  - `create-checkout`
  - `create-trial-checkout`
  - `customer-portal`
  - `stripe-webhook`
  - `check-subscription`

### 7. Team Management

**Location**: `src/pages/agency/Team.tsx`, `src/pages/subaccount/settings/TeamSettings.tsx`

- Invite team members via email
- Role-based permissions
- Agency-level and subaccount-level teams
- Edge Functions:
  - `invite-agency-member`
  - `invite-team-member`
  - `invite-subaccount-client`

### 8. Subaccount Transfers

**Location**: `src/pages/super-admin/Subaccounts.tsx`

- Transfer subaccounts between agencies
- Approval workflow (pending → approved/rejected)
- Edge Function: `handle-transfer-request`

### 9. Product Roadmap (Super Admin)

**Location**: `src/pages/super-admin/Features.tsx`, `src/components/features/`

- Trello-style Kanban board
- Drag-and-drop feature cards
- Customizable stages with pastel colors
- Priority badges and deadlines

---

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack React Query
- **Routing**: React Router v6
- **Rich Text**: TipTap editor
- **Charts**: Recharts

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth (email-based)
- **Storage**: Supabase Storage
- **Edge Functions**: Deno-based serverless functions

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to auth.users |
| `agencies` | Agency organizations |
| `subaccounts` | Client accounts under agencies |
| `country_partners` | Regional resellers |
| `user_roles` | Role assignments with context |
| `campaigns` | pSEO campaign configurations |
| `campaign_pages` | Generated landing pages |
| `blog_projects` | Blog/content projects |
| `blog_posts` | Individual articles |
| `wordpress_connections` | WP site integrations |
| `article_publications` | WP publish tracking |
| `subscription_plans` | Available plans |
| `subaccount_subscriptions` | Active subscriptions |
| `feature_stages` | Roadmap columns |
| `feature_requests` | Roadmap items |
| `agency_invites` | Pending invitations |
| `transfer_requests` | Subaccount transfers |

---

## External Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Stripe** | Payments & subscriptions | ✅ Implemented |
| **WordPress** | Content publishing | ✅ Implemented |
| **Airtable** | Data source for articles | ✅ Implemented |
| **GoHighLevel** | CRM webhooks | ✅ Implemented |
| **n8n** | Workflow automation | ✅ Implemented |

---

## Key Design Patterns

### 1. RLS-Based Security
All tables use Row Level Security policies based on user roles and context.

### 2. React Query Hooks
Custom hooks for data fetching pattern:
- `useCampaigns`, `useCampaignPages`
- `useWordPressConnections`
- `useFeatureBoard`
- `useTrialStatus`, `useSubaccountUsage`

### 3. Layout Components
Role-specific layouts:
- `SuperAdminLayout` - Platform admin UI
- `AgencyLayout` - Agency management UI
- `SubaccountLayout` - Client workspace UI

### 4. Protected Routes
`ProtectedRoute` component enforces authentication and role-based access.

---

## File Structure

```
src/
├── components/
│   ├── articles/         # Article management
│   ├── campaigns/        # pSEO campaigns
│   ├── connections/      # WordPress connections
│   ├── features/         # Roadmap kanban
│   ├── layout/           # Layout wrappers
│   ├── page-builder/     # Page builder
│   ├── preview/          # Page preview
│   ├── settings/         # Settings UI
│   └── ui/               # shadcn components
├── contexts/
│   └── AuthContext.tsx   # Auth state
├── hooks/                # Custom React hooks
├── pages/
│   ├── agency/           # Agency admin pages
│   ├── auth/             # Invite acceptance
│   ├── subaccount/       # Client pages
│   └── super-admin/      # Platform admin pages
└── integrations/
    └── supabase/         # DB client & types

supabase/
└── functions/            # Edge functions
```

---

## Security Model

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies use helper functions: `has_role()`, `user_agency_id()`, `user_subaccount_id()`, `get_user_country_partner_id()`
- Super admins bypass most restrictions
- Users can only access their own org's data

### Auth Configuration
- Email-based authentication
- Auto-confirm enabled for development
- Invite-based user onboarding

---

## Deployment

- **Frontend**: Auto-deployed via Lovable
- **Backend**: Lovable Cloud (Supabase)
- **Edge Functions**: Auto-deployed on save
- **Published URL**: https://agency-sanctuary.lovable.app
