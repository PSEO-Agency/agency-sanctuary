import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string; // Raw value with placeholders like {{service}}
  displayValue: string; // Resolved value for display
  onSave: (value: string) => void;
  availableVariables: string[];
  multiline?: boolean;
  className?: string;
  textClassName?: string;
}

// Get invalid variables that don't exist in available variables
function getInvalidVariables(text: string, availableVariables: string[]): string[] {
  const placeholders = text.match(/\{\{(\w+)\}\}/g) || [];
  const invalid: string[] = [];
  
  const normalizedKeys = availableVariables.map(k => k.toLowerCase());
  
  // Simple singular/plural handling
  const toSingular = (k: string) => {
    if (k.endsWith("ies") && k.length > 3) return k.slice(0, -3) + "y";
    if (k.endsWith("s") && !k.endsWith("ss") && k.length > 1) return k.slice(0, -1);
    return k;
  };
  
  const toPlural = (k: string) => {
    if (k.endsWith("y")) return k.slice(0, -1) + "ies";
    return k + "s";
  };
  
  for (const ph of placeholders) {
    const key = ph.replace(/\{\{|\}\}/g, "").toLowerCase();
    const singular = toSingular(key);
    const plural = toPlural(key);
    
    const isValid = normalizedKeys.includes(key) || 
                    normalizedKeys.includes(singular) || 
                    normalizedKeys.includes(plural);
    
    if (!isValid) {
      invalid.push(ph);
    }
  }
  
  return invalid;
}

export function EditableText({
  value,
  displayValue,
  onSave,
  availableVariables,
  multiline = false,
  className,
  textClassName,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [invalidVars, setInvalidVars] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(value);
    setInvalidVars([]);
  };

  const handleChange = (newValue: string) => {
    setEditValue(newValue);
    const invalid = getInvalidVariables(newValue, availableVariables);
    setInvalidVars(invalid);
  };

  const handleSave = () => {
    if (invalidVars.length === 0) {
      onSave(editValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setInvalidVars([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("inline-block w-full", className)} onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] text-sm bg-white text-gray-900"
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm bg-white text-gray-900"
            />
          )}
          
          {invalidVars.length > 0 && (
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              ❌ Invalid variable: {invalidVars.join(", ")}
            </div>
          )}
          
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCancel}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={invalidVars.length > 0}
              className="h-7 px-2"
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span 
      className={cn(
        "group/editable inline cursor-pointer hover:bg-primary/10 rounded px-1 -mx-1 transition-colors",
        textClassName
      )}
      onClick={handleStartEdit}
    >
      {displayValue}
      <Pencil className="inline-block ml-1 h-3 w-3 opacity-0 group-hover/editable:opacity-50 transition-opacity" />
    </span>
  );
}
