import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, Users, Database, Rocket, FileText, Globe, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { 
  StatCard, 
  MiniAreaChart, 
  ActivityFeed, 
  SubaccountHealthTable,
  ActivityItem,
  SubaccountHealth,
  HealthStatus
} from "@/components/dashboard";
import { subWeeks, format, startOfWeek, endOfWeek } from "date-fns";

interface PartnerStats {
  totalAgencies: number;
  totalSubaccounts: number;
  totalUsers: number;
  activeTrials: number;
  totalCampaigns: number;
  articlesGenerated: number;
}

interface GrowthData {
  label: string;
  value: number;
}

export default function CountryPartnerDashboard() {
  const { partnerId } = useParams();
  const { roles } = useAuth();
  
  // Get partner's context_id from roles if not in params
  const contextPartnerId = partnerId || roles.find(r => r.role === 'country_partner')?.context_id;
  
  const [stats, setStats] = useState<PartnerStats>({
    totalAgencies: 0,
    totalSubaccounts: 0,
    totalUsers: 0,
    activeTrials: 0,
    totalCampaigns: 0,
    articlesGenerated: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [agencyHealth, setAgencyHealth] = useState<SubaccountHealth[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contextPartnerId) {
      fetchPartnerData();
    }
  }, [contextPartnerId]);

  const fetchPartnerData = async () => {
    try {
      // First get all agencies assigned to this partner
      const { data: agencies, error: agenciesError } = await supabase
        .from("agencies")
        .select("id, name, created_at")
        .eq("country_partner_id", contextPartnerId || "");

      if (agenciesError) throw agenciesError;

      const agencyIds = agencies?.map(a => a.id) || [];

      if (agencyIds.length === 0) {
        setStats({
          totalAgencies: 0,
          totalSubaccounts: 0,
          totalUsers: 0,
          activeTrials: 0,
          totalCampaigns: 0,
          articlesGenerated: 0,
        });
        setGrowthData([]);
        setAgencyHealth([]);
        setActivities([]);
        setLoading(false);
        return;
      }

      // Get all subaccounts in partner's agencies
      const { data: subaccounts, error: subError } = await supabase
        .from("subaccounts")
        .select("id, name, agency_id, created_at")
        .in("agency_id", agencyIds);

      if (subError) throw subError;

      const subaccountIds = subaccounts?.map(s => s.id) || [];

      // Fetch all metrics in parallel
      const [
        usersResult,
        trialsResult,
        campaignsResult,
        subscriptionsResult,
        wpConnectionsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).in("agency_id", agencyIds),
        supabase.from("subaccount_subscriptions").select("id", { count: "exact", head: true }).in("subaccount_id", subaccountIds).eq("is_trial", true),
        subaccountIds.length > 0 
          ? supabase.from("campaigns").select("id", { count: "exact" }).in("subaccount_id", subaccountIds)
          : Promise.resolve({ count: 0 }),
        subaccountIds.length > 0
          ? supabase.from("subaccount_subscriptions").select("subaccount_id, articles_used, plan_id, subscription_plans(name, article_limit)").in("subaccount_id", subaccountIds)
          : Promise.resolve({ data: [] }),
        subaccountIds.length > 0
          ? supabase.from("wordpress_connections").select("id, subaccount_id, status").in("subaccount_id", subaccountIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Calculate total articles
      const totalArticles = (subscriptionsResult.data || []).reduce(
        (sum: number, sub: any) => sum + (sub.articles_used || 0), 0
      );

      setStats({
        totalAgencies: agencies?.length || 0,
        totalSubaccounts: subaccounts?.length || 0,
        totalUsers: usersResult.count || 0,
        activeTrials: trialsResult.count || 0,
        totalCampaigns: (campaignsResult as any).count || 0,
        articlesGenerated: totalArticles,
      });

      // Calculate growth data (last 4 weeks)
      const weeklyGrowth: GrowthData[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i));
        const weekEnd = endOfWeek(subWeeks(new Date(), i));
        const count = (subaccounts || []).filter(s => {
          const created = new Date(s.created_at);
          return created >= weekStart && created <= weekEnd;
        }).length;
        weeklyGrowth.push({
          label: format(weekStart, "MMM d"),
          value: count,
        });
      }
      setGrowthData(weeklyGrowth);

      // Build agency health data (show agencies as "subaccounts" in the table)
      const subscriptionMap: Record<string, any> = {};
      (subscriptionsResult.data || []).forEach((sub: any) => {
        subscriptionMap[sub.subaccount_id] = sub;
      });

      const wpStatusMap: Record<string, string> = {};
      ((wpConnectionsResult as any).data || []).forEach((wp: any) => {
        if (wp.status === "connected") {
          wpStatusMap[wp.subaccount_id] = "connected";
        } else if (!wpStatusMap[wp.subaccount_id]) {
          wpStatusMap[wp.subaccount_id] = wp.status;
        }
      });

      // Count subaccounts per agency for health view
      const agencySubCounts: Record<string, number> = {};
      const agencyArticleCounts: Record<string, number> = {};
      const agencyLimits: Record<string, number> = {};
      const agencyWpStatus: Record<string, HealthStatus> = {};

      (subaccounts || []).forEach(sub => {
        agencySubCounts[sub.agency_id] = (agencySubCounts[sub.agency_id] || 0) + 1;
        
        const subscription = subscriptionMap[sub.id];
        agencyArticleCounts[sub.agency_id] = (agencyArticleCounts[sub.agency_id] || 0) + (subscription?.articles_used || 0);
        agencyLimits[sub.agency_id] = (agencyLimits[sub.agency_id] || 0) + (subscription?.subscription_plans?.article_limit || 10);
        
        const wpStatus = wpStatusMap[sub.id];
        if (wpStatus === "connected") {
          agencyWpStatus[sub.agency_id] = "healthy";
        } else if (wpStatus === "error" && agencyWpStatus[sub.agency_id] !== "healthy") {
          agencyWpStatus[sub.agency_id] = "error";
        } else if (!agencyWpStatus[sub.agency_id]) {
          agencyWpStatus[sub.agency_id] = "pending";
        }
      });

      const healthData: SubaccountHealth[] = (agencies || []).map(agency => ({
        id: agency.id,
        name: agency.name,
        planName: `${agencySubCounts[agency.id] || 0} subaccounts`,
        articlesUsed: agencyArticleCounts[agency.id] || 0,
        articleLimit: agencyLimits[agency.id] || 0,
        wpStatus: agencyWpStatus[agency.id] || "pending",
        lastActivity: agency.created_at ? new Date(agency.created_at) : null,
      }));

      setAgencyHealth(healthData);

      // Build activity feed
      const activityItems: ActivityItem[] = [];
      
      (agencies || []).slice(0, 3).forEach((agency: any) => {
        activityItems.push({
          id: `agency-${agency.id}`,
          type: "subaccount_created",
          title: `Agency: ${agency.name}`,
          description: "In your network",
          timestamp: new Date(agency.created_at),
        });
      });

      (subaccounts || []).slice(0, 5).forEach((sub: any) => {
        const agency = agencies?.find(a => a.id === sub.agency_id);
        activityItems.push({
          id: `sub-${sub.id}`,
          type: "subaccount_created",
          title: `Subaccount: ${sub.name}`,
          description: agency?.name,
          timestamp: new Date(sub.created_at),
        });
      });

      activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(activityItems.slice(0, 6));

    } catch (error) {
      console.error("Error fetching partner data:", error);
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partner Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your partner network performance
        </p>
      </div>

      {/* Row 1: Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="My Agencies"
          value={stats.totalAgencies}
          icon={Building2}
          description="Agencies in your network"
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
          description="In your network"
        />
      </div>

      {/* Row 2: Performance Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Active Trials"
          value={stats.activeTrials}
          icon={Clock}
          description="Currently in trial"
        />
        <StatCard
          title="Total Campaigns"
          value={stats.totalCampaigns}
          icon={Rocket}
          description="pSEO campaigns created"
        />
        <StatCard
          title="Articles Generated"
          value={stats.articlesGenerated}
          icon={FileText}
          description="This billing period"
        />
      </div>

      {/* Row 3: Growth Chart & Agency Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MiniAreaChart
          title="Network Growth (Last 4 Weeks)"
          data={growthData}
          color="hsl(var(--primary))"
          height={220}
        />
        <SubaccountHealthTable
          subaccounts={agencyHealth}
          title="Agency Performance Overview"
        />
      </div>

      {/* Row 4: Activity Feed */}
      <ActivityFeed
        title="Recent Network Activity"
        activities={activities}
        maxItems={6}
        emptyMessage="No recent activity in your network"
      />
    </div>
  );
}
