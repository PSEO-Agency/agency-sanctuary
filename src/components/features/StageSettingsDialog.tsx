import { useState } from "react";
import { Plus, GripVertical, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FeatureStage } from "@/hooks/useFeatureBoard";

const PASTEL_COLORS = [
  { name: "Slate", value: "#f1f5f9" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Amber", value: "#fef3c7" },
  { name: "Green", value: "#dcfce7" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Purple", value: "#f3e8ff" },
  { name: "Cyan", value: "#cffafe" },
  { name: "Orange", value: "#ffedd5" },
];

interface StageSettingsDialogProps {
  stages: FeatureStage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (stage: Partial<FeatureStage>) => void;
  onUpdate: (stage: Partial<FeatureStage> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export function StageSettingsDialog({
  stages,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: StageSettingsDialogProps) {
  const [newStageName, setNewStageName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = () => {
    if (!newStageName.trim()) return;
    onCreate({ name: newStageName.trim(), color: "#e2e8f0" });
    setNewStageName("");
  };

  const handleStartEdit = (stage: FeatureStage) => {
    setEditingId(stage.id);
    setEditingName(stage.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    onUpdate({ id: editingId, name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  };

  const handleColorChange = (stageId: string, color: string) => {
    onUpdate({ id: stageId, color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Stages</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 p-2 rounded-lg border bg-card"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-4 gap-1">
                    {PASTEL_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110",
                          stage.color === color.value
                            ? "border-primary"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handleColorChange(stage.id, color.value)}
                        title={color.name}
                      >
                        {stage.color === color.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {editingId === stage.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="h-8 flex-1"
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 text-sm font-medium cursor-pointer hover:text-primary"
                  onClick={() => handleStartEdit(stage)}
                >
                  {stage.name}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(stage.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="New stage name..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={!newStageName.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
