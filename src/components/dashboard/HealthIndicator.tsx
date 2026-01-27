import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";

export type HealthStatus = "healthy" | "warning" | "error" | "pending";

interface HealthIndicatorProps {
  status: HealthStatus;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<HealthStatus, {
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  label: string;
}> = {
  healthy: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Healthy",
  },
  warning: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Warning",
  },
  error: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Error",
  },
  pending: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Pending",
  },
};

export function HealthIndicator({
  status,
  label,
  showIcon = true,
  size = "md",
}: HealthIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
      config.bgColor,
      size === "sm" ? "text-xs" : "text-sm"
    )}>
      {showIcon && (
        <Icon className={cn(
          config.color,
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
        )} />
      )}
      <span className={cn("font-medium", config.color)}>
        {displayLabel}
      </span>
    </div>
  );
}

// Simple dot indicator for tables
export function HealthDot({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, string> = {
    healthy: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    pending: "bg-blue-500",
  };

  return (
    <div className={cn("w-2.5 h-2.5 rounded-full", colors[status])} />
  );
}
