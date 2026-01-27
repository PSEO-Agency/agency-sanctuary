import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HealthDot, HealthStatus } from "./HealthIndicator";
import { formatDistanceToNow } from "date-fns";

export interface SubaccountHealth {
  id: string;
  name: string;
  planName: string;
  articlesUsed: number;
  articleLimit: number;
  wpStatus: HealthStatus;
  lastActivity: Date | null;
}

interface SubaccountHealthTableProps {
  subaccounts: SubaccountHealth[];
  title?: string;
}

export function SubaccountHealthTable({
  subaccounts,
  title = "Subaccount Health Overview",
}: SubaccountHealthTableProps) {
  if (subaccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No subaccounts found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Article Usage</TableHead>
              <TableHead className="text-center">WordPress</TableHead>
              <TableHead className="text-right">Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subaccounts.map((sub) => {
              const usagePercent = sub.articleLimit > 0 
                ? (sub.articlesUsed / sub.articleLimit) * 100 
                : 0;
              const usageStatus: HealthStatus = 
                usagePercent >= 90 ? "error" : 
                usagePercent >= 70 ? "warning" : "healthy";

              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell>
                    <span className={
                      sub.planName === "Pro" 
                        ? "text-primary font-medium" 
                        : "text-muted-foreground"
                    }>
                      {sub.planName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={usagePercent} 
                          className="h-2 flex-1 max-w-[100px]"
                        />
                        <span className="text-xs text-muted-foreground w-16">
                          {sub.articlesUsed}/{sub.articleLimit}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <HealthDot status={sub.wpStatus} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {sub.lastActivity 
                      ? formatDistanceToNow(sub.lastActivity, { addSuffix: true })
                      : "Never"
                    }
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
