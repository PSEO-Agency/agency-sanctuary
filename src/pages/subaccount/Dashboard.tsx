import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  FileText, 
  FolderKanban, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Calendar,
  Rocket,
  Globe,
  Plus,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useSubaccountUsage } from "@/hooks/useSubaccountUsage";
import { StatCard, HealthIndicator, HealthStatus } from "@/components/dashboard";
import { formatDistanceToNow } from "date-fns";

interface RecentProject {
  id: string;
  name: string;
  articleCount: number;
  createdAt: Date;
}

interface WpConnection {
  id: string;
  name: string;
  status: string;
  lastChecked: Date | null;
}

export default function SubaccountDashboard() {
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  
  // Use the shared usage hook for consistent data
  const usage = useSubaccountUsage(subaccountId);

  // Fetch projects count and recent projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-data', subaccountId],
    queryFn: async () => {
      const { data: projects, error, count } = await supabase
        .from("blog_projects")
        .select("id, name, created_at", { count: "exact" })
        .eq("subaccount_id", subaccountId || "")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      
      return {
        totalCount: count || 0,
        recentProjects: (projects || []).map(p => ({
          id: p.id,
          name: p.name,
          articleCount: 0,
          createdAt: new Date(p.created_at),
        })) as RecentProject[],
      };
    },
    enabled: !!subaccountId,
  });

  // Fetch campaign metrics
  const { data: campaignData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaign-metrics', subaccountId],
    queryFn: async () => {
      const [campaignsResult, pagesResult] = await Promise.all([
        supabase.from("campaigns").select("id, status", { count: "exact" }).eq("subaccount_id", subaccountId || ""),
        supabase.from("campaign_pages").select("id, status", { count: "exact" }).eq("subaccount_id", subaccountId || ""),
      ]);

      const pages = pagesResult.data || [];
      const publishedPages = pages.filter((p: any) => p.status === "published").length;

      return {
        totalCampaigns: campaignsResult.count || 0,
        totalPages: pagesResult.count || 0,
        publishedPages,
        publishRate: pagesResult.count ? Math.round((publishedPages / pagesResult.count) * 100) : 0,
      };
    },
    enabled: !!subaccountId,
  });

  // Fetch WordPress connections
  const { data: wpConnections, isLoading: wpLoading } = useQuery({
    queryKey: ['wp-connections', subaccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wordpress_connections")
        .select("id, name, status, last_checked_at")
        .eq("subaccount_id", subaccountId || "");

      if (error) throw error;
      
      return (data || []).map(wp => ({
        id: wp.id,
        name: wp.name,
        status: wp.status,
        lastChecked: wp.last_checked_at ? new Date(wp.last_checked_at) : null,
      })) as WpConnection[];
    },
    enabled: !!subaccountId,
  });

  // Fetch article status breakdown from Airtable
  const { data: articleStats, isLoading: statsLoading } = useQuery({
    queryKey: ['article-stats', subaccountId],
    queryFn: async () => {
      const { data: subData } = await supabase
        .from("subaccounts")
        .select("airtable_base_id")
        .eq("id", subaccountId || "")
        .maybeSingle();

      if (!subData?.airtable_base_id) {
        return { published: 0, drafts: 0 };
      }

      const { data: articlesResponse } = await supabase.functions.invoke("fetch-airtable-articles", {
        body: { baseId: subData.airtable_base_id }
      });

      const articles = articlesResponse?.articles || [];
      const published = articles.filter((a: any) => 
        a.status?.toLowerCase() === "published"
      ).length;
      const drafts = articles.length - published;

      return { published, drafts };
    },
    enabled: !!subaccountId,
  });

  const loading = usage.isLoading || projectsLoading || statsLoading || campaignsLoading || wpLoading;

  const usedThisPeriod =
    usage.articlesUsedPeriod === 0 && usage.totalArticles > 0
      ? usage.totalArticles
      : usage.articlesUsedPeriod;

  const usagePercentage = usage.articleLimit > 0
    ? Math.min(100, (usedThisPeriod / usage.articleLimit) * 100)
    : 0;

  const formatPeriodEnd = () => {
    if (!usage.billingPeriodEnd) return "N/A";
    const date = new Date(usage.billingPeriodEnd);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getWpHealthStatus = (status: string): HealthStatus => {
    switch (status) {
      case "connected": return "healthy";
      case "error": return "error";
      case "disconnected": return "warning";
      default: return "pending";
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your content performance
        </p>
      </div>

      {/* Row 1: Content Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={projectsData?.totalCount || 0}
          icon={FolderKanban}
          description="Active content projects"
          href={`/subaccount/${subaccountId}/projects`}
        />
        <StatCard
          title="Total Articles"
          value={usage.totalArticles}
          icon={FileText}
          description="All-time articles created"
          href={`/subaccount/${subaccountId}/blogs`}
        />
        <StatCard
          title="Published"
          value={articleStats?.published || 0}
          icon={CheckCircle2}
          description="Live content"
        />
        <StatCard
          title="Used This Period"
          value={usedThisPeriod}
          icon={TrendingUp}
          description={`of ${usage.articleLimit} articles`}
        />
      </div>

      {/* Row 2: Campaign Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="pSEO Campaigns"
          value={campaignData?.totalCampaigns || 0}
          icon={Rocket}
          description="Active campaigns"
          href={`/subaccount/${subaccountId}/campaigns`}
        />
        <StatCard
          title="Pages Generated"
          value={campaignData?.totalPages || 0}
          icon={FileText}
          description="Total campaign pages"
        />
        <StatCard
          title="Pages Published"
          value={campaignData?.publishedPages || 0}
          icon={Globe}
          description="Live on your site"
        />
        <StatCard
          title="Publishing Rate"
          value={`${campaignData?.publishRate || 0}%`}
          icon={BarChart3}
          description="Published / Total"
        />
      </div>

      {/* Row 3: Usage & WordPress Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Usage This Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{usedThisPeriod} / {usage.articleLimit} articles</span>
              <span className="text-muted-foreground">Resets {formatPeriodEnd()}</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.max(0, usage.articleLimit - usedThisPeriod)} articles remaining this billing period
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{articleStats?.published || 0}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{articleStats?.drafts || 0}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              WordPress Connections
            </CardTitle>
            {wpConnections && wpConnections.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/subaccount/${subaccountId}/connections`)}
              >
                Manage
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!wpConnections || wpConnections.length === 0 ? (
              <div className="text-center py-6">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No WordPress sites connected yet
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/subaccount/${subaccountId}/connections`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect WordPress
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {wpConnections.map((wp) => (
                  <div key={wp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{wp.name}</p>
                      {wp.lastChecked && (
                        <p className="text-xs text-muted-foreground">
                          Last synced {formatDistanceToNow(wp.lastChecked, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <HealthIndicator 
                      status={getWpHealthStatus(wp.status)} 
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Quick Actions & Recent Projects */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate(`/subaccount/${subaccountId}/blogs`)}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Create Article</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate(`/subaccount/${subaccountId}/campaigns`)}
              >
                <Rocket className="h-5 w-5" />
                <span className="text-xs">New Campaign</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate(`/subaccount/${subaccountId}/projects`)}
              >
                <FolderKanban className="h-5 w-5" />
                <span className="text-xs">View Projects</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate(`/subaccount/${subaccountId}/connections`)}
              >
                <Globe className="h-5 w-5" />
                <span className="text-xs">Connections</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {(projectsData?.recentProjects?.length || 0) === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No projects yet. Create your first project to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {projectsData?.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-sm">{project.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {project.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
