import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Database, Users, Rocket, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  StatCard, 
  SubaccountHealthTable, 
  ActivityFeed, 
  SubaccountHealth,
  ActivityItem,
  HealthStatus 
} from "@/components/dashboard";

interface AgencyStats {
  totalSubaccounts: number;
  totalUsers: number;
  activeCampaigns: number;
  articlesThisMonth: number;
}

export default function AgencyDashboard() {
  const { agencyId } = useParams();
  const [stats, setStats] = useState<AgencyStats>({
    totalSubaccounts: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    articlesThisMonth: 0,
  });
  const [subaccountHealth, setSubaccountHealth] = useState<SubaccountHealth[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agencyId) {
      fetchAgencyData();
    }
  }, [agencyId]);

  const fetchAgencyData = async () => {
    try {
      // First get all subaccounts for this agency
      const { data: subaccounts, error: subError } = await supabase
        .from("subaccounts")
        .select("id, name, created_at, updated_at")
        .eq("agency_id", agencyId || "");

      if (subError) throw subError;

      const subaccountIds = subaccounts?.map(s => s.id) || [];

      if (subaccountIds.length === 0) {
        setStats({
          totalSubaccounts: 0,
          totalUsers: 0,
          activeCampaigns: 0,
          articlesThisMonth: 0,
        });
        setSubaccountHealth([]);
        setActivities([]);
        setLoading(false);
        return;
      }

      // Fetch all related data in parallel
      const [
        usersResult,
        campaignsResult,
        wpConnectionsResult,
        subscriptionsResult,
        recentCampaignsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
        supabase.from("campaigns").select("id", { count: "exact" }).in("subaccount_id", subaccountIds),
        supabase.from("wordpress_connections").select("id, subaccount_id, status").in("subaccount_id", subaccountIds),
        supabase.from("subaccount_subscriptions")
          .select("subaccount_id, articles_used, plan_id, subscription_plans(name, article_limit)")
          .in("subaccount_id", subaccountIds),
        supabase.from("campaigns")
          .select("id, name, created_at, subaccount_id, subaccounts(name)")
          .in("subaccount_id", subaccountIds)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Calculate total articles used this month
      const totalArticles = subscriptionsResult.data?.reduce(
        (sum, sub: any) => sum + (sub.articles_used || 0), 0
      ) || 0;

      setStats({
        totalSubaccounts: subaccounts?.length || 0,
        totalUsers: usersResult.count || 0,
        activeCampaigns: campaignsResult.count || 0,
        articlesThisMonth: totalArticles,
      });

      // Build subaccount health data
      const wpStatusMap: Record<string, string> = {};
      (wpConnectionsResult.data || []).forEach((wp: any) => {
        // Mark as connected if any connection for this subaccount is connected
        if (wp.status === "connected") {
          wpStatusMap[wp.subaccount_id] = "connected";
        } else if (!wpStatusMap[wp.subaccount_id]) {
          wpStatusMap[wp.subaccount_id] = wp.status;
        }
      });

      const subscriptionMap: Record<string, any> = {};
      (subscriptionsResult.data || []).forEach((sub: any) => {
        subscriptionMap[sub.subaccount_id] = sub;
      });

      const healthData: SubaccountHealth[] = (subaccounts || []).map(sub => {
        const subscription = subscriptionMap[sub.id];
        const wpStatus = wpStatusMap[sub.id];
        
        let healthStatus: HealthStatus = "pending";
        if (wpStatus === "connected") {
          healthStatus = "healthy";
        } else if (wpStatus === "error") {
          healthStatus = "error";
        } else if (wpStatus === "disconnected") {
          healthStatus = "warning";
        }

        return {
          id: sub.id,
          name: sub.name,
          planName: subscription?.subscription_plans?.name || "Basic",
          articlesUsed: subscription?.articles_used || 0,
          articleLimit: subscription?.subscription_plans?.article_limit || 10,
          wpStatus: healthStatus,
          lastActivity: sub.updated_at ? new Date(sub.updated_at) : null,
        };
      });

      setSubaccountHealth(healthData);

      // Build activity feed
      const activityItems: ActivityItem[] = [];
      
      (subaccounts || []).slice(0, 3).forEach((sub: any) => {
        activityItems.push({
          id: `sub-${sub.id}`,
          type: "subaccount_created",
          title: `Subaccount: ${sub.name}`,
          description: "Created",
          timestamp: new Date(sub.created_at),
        });
      });
      
      (recentCampaignsResult.data || []).forEach((campaign: any) => {
        activityItems.push({
          id: `camp-${campaign.id}`,
          type: "campaign_created",
          title: `Campaign: ${campaign.name}`,
          description: campaign.subaccounts?.name,
          timestamp: new Date(campaign.created_at),
        });
      });

      activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(activityItems.slice(0, 6));

    } catch (error) {
      console.error("Error fetching agency data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agency Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your agency and monitor subaccount performance
        </p>
      </div>

      {/* Row 1: Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Subaccounts"
          value={stats.totalSubaccounts}
          icon={Database}
          description="Active subaccounts"
          href={`/agency/${agencyId}/subaccounts`}
        />
        <StatCard
          title="Team Members"
          value={stats.totalUsers}
          icon={Users}
          description="Agency users"
          href={`/agency/${agencyId}/team`}
        />
        <StatCard
          title="Active Campaigns"
          value={stats.activeCampaigns}
          icon={Rocket}
          description="pSEO campaigns"
        />
        <StatCard
          title="Articles This Month"
          value={stats.articlesThisMonth}
          icon={FileText}
          description="Aggregate usage"
        />
      </div>

      {/* Row 2: Subaccount Health Table */}
      <SubaccountHealthTable
        subaccounts={subaccountHealth}
        title="Subaccount Health Overview"
      />

      {/* Row 3: Activity Feed */}
      <ActivityFeed
        title="Recent Activity"
        activities={activities}
        maxItems={6}
        emptyMessage="No recent activity in your agency"
      />
    </div>
  );
}
