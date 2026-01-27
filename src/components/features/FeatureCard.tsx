import { format, isPast, isToday } from "date-fns";
import { Calendar, CheckCircle2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FeatureRequest } from "@/hooks/useFeatureBoard";
import { getCategoryColor } from "@/hooks/useFeatureBoard";

interface FeatureCardProps {
  feature: FeatureRequest;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 hover:bg-slate-100",
  medium: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  high: "bg-red-100 text-red-700 hover:bg-red-100",
};

export function FeatureCard({
  feature,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: FeatureCardProps) {
  const deadline = feature.deadline ? new Date(feature.deadline) : null;
  const isOverdue = deadline && isPast(deadline) && !isToday(deadline);

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group",
        isDragging && "opacity-50 rotate-2 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate">
            {feature.title}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {feature.category && (
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", getCategoryColor(feature.category))}
              >
                {feature.category}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", priorityColors[feature.priority])}
            >
              {feature.priority}
            </Badge>
            {deadline && (
              <span
                className={cn(
                  "text-[10px] flex items-center gap-1",
                  isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(deadline, "MMM d")}
              </span>
            )}
            {feature.implemented_at && (
              <span className="text-[10px] flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                {format(new Date(feature.implemented_at), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
