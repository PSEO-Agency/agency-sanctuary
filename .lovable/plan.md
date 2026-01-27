
# Plan: Comprehensive Announcements Feature

## Overview

Build a full-featured announcements system that allows Super Admins to create announcements targeting specific audience levels (country partners, agencies, subaccounts), with AI-generated images using role-specific theme colors, and a notification system with unread counts and modal displays on login.

## Database Schema

### New Tables

#### 1. `announcements` - Store announcement content
```sql
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  cta_text text,
  cta_url text,
  audience text[] NOT NULL DEFAULT '{}', -- ['country_partner', 'agency', 'subaccount']
  published_at timestamp with time zone DEFAULT now(),
  is_draft boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### 2. `announcement_reads` - Track read status per user
```sql
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
```

### RLS Policies

```sql
-- Announcements: Super admins manage all, others read based on audience
CREATE POLICY "Super admins can manage all announcements"
  ON public.announcements FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view announcements for their audience"
  ON public.announcements FOR SELECT
  USING (
    NOT is_draft AND (
      has_role(auth.uid(), 'super_admin') OR
      (has_role(auth.uid(), 'country_partner') AND 'country_partner' = ANY(audience)) OR
      (has_role(auth.uid(), 'agency_admin') AND 'agency' = ANY(audience)) OR
      (has_role(auth.uid(), 'sub_account_user') AND 'subaccount' = ANY(audience))
    )
  );

-- Announcement reads: Users manage their own read status
CREATE POLICY "Users can manage their own read status"
  ON public.announcement_reads FOR ALL
  USING (user_id = auth.uid());
```

## Architecture Overview

```text
+------------------------------------------------------------------+
|                    SUPER ADMIN PORTAL                             |
+------------------------------------------------------------------+
| New Sidebar Item: "Announcements" (Megaphone icon)               |
|                                                                   |
| /super-admin/announcements                                        |
| +--------------------------------------------------------------+ |
| | [+ New Announcement]                          [Drafts] [Sent] | |
| +--------------------------------------------------------------+ |
| | Announcement List with filters                                | |
| | - Title, Audience badges, Date, Actions                       | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                CREATE ANNOUNCEMENT DIALOG                         |
+------------------------------------------------------------------+
| Title: [___________________________________]                      |
| Description: [Rich text editor]                                   |
|                                                                   |
| Image: [Upload] or [Generate with AI ✨]                          |
|   AI Prompt: "Generate announcement image"                        |
|   Theme: [Subaccount Purple] [Agency Blue] [Partner Orange]       |
|                                                                   |
| CTA (optional):                                                   |
| Button Text: [___________]  URL: [___________________]            |
|                                                                   |
| Audience: [x] Subaccounts  [x] Agencies  [x] Country Partners     |
|                                                                   |
| Publish Date: [Calendar picker]                                   |
|                                                                   |
| [Save as Draft]              [Publish Announcement]               |
+------------------------------------------------------------------+
```

## Header Integration

### Megaphone Icon Placement

Add a megaphone (📢) icon to the LEFT of the Bell icon in all layouts:

```text
Header (all roles):
+------------------------------------------------------------------+
| [Logo] (closed BETA)           [...search...]   [📢•2] [🔔] [👤] |
+------------------------------------------------------------------+
                                                    ^
                                           Unread count badge
```

### Notification Dropdown Structure

**Subaccount View (1 tab):**
```text
+---------------------------+
| Announcements             |
+---------------------------+
| [Account]                 |
+---------------------------+
| • New Feature Released!   |
|   2 hours ago             |
| ○ Tips for better SEO     |
|   Yesterday               |
+---------------------------+
```

**Agency View (2 tabs):**
```text
+---------------------------+
| Announcements             |
+---------------------------+
| [Agency] [Account]        |
+---------------------------+
| • Partner Program Update  |
|   Today                   |
+---------------------------+
```

**Country Partner View (3 tabs):**
```text
+---------------------------+
| Announcements             |
+---------------------------+
| [Partner] [Agency] [Acct] |
+---------------------------+
| • Global Expansion News   |
|   Today                   |
+---------------------------+
```

## Login Modal Flow

When a user logs in and has unread announcements:

```text
+------------------------------------------+
|  📢 New Announcement                  X  |
+------------------------------------------+
|                                          |
|  [Generated/Uploaded Image]              |
|                                          |
|  Title: Welcome to the New Dashboard!    |
|                                          |
|  Description: We've updated the          |
|  interface with new features...          |
|                                          |
|  [Learn More] (CTA button)               |
|                                          |
+------------------------------------------+
|  1 of 3 unread          [Mark Read] [→]  |
+------------------------------------------+
```

## AI Image Generation

### Edge Function: `generate-announcement-image`

Uses Lovable AI with `google/gemini-2.5-flash-image` model:

```typescript
// Color palette based on audience
const themeColors = {
  subaccount: { primary: "purple", accent: "violet", hex: "#7c3aed" },
  agency: { primary: "blue", accent: "indigo", hex: "#3b82f6" },
  country_partner: { primary: "orange", accent: "amber", hex: "#f97316" },
};

// Generate prompt with theme-specific styling
const imagePrompt = `Create a modern, professional announcement banner image. 
Theme: ${theme.primary} and ${theme.accent} color palette.
Style: Clean, minimalist design with subtle gradients.
Subject: ${userPrompt}
Dimensions: 16:9 landscape format suitable for web banners.`;
```

## Email Template Preparation

### Table: `email_templates`
```sql
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Announcement Email Template (for later activation)
- Template name: `announcement_notification`
- Variables: `{{title}}`, `{{description}}`, `{{image_url}}`, `{{cta_text}}`, `{{cta_url}}`, `{{recipient_name}}`
- Inactive by default until email sending is configured

## Component Structure

### New Components

| Component | Description |
|-----------|-------------|
| `AnnouncementsPage.tsx` | Super Admin page with announcement list and management |
| `CreateAnnouncementDialog.tsx` | Form for creating/editing announcements |
| `AnnouncementDropdown.tsx` | Header dropdown for viewing announcements |
| `AnnouncementModal.tsx` | Login popup for unread announcements |
| `AnnouncementCard.tsx` | Individual announcement display in list/dropdown |
| `AudienceSelector.tsx` | Checkbox group for selecting audience levels |
| `AIImageGenerator.tsx` | AI image generation with theme color selection |

### New Hook: `useAnnouncements.ts`

```typescript
interface UseAnnouncementsReturn {
  announcements: Announcement[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createAnnouncement: (data: CreateAnnouncementInput) => Promise<void>;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  getAnnouncementsByAudience: (audience: AudienceLevel) => Announcement[];
}
```

## Files to Create

| File | Description |
|------|-------------|
| `src/pages/super-admin/Announcements.tsx` | Main announcements management page |
| `src/components/announcements/CreateAnnouncementDialog.tsx` | Create/edit form |
| `src/components/announcements/AnnouncementDropdown.tsx` | Header notification dropdown |
| `src/components/announcements/AnnouncementModal.tsx` | Login unread popup |
| `src/components/announcements/AnnouncementCard.tsx` | Announcement display card |
| `src/components/announcements/AudienceSelector.tsx` | Audience checkbox group |
| `src/components/announcements/AIImageGenerator.tsx` | AI image with theme colors |
| `src/hooks/useAnnouncements.ts` | Announcements data and actions hook |
| `supabase/functions/generate-announcement-image/index.ts` | AI image generation |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/SuperAdminSidebar.tsx` | Add "Announcements" menu item with Megaphone icon |
| `src/pages/SuperAdmin.tsx` | Add route for `/announcements` |
| `src/components/layout/SuperAdminLayout.tsx` | Add AnnouncementDropdown to header |
| `src/components/layout/AgencyLayout.tsx` | Add AnnouncementDropdown to header |
| `src/components/layout/SubaccountLayout.tsx` | Add AnnouncementDropdown to header |
| `src/components/SubaccountSidebar.tsx` | Add login modal trigger for unread announcements |

## Roadmap Ticket Update

Move the existing "Announcements" feature from Backlog to In Progress:

```sql
UPDATE feature_requests 
SET stage_id = 'd9bf869c-81cf-4ec3-b541-42d34f2960fa', -- In Progress
    description = 'Comprehensive announcement system with role-based targeting (country partners, agencies, subaccounts). Features include: megaphone icon in header with unread count badge, dropdown with audience-specific tabs, login modal for unread notifications, AI image generation with theme-specific colors (purple/blue/orange), optional CTA buttons, and email template preparation for future activation.',
    priority = 'high'
WHERE id = 'c6964789-ae7b-4efc-abe7-beef4f93267b';
```

## Implementation Order

1. **Database**: Create tables and RLS policies
2. **Hook**: Build `useAnnouncements` with queries and mutations
3. **Super Admin UI**: Announcements page and create dialog
4. **AI Image Edge Function**: Generate themed announcement images
5. **Header Integration**: Add megaphone dropdown to all layouts
6. **Login Modal**: Show unread announcements on login
7. **Email Template**: Create inactive template for future use
8. **Roadmap**: Update ticket to In Progress

## Technical Notes

### Theme Color Mapping
```typescript
const THEME_COLORS = {
  subaccount: {
    hsl: "262 83% 58%",    // Purple
    hex: "#7c3aed",
    name: "Violet"
  },
  agency: {
    hsl: "217 91% 60%",    // Blue
    hex: "#3b82f6",
    name: "Blue"
  },
  country_partner: {
    hsl: "25 95% 53%",     // Orange
    hex: "#f97316",
    name: "Orange"
  }
};
```

### Unread Count Query
```typescript
const { count } = await supabase
  .from('announcements')
  .select('id', { count: 'exact', head: true })
  .not('id', 'in', (
    supabase.from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
  ))
  .contains('audience', [userAudienceLevel])
  .eq('is_draft', false);
```

