import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FeatureCard } from "./FeatureCard";
import { FeatureDetailDialog } from "./FeatureDetailDialog";
import type { FeatureRequest, FeatureStage } from "@/hooks/useFeatureBoard";

interface FeatureKanbanBoardProps {
  stages: FeatureStage[];
  features: FeatureRequest[];
  onCreateFeature: (feature: Partial<FeatureRequest>) => void;
  onUpdateFeature: (feature: Partial<FeatureRequest> & { id: string }) => void;
  onDeleteFeature: (id: string) => void;
  onMoveFeature: (params: {
    featureId: string;
    targetStageId: string;
    targetPosition?: number;
  }) => void;
}

export function FeatureKanbanBoard({
  stages,
  features,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature,
  onMoveFeature,
}: FeatureKanbanBoardProps) {
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
  const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(null);
  const [quickAddStageId, setQuickAddStageId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<FeatureRequest | null>(null);

  // Features are already sorted by parent component
  const getStageFeatures = (stageId: string) =>
    features.filter((f) => f.stage_id === stageId);

  const handleDragStart = (e: React.DragEvent, featureId: string) => {
    e.dataTransfer.setData("featureId", featureId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedFeatureId(featureId);
  };

  const handleDragEnd = () => {
    setDraggedFeatureId(null);
    setDropTargetStageId(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetStageId(stageId);
  };

  const handleDragLeave = () => {
    setDropTargetStageId(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const featureId = e.dataTransfer.getData("featureId");
    if (featureId) {
      onMoveFeature({ featureId, targetStageId: stageId });
    }
    setDraggedFeatureId(null);
    setDropTargetStageId(null);
  };

  const handleQuickAdd = (stageId: string) => {
    if (!quickAddTitle.trim()) {
      setQuickAddStageId(null);
      return;
    }
    onCreateFeature({ title: quickAddTitle.trim(), stage_id: stageId });
    setQuickAddTitle("");
    setQuickAddStageId(null);
  };

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-1 pb-4 min-h-[calc(100vh-200px)]">
          {stages.map((stage) => {
            const stageFeatures = getStageFeatures(stage.id);
            const isDropTarget = dropTargetStageId === stage.id;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex-shrink-0 w-72 rounded-xl transition-all",
                  isDropTarget && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ backgroundColor: stage.color }}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-gray-700">
                      {stage.name}
                    </h3>
                    <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                      {stageFeatures.length}
                    </span>
                  </div>

                  <div className="space-y-2 min-h-[100px]">
                    {stageFeatures.map((feature) => (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        onClick={() => setSelectedFeature(feature)}
                        onDragStart={(e) => handleDragStart(e, feature.id)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedFeatureId === feature.id}
                      />
                    ))}
                  </div>

                  {quickAddStageId === stage.id ? (
                    <div className="mt-2">
                      <Input
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        placeholder="Feature title..."
                        onBlur={() => handleQuickAdd(stage.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleQuickAdd(stage.id);
                          if (e.key === "Escape") {
                            setQuickAddStageId(null);
                            setQuickAddTitle("");
                          }
                        }}
                        autoFocus
                        className="bg-white/80"
                      />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-gray-600 hover:bg-white/50"
                      onClick={() => setQuickAddStageId(stage.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add card
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <FeatureDetailDialog
        feature={selectedFeature}
        stages={stages}
        open={!!selectedFeature}
        onOpenChange={(open) => !open && setSelectedFeature(null)}
        onSave={onUpdateFeature}
        onDelete={onDeleteFeature}
      />
    </>
  );
}
