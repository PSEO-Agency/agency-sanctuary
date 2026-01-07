import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, FolderKanban, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalProjects: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  articlesThisMonth: number;
  articlesUsed: number;
  articleLimit: number;
}

interface RecentProject {
  id: string;
  name: string;
  articleCount: number;
  createdAt: Date;
}

export default function SubaccountDashboard() {
  const { subaccountId } = useParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subaccountId) {
      fetchDashboardData();
    }
  }, [subaccountId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch project count
      const { count: projectCount } = await supabase
        .from("blog_projects")
        .select("*", { count: "exact", head: true })
        .eq("subaccount_id", subaccountId);

      // Fetch all articles for this subaccount
      const { data: articles, count: totalArticleCount } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact" })
        .eq("subaccount_id", subaccountId);

      // Calculate article stats
      const publishedCount = articles?.filter(a => a.status === "published").length || 0;
      const draftCount = articles?.filter(a => a.status === "draft").length || 0;

      // Articles created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const articlesThisMonth = articles?.filter(a => 
        new Date(a.created_at) >= startOfMonth
      ).length || 0;

      // Fetch subscription data for limits
      const { data: subscription } = await supabase
        .from("subaccount_subscriptions")
        .select(`
          articles_used,
          plan_id,
          subscription_plans (
            article_limit
          )
        `)
        .eq("subaccount_id", subaccountId)
        .maybeSingle();

      const articleLimit = (subscription?.subscription_plans as any)?.article_limit || 10;

      // Fetch recent projects with article counts
      const { data: projects } = await supabase
        .from("blog_projects")
        .select("id, name, created_at")
        .eq("subaccount_id", subaccountId)
        .order("created_at", { ascending: false })
        .limit(5);

      const projectsWithCounts: RecentProject[] = [];
      if (projects) {
        for (const project of projects) {
          const { count } = await supabase
            .from("blog_posts")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          projectsWithCounts.push({
            id: project.id,
            name: project.name,
            articleCount: count || 0,
            createdAt: new Date(project.created_at),
          });
        }
      }

      setStats({
        totalProjects: projectCount || 0,
        totalArticles: totalArticleCount || 0,
        publishedArticles: publishedCount,
        draftArticles: draftCount,
        articlesThisMonth,
        articlesUsed: totalArticleCount || 0,
        articleLimit,
      });

      setRecentProjects(projectsWithCounts);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Projects",
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      description: "Active content projects",
    },
    {
      title: "Total Articles",
      value: stats?.totalArticles || 0,
      icon: FileText,
      description: `${stats?.articlesUsed || 0}/${stats?.articleLimit || 10} used this period`,
    },
    {
      title: "Published",
      value: stats?.publishedArticles || 0,
      icon: CheckCircle2,
      description: "Live on your site",
    },
    {
      title: "This Month",
      value: stats?.articlesThisMonth || 0,
      icon: TrendingUp,
      description: "Articles created",
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
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.articleCount} articles
                        </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Usage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Articles Used</span>
                  <span className="font-medium">{stats?.articlesUsed || 0} / {stats?.articleLimit || 10}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((stats?.articlesUsed || 0) / (stats?.articleLimit || 10)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats?.publishedArticles || 0}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.draftArticles || 0}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
