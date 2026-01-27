import { Check, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Entity } from "./types";
import { cn } from "@/lib/utils";

interface EntitySelectorProps {
  entities: Entity[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string) => void;
  onCreateEntity?: (entity: Entity) => void;
  pagesPerEntity?: Record<string, number>;
  completedEntities?: string[];
  mode?: "dropdown" | "progress-bar";
  className?: string;
}

export function EntitySelector({
  entities,
  selectedEntityId,
  onSelectEntity,
  onCreateEntity,
  pagesPerEntity = {},
  completedEntities = [],
  mode = "dropdown",
  className,
}: EntitySelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityUrlPrefix, setNewEntityUrlPrefix] = useState("");

  const handleCreateEntity = () => {
    if (!newEntityName.trim()) return;

    const urlPrefix = newEntityUrlPrefix.trim() || 
      `/${newEntityName.toLowerCase().replace(/\s+/g, "-")}/`;

    const newEntity: Entity = {
      id: `ent-${Date.now()}`,
      name: newEntityName.trim(),
      urlPrefix,
    };

    onCreateEntity?.(newEntity);
    setNewEntityName("");
    setNewEntityUrlPrefix("");
    setIsCreateDialogOpen(false);
  };

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  if (mode === "progress-bar") {
    return (
      <div className={cn("flex items-center gap-2 overflow-x-auto pb-2", className)}>
        {entities.map((entity) => {
          const isSelected = entity.id === selectedEntityId;
          const isCompleted = completedEntities.includes(entity.id);
          const pageCount = pagesPerEntity[entity.id] || 0;

          return (
            <button
              key={entity.id}
              onClick={() => onSelectEntity(entity.id)}
              className={cn(
                "flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[140px]",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/30 bg-background"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Tags className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm truncate">{entity.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  {entity.urlPrefix}
                </span>
                {isCompleted ? (
                  <Badge variant="outline" className="h-5 text-xs bg-green-50 text-green-600 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </Badge>
                ) : isSelected ? (
                  <Badge variant="outline" className="h-5 text-xs bg-primary/10 text-primary border-primary/20">
                    Current
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {pageCount} pages
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {onCreateEntity && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-shrink-0 h-auto py-3 px-4 border-dashed min-w-[100px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Entity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Entity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Entity Name</Label>
                  <Input
                    placeholder="e.g., Services, Cities, Products"
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Prefix</Label>
                  <Input
                    placeholder="/services/"
                    value={newEntityUrlPrefix}
                    onChange={(e) => setNewEntityUrlPrefix(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to auto-generate from name
                  </p>
                </div>
                <Button onClick={handleCreateEntity} className="w-full">
                  Create Entity
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Dropdown mode
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Tags className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedEntityId || ""} onValueChange={onSelectEntity}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select entity...">
            {selectedEntity && (
              <span className="flex items-center gap-2">
                <span>{selectedEntity.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({pagesPerEntity[selectedEntity.id] || 0})
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span>{entity.name}</span>
                <span className="text-xs text-muted-foreground">
                  {pagesPerEntity[entity.id] || 0} pages
                </span>
              </div>
            </SelectItem>
          ))}
          {entities.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No entities created yet
            </div>
          )}
        </SelectContent>
      </Select>

      {onCreateEntity && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Entity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Entity Name</Label>
                <Input
                  placeholder="e.g., Services, Cities, Products"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>URL Prefix</Label>
                <Input
                  placeholder="/services/"
                  value={newEntityUrlPrefix}
                  onChange={(e) => setNewEntityUrlPrefix(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-generate from name
                </p>
              </div>
              <Button onClick={handleCreateEntity} className="w-full">
                Create Entity
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Utility to suggest an entity from a pattern
export function suggestEntityFromPattern(
  pattern: string,
  urlPrefix: string,
  entities: Entity[]
): Entity | null {
  const match = pattern.match(/\{\{(\w+)\}\}/);
  if (match) {
    const varName = match[1];

    // Check if an entity already uses this variable
    const existing = entities.find((e) => e.variableHint === varName);
    if (existing) return existing;

    // Suggest new entity
    const name = varName.charAt(0).toUpperCase() + varName.slice(1);
    return {
      id: `ent-${Date.now()}`,
      name,
      urlPrefix: urlPrefix || `/${varName.toLowerCase()}/`,
      variableHint: varName,
    };
  }
  return null;
}
