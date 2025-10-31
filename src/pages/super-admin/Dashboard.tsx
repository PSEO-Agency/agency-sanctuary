import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalAgencies: 0,
    totalSubaccounts: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [agencies, subaccounts, users] = await Promise.all([
      supabase.from("agencies").select("id", { count: "exact", head: true }),
      supabase.from("subaccounts").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalAgencies: agencies.count || 0,
      totalSubaccounts: subaccounts.count || 0,
      totalUsers: users.count || 0,
    });
  };

  const statCards = [
    {
      title: "Total Agencies",
      value: stats.totalAgencies,
      icon: Building2,
      description: "Active agencies in the system",
    },
    {
      title: "Total Sub-accounts",
      value: stats.totalSubaccounts,
      icon: Database,
      description: "Across all agencies",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "All system users",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          System-wide overview and management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
    </div>
  );
}
