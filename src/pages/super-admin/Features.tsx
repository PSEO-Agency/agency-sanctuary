import { useState, useMemo } from "react";
import { Plus, Settings2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFeatureBoard, FEATURE_CATEGORIES } from "@/hooks/useFeatureBoard";
import { FeatureKanbanBoard } from "@/components/features/FeatureKanbanBoard";
import { StageSettingsDialog } from "@/components/features/StageSettingsDialog";
import { FeatureDetailDialog } from "@/components/features/FeatureDetailDialog";
import { toast } from "@/hooks/use-toast";
import type { FeatureRequest } from "@/hooks/useFeatureBoard";

export default function Features() {
  const {
    stages,
    features,
    isLoading,
    createFeature,
    updateFeature,
    deleteFeature,
    moveFeature,
    createStage,
    updateStage,
    deleteStage,
  } = useFeatureBoard();

  const [showStageSettings, setShowStageSettings] = useState(false);
  const [showNewFeatureDialog, setShowNewFeatureDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let result = [...features];

    // Filter by category
    if (categoryFilter !== "all") {
      result = result.filter((f) => f.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query)
      );
    }

    // Sort: implemented_at descending (most recent first), then position descending
    result.sort((a, b) => {
      const dateA = a.implemented_at ? new Date(a.implemented_at).getTime() : 0;
      const dateB = b.implemented_at ? new Date(b.implemented_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return b.position - a.position;
    });

    return result;
  }, [features, categoryFilter, searchQuery]);

  const handleCreateFeature = async (feature: Partial<FeatureRequest>) => {
    try {
      await createFeature.mutateAsync({
        ...feature,
        stage_id: feature.stage_id || stages[0]?.id,
      });
      toast({ title: "Feature created" });
    } catch {
      toast({ title: "Failed to create feature", variant: "destructive" });
    }
  };

  const handleUpdateFeature = async (
    feature: Partial<FeatureRequest> & { id: string }
  ) => {
    try {
      await updateFeature.mutateAsync(feature);
      toast({ title: "Feature updated" });
    } catch {
      toast({ title: "Failed to update feature", variant: "destructive" });
    }
  };

  const handleDeleteFeature = async (id: string) => {
    try {
      await deleteFeature.mutateAsync(id);
      toast({ title: "Feature deleted" });
    } catch {
      toast({ title: "Failed to delete feature", variant: "destructive" });
    }
  };

  const handleMoveFeature = async (params: {
    featureId: string;
    targetStageId: string;
  }) => {
    try {
      await moveFeature.mutateAsync(params);
    } catch {
      toast({ title: "Failed to move feature", variant: "destructive" });
    }
  };

  // New feature placeholder for the dialog
  const newFeaturePlaceholder: FeatureRequest = {
    id: "new",
    title: "",
    description: null,
    stage_id: stages[0]?.id || null,
    position: 0,
    deadline: null,
    priority: "medium",
    category: null,
    implemented_at: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roadmap</h1>
          <p className="text-muted-foreground">
            Track and manage platform features
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowStageSettings(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Stages
          </Button>
          <Button onClick={() => setShowNewFeatureDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">View All</SelectItem>
            {FEATURE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features..."
            className="pl-9 w-[220px]"
          />
        </div>
      </div>

      <FeatureKanbanBoard
        stages={stages}
        features={filteredFeatures}
        onCreateFeature={handleCreateFeature}
        onUpdateFeature={handleUpdateFeature}
        onDeleteFeature={handleDeleteFeature}
        onMoveFeature={handleMoveFeature}
      />

      <StageSettingsDialog
        stages={stages}
        open={showStageSettings}
        onOpenChange={setShowStageSettings}
        onCreate={(stage) => createStage.mutateAsync(stage)}
        onUpdate={(stage) => updateStage.mutateAsync(stage)}
        onDelete={(id) => deleteStage.mutateAsync(id)}
      />

      <FeatureDetailDialog
        feature={showNewFeatureDialog ? newFeaturePlaceholder : null}
        stages={stages}
        open={showNewFeatureDialog}
        onOpenChange={setShowNewFeatureDialog}
        onSave={(feature) => {
          const { id, ...rest } = feature;
          handleCreateFeature(rest);
          setShowNewFeatureDialog(false);
        }}
        onDelete={() => setShowNewFeatureDialog(false)}
      />
    </div>
  );
}
