import { useEffect, useState } from "react";
import { Building2, Users, Database, Rocket, FileText, Globe, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  StatCard, 
  MiniAreaChart, 
  PlanDistributionChart, 
  ActivityFeed, 
  ActivityItem 
} from "@/components/dashboard";
import { subWeeks, format, startOfWeek, endOfWeek } from "date-fns";

interface PlatformStats {
  totalAgencies: number;
  totalSubaccounts: number;
  totalUsers: number;
  activeTrials: number;
  totalCampaigns: number;
  totalPages: number;
  activeWpConnections: number;
}

interface GrowthData {
  label: string;
  value: number;
}

interface PlanData {
  name: string;
  value: number;
  color: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    totalAgencies: 0,
    totalSubaccounts: 0,
    totalUsers: 0,
    activeTrials: 0,
    totalCampaigns: 0,
    totalPages: 0,
    activeWpConnections: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [planData, setPlanData] = useState<PlanData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch all stats in parallel
      const [
        agenciesResult,
        subaccountsResult,
        usersResult,
        trialsResult,
        campaignsResult,
        pagesResult,
        wpResult,
        subscriptionsResult,
        recentSubaccountsResult,
        recentCampaignsResult,
      ] = await Promise.all([
        supabase.from("agencies").select("id", { count: "exact", head: true }),
        supabase.from("subaccounts").select("id, created_at", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subaccount_subscriptions").select("id", { count: "exact", head: true }).eq("is_trial", true),
        supabase.from("campaigns").select("id", { count: "exact", head: true }),
        supabase.from("campaign_pages").select("id", { count: "exact", head: true }),
        supabase.from("wordpress_connections").select("id, status"),
        supabase.from("subaccount_subscriptions").select("plan_id, subscription_plans(name)"),
        supabase.from("subaccounts").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("campaigns").select("id, name, created_at, subaccounts(name)").order("created_at", { ascending: false }).limit(5),
      ]);

      // Calculate active WP connections
      const activeWp = wpResult.data?.filter(w => w.status === "connected").length || 0;

      setStats({
        totalAgencies: agenciesResult.count || 0,
        totalSubaccounts: subaccountsResult.count || 0,
        totalUsers: usersResult.count || 0,
        activeTrials: trialsResult.count || 0,
        totalCampaigns: campaignsResult.count || 0,
        totalPages: pagesResult.count || 0,
        activeWpConnections: activeWp,
      });

      // Calculate growth data (last 4 weeks)
      const subaccounts = subaccountsResult.data || [];
      const weeklyGrowth: GrowthData[] = [];
      
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i));
        const weekEnd = endOfWeek(subWeeks(new Date(), i));
        const count = subaccounts.filter(s => {
          const created = new Date(s.created_at);
          return created >= weekStart && created <= weekEnd;
        }).length;
        weeklyGrowth.push({
          label: format(weekStart, "MMM d"),
          value: count,
        });
      }
      setGrowthData(weeklyGrowth);

      // Calculate plan distribution
      const subscriptions = subscriptionsResult.data || [];
      const planCounts: Record<string, number> = {};
      subscriptions.forEach((sub: any) => {
        const planName = sub.subscription_plans?.name || "Unknown";
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });
      
      const planColors: Record<string, string> = {
        Basic: "hsl(var(--muted-foreground))",
        Pro: "hsl(var(--primary))",
        Unknown: "#9ca3af",
      };
      
      setPlanData(
        Object.entries(planCounts).map(([name, value]) => ({
          name,
          value,
          color: planColors[name] || "#6366f1",
        }))
      );

      // Build activity feed
      const activityItems: ActivityItem[] = [];
      
      (recentSubaccountsResult.data || []).forEach((sub: any) => {
        activityItems.push({
          id: `sub-${sub.id}`,
          type: "subaccount_created",
          title: `New subaccount: ${sub.name}`,
          timestamp: new Date(sub.created_at),
        });
      });
      
      (recentCampaignsResult.data || []).forEach((campaign: any) => {
        activityItems.push({
          id: `camp-${campaign.id}`,
          type: "campaign_created",
          title: `Campaign created: ${campaign.name}`,
          description: campaign.subaccounts?.name,
          timestamp: new Date(campaign.created_at),
        });
      });

      // Sort by date
      activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(activityItems.slice(0, 8));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          System-wide overview and platform metrics
        </p>
      </div>

      {/* Row 1: Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Agencies"
          value={stats.totalAgencies}
          icon={Building2}
          description="Active agencies"
          href="/super-admin/agencies"
        />
        <StatCard
          title="Total Subaccounts"
          value={stats.totalSubaccounts}
          icon={Database}
          description="Across all agencies"
          href="/super-admin/subaccounts"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          description="All registered users"
        />
        <StatCard
          title="Active Trials"
          value={stats.activeTrials}
          icon={Clock}
          description="Currently in trial period"
        />
      </div>

      {/* Row 2: Platform Health */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Campaigns"
          value={stats.totalCampaigns}
          icon={Rocket}
          description="pSEO campaigns created"
        />
        <StatCard
          title="Pages Generated"
          value={stats.totalPages.toLocaleString()}
          icon={FileText}
          description="Total campaign pages"
        />
        <StatCard
          title="WordPress Connections"
          value={stats.activeWpConnections}
          icon={Globe}
          description="Active integrations"
        />
      </div>

      {/* Row 3: Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <MiniAreaChart
          title="Subaccount Growth (Last 4 Weeks)"
          data={growthData}
          color="hsl(var(--primary))"
          height={220}
        />
        <PlanDistributionChart
          title="Subscription Plans"
          data={planData}
          height={220}
        />
      </div>

      {/* Row 4: Activity Feed */}
      <ActivityFeed
        title="Recent Platform Activity"
        activities={activities}
        maxItems={8}
        emptyMessage="No recent activity on the platform"
      />
    </div>
  );
}
