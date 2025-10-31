import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, FolderKanban, TrendingUp } from "lucide-react";

export default function SubaccountDashboard() {
  const stats = [
    {
      title: "Total Campaigns",
      value: "12",
      icon: FolderKanban,
      change: "+2 this month",
    },
    {
      title: "Pages Generated",
      value: "456",
      icon: FileText,
      change: "+23% from last month",
    },
    {
      title: "Total Clicks",
      value: "8.3k",
      icon: TrendingUp,
      change: "+12% from last month",
    },
    {
      title: "Active Reports",
      value: "8",
      icon: BarChart3,
      change: "+1 this week",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your PSEO Builder dashboard
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No campaigns yet. Create your first campaign to get started.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Quick action shortcuts will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
