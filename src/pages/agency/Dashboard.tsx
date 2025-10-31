import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AgencyDashboard() {
  const { agencyId } = useParams();
  const [stats, setStats] = useState({
    totalSubaccounts: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [agencyId]);

  const fetchStats = async () => {
    if (!agencyId) return;

    const [subaccounts, users] = await Promise.all([
      supabase.from("subaccounts").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
    ]);

    setStats({
      totalSubaccounts: subaccounts.count || 0,
      totalUsers: users.count || 0,
    });
  };

  const statCards = [
    {
      title: "Total Sub-accounts",
      value: stats.totalSubaccounts,
      icon: Database,
      description: "Active sub-accounts",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "Agency and sub-account users",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agency Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your agency and sub-accounts
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
