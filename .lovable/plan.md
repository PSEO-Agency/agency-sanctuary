

# Plan: Enhance Dashboards at All Levels with Rich Metrics

## Overview

Expand all four dashboard levels (Super Admin, Country Partner, Agency, Sub-account) with comprehensive, role-relevant metrics. The project already has recharts installed and a chart component system ready to use.

## Current State Analysis

| Dashboard | Current Metrics | Gap |
|-----------|-----------------|-----|
| **Super Admin** | 3 basic counts (Agencies, Subaccounts, Users) | No growth trends, billing insights, platform health, or activity feed |
| **Country Partner** | Uses Super Admin dashboard (unfiltered) | No network-specific filtering or dedicated view |
| **Agency** | 2 basic counts (Subaccounts, Users) | No aggregate content metrics, subaccount health, or activity |
| **Sub-account** | Most complete (Projects, Articles, Usage) | Missing campaign metrics, WordPress status, quick actions |

## Database Metrics Available

Based on the current data:
- 21 campaigns, 448 campaign pages
- 10 Basic plan subscriptions, 0 Pro
- 15 blog projects, 2 article publications
- 1 active WordPress connection
- Growth data available by week

---

## Implementation Plan

### Phase 1: Create Shared Dashboard Components

**File: `src/components/dashboard/StatCard.tsx`**
A reusable stat card component with optional trend indicator and click navigation.

**File: `src/components/dashboard/MiniAreaChart.tsx`**
A compact area chart for showing trends (last 7 days, last 30 days).

**File: `src/components/dashboard/ActivityFeed.tsx`**
A recent activity list component showing latest actions across the platform.

**File: `src/components/dashboard/PlanDistributionChart.tsx`**
A donut/pie chart showing subscription plan distribution.

**File: `src/components/dashboard/HealthIndicator.tsx`**
A status indicator component for showing connection health, trial status, etc.

---

### Phase 2: Super Admin Dashboard Enhancement

**File: `src/pages/super-admin/Dashboard.tsx`**

#### New Metrics to Add:

**Row 1 - Key Stats (4 cards):**
1. Total Agencies (existing)
2. Total Subaccounts (existing)
3. Total Users (existing)
4. Active Trials (NEW)

**Row 2 - Platform Health (3 cards):**
1. Total Campaigns (21)
2. Total Pages Generated (448)
3. WordPress Connections (1 active)

**Row 3 - Two-column layout:**

*Left Column - Growth Chart:*
- Area chart showing new subaccounts over the last 4 weeks
- Uses recharts AreaChart with gradient fill

*Right Column - Plan Distribution:*
- Donut chart showing Basic vs Pro distribution
- Shows revenue potential (10 Basic at €0, 0 Pro at €495)

**Row 4 - Recent Activity Feed:**
- Latest subaccount creations
- Latest campaign creations
- Latest WordPress publications

#### Data Fetching:
```typescript
// Additional queries needed:
const fetchPlatformMetrics = async () => {
  const [campaigns, pages, wpConnections, trials, planDist, recentActivity] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }),
    supabase.from("campaign_pages").select("id", { count: "exact", head: true }),
    supabase.from("wordpress_connections").select("id, status", { count: "exact" }),
    supabase.from("subaccount_subscriptions").select("id", { count: "exact", head: true }).eq("is_trial", true),
    // Plan distribution query
    supabase.from("subaccount_subscriptions").select("plan_id, subscription_plans(name)"),
    // Growth data - last 4 weeks
    supabase.from("subaccounts").select("created_at").gte("created_at", fourWeeksAgo),
  ]);
};
```

---

### Phase 3: Country Partner Dashboard

**File: `src/pages/super-admin/Dashboard.tsx`** (Enhanced with role detection)

The dashboard will detect if user is Country Partner (not Super Admin) and filter all queries by their assigned agencies.

#### Filtered Metrics for Partners:
1. **My Agencies** - Count of agencies assigned to this partner
2. **My Subaccounts** - Subaccounts within partner's agencies
3. **My Users** - Users within partner's network
4. **Active Trials** - Trials in partner's network

#### Partner-Specific Sections:
- **Network Performance Card**: Total articles generated across all subaccounts in network
- **Agency Health Overview**: Table showing each agency with subaccount count, active users, trial status
- **Growth within Network**: Area chart showing subaccount growth in partner's territory

#### Implementation:
```typescript
// Get country partner ID from auth context
const partnerId = roles.find(r => r.role === 'country_partner')?.context_id;

// Filter agencies by partner
const { data: agencies } = await supabase
  .from("agencies")
  .select("id")
  .eq("country_partner_id", partnerId);

const agencyIds = agencies?.map(a => a.id) || [];

// Then filter all subsequent queries by these agency IDs
const subaccounts = await supabase
  .from("subaccounts")
  .select("id", { count: "exact" })
  .in("agency_id", agencyIds);
```

---

### Phase 4: Agency Dashboard Enhancement

**File: `src/pages/agency/Dashboard.tsx`**

#### New Metrics to Add:

**Row 1 - Key Stats (4 cards):**
1. Total Subaccounts (existing)
2. Total Team Members (existing)
3. Active Campaigns (NEW)
4. Articles This Month (NEW - aggregate across all subaccounts)

**Row 2 - Subaccount Health Overview:**
A table/list showing each subaccount with:
- Name
- Plan type (Basic/Pro)
- Articles used / limit
- WordPress connection status (green/red dot)
- Last activity date

**Row 3 - Two-column layout:**

*Left Column - Usage Overview:*
- Stacked bar or grouped bar chart showing article usage across subaccounts
- Helps agency admins identify which subaccounts are near limits

*Right Column - Recent Activity:*
- Latest articles created across all subaccounts
- Latest campaigns created
- Latest team member additions

#### Data Fetching:
```typescript
const fetchAgencyMetrics = async () => {
  if (!agencyId) return;
  
  const [subaccounts, campaigns, wpConnections, subscriptions] = await Promise.all([
    supabase.from("subaccounts").select("id, name").eq("agency_id", agencyId),
    supabase.from("campaigns")
      .select("id, subaccount_id")
      .in("subaccount_id", subaccountIds),
    supabase.from("wordpress_connections")
      .select("id, subaccount_id, status")
      .in("subaccount_id", subaccountIds),
    supabase.from("subaccount_subscriptions")
      .select("subaccount_id, articles_used, plan_id, subscription_plans(name, article_limit)")
      .in("subaccount_id", subaccountIds),
  ]);
};
```

---

### Phase 5: Sub-account Dashboard Enhancement

**File: `src/pages/subaccount/Dashboard.tsx`**

#### Enhancements to Add:

**Row 1 - Stats Cards (keep existing 4, enhance):**
- Add subtle trend arrows (up/down vs last period)
- Add click-through to relevant pages

**New Row 2 - Campaign Metrics:**
1. Active pSEO Campaigns (count)
2. Total Pages Generated (count)
3. Pages Published (count)
4. Publishing Rate (percentage)

**Enhanced Row 3 - Two-column layout:**

*Left Column - Usage This Period (existing, enhanced):*
- Keep existing progress bar
- Add mini sparkline showing daily article creation trend

*Right Column - WordPress Status (NEW):*
- Show connected WordPress sites
- Last sync date
- Published article count per site
- Connection health indicator

**New Row 4 - Quick Actions:**
- "Create New Article" button
- "Start Campaign" button
- "Connect WordPress" button (if no connections)

#### Data Fetching Additions:
```typescript
// Campaign metrics
const { data: campaigns } = await supabase
  .from("campaigns")
  .select("id, status, pages_generated, total_pages")
  .eq("subaccount_id", subaccountId);

// WordPress status
const { data: wpConnections } = await supabase
  .from("wordpress_connections")
  .select("id, name, status, last_checked_at")
  .eq("subaccount_id", subaccountId);

// Publication stats
const { data: publications } = await supabase
  .from("article_publications")
  .select("id, published_at, connection_id")
  .eq("subaccount_id", subaccountId);
```

---

## File Summary

### New Files to Create:
1. `src/components/dashboard/StatCard.tsx` - Enhanced stat card with trends
2. `src/components/dashboard/MiniAreaChart.tsx` - Compact trend chart
3. `src/components/dashboard/ActivityFeed.tsx` - Recent activity list
4. `src/components/dashboard/PlanDistributionChart.tsx` - Donut chart for plans
5. `src/components/dashboard/HealthIndicator.tsx` - Status indicators
6. `src/components/dashboard/SubaccountHealthTable.tsx` - Agency-level overview table

### Files to Modify:
1. `src/pages/super-admin/Dashboard.tsx` - Complete overhaul with role detection
2. `src/pages/agency/Dashboard.tsx` - Add aggregate metrics and health overview
3. `src/pages/subaccount/Dashboard.tsx` - Add campaign metrics and quick actions

---

## Technical Considerations

1. **Chart Library**: Use existing recharts integration via `src/components/ui/chart.tsx`
2. **Loading States**: Add skeleton loaders for all new data sections
3. **RLS Compliance**: All queries respect existing RLS policies
4. **Performance**: Use `Promise.all` for parallel data fetching
5. **Responsive Design**: Grid layouts adapt from 1 to 4 columns based on screen size

## Visual Design

- Consistent card styling using existing shadcn/ui Card components
- Color coding: Green (healthy/good), Yellow (warning), Red (critical)
- Trend indicators: Small arrows or percentage badges
- Charts use theme-consistent colors from the chart config

