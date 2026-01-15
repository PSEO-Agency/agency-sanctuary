import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, FolderKanban, TrendingUp, Clock, CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useSubaccountUsage } from "@/hooks/useSubaccountUsage";

interface RecentProject {
  id: string;
  name: string;
  articleCount: number;
  createdAt: Date;
}

export default function SubaccountDashboard() {
  const { subaccountId } = useParams();
  
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
          articleCount: 0, // We'll skip individual counts for performance
          createdAt: new Date(p.created_at),
        })) as RecentProject[],
      };
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
      // Only count as "published" if actually published to CMS
      const published = articles.filter((a: any) => 
        a.status?.toLowerCase() === "published"
      ).length;
      // Everything else is a draft (including content ready, article ready, draft, etc.)
      const drafts = articles.length - published;

      return { published, drafts };
    },
    enabled: !!subaccountId,
  });

  const loading = usage.isLoading || projectsLoading || statsLoading;

  // Keep dashboard usage consistent with the counters used elsewhere.
  // If the DB-backed period counter isn't being incremented yet, fall back to actual article count.
  const usedThisPeriod =
    usage.articlesUsedPeriod === 0 && usage.totalArticles > 0
      ? usage.totalArticles
      : usage.articlesUsedPeriod;

  const usagePercentage = usage.articleLimit > 0
    ? Math.min(100, (usedThisPeriod / usage.articleLimit) * 100)
    : 0;

  // Format billing period end date
  const formatPeriodEnd = () => {
    if (!usage.billingPeriodEnd) return "N/A";
    const date = new Date(usage.billingPeriodEnd);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const statCards = [
    {
      title: "Total Projects",
      value: projectsData?.totalCount || 0,
      icon: FolderKanban,
      description: "Active content projects",
    },
    {
      title: "Total Articles",
      value: usage.totalArticles,
      icon: FileText,
      description: "All-time articles created",
    },
    {
      title: "Published",
      value: articleStats?.published || 0,
      icon: CheckCircle2,
      description: "Live or ready content",
    },
    {
      title: "Used This Period",
      value: usedThisPeriod,
      icon: TrendingUp,
      description: `of ${usage.articleLimit} articles`,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {(projectsData?.recentProjects?.length || 0) === 0 ? (
              <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
            ) : (
              <div className="space-y-4">
                {projectsData?.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{project.name}</p>
                      </div>
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
