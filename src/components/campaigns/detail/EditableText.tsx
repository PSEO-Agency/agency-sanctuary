import { useState, useRef, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface EditableTextProps {
  value: string; // Raw value with placeholders like {{service}} or prompt(...)
  displayValue: string; // Resolved value for display
  onSave: (value: string) => void;
  availableVariables: string[];
  multiline?: boolean;
  className?: string;
  textClassName?: string;
}

// Get invalid variables that don't exist in available variables
function getInvalidVariables(text: string, availableVariables: string[]): string[] {
  // Extract variables from regular placeholders AND from inside prompt()
  const allText = text;
  const placeholders = allText.match(/\{\{(\w+)\}\}/g) || [];
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
  const [showVariables, setShowVariables] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const originalValue = useRef(value);

  useEffect(() => {
    setEditValue(value);
    originalValue.current = value;
  }, [value]);

  // Focus and select when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    originalValue.current = value;
    setInvalidVars([]);
  };

  const validateAndUpdate = useCallback((newValue: string) => {
    const invalid = getInvalidVariables(newValue, availableVariables);
    setInvalidVars(invalid);
    return invalid.length === 0;
  }, [availableVariables]);

  const handleSave = useCallback(() => {
    if (invalidVars.length === 0 && editValue !== originalValue.current) {
      onSave(editValue);
    }
    setIsEditing(false);
    setShowVariables(false);
  }, [editValue, invalidVars.length, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(originalValue.current);
    setIsEditing(false);
    setInvalidVars([]);
    setShowVariables(false);
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.textContent || "";
    setEditValue(newValue);
    validateAndUpdate(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't save if clicking on the variables popup
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-variables-popup]')) {
      return;
    }
    handleSave();
  };

  const insertVariable = (varName: string) => {
    const placeholder = `{{${varName}}}`;
    const newValue = editValue + placeholder;
    setEditValue(newValue);
    
    if (editableRef.current) {
      editableRef.current.textContent = newValue;
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editableRef.current.focus();
    }
    
    validateAndUpdate(newValue);
    setShowVariables(false);
  };

  if (isEditing) {
    return (
      <span 
        className={cn("inline relative group/editing", className)} 
        onClick={(e) => e.stopPropagation()}
      >
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            "outline-none border-b-2 border-primary bg-primary/5 px-1 -mx-1 rounded-sm",
            "focus:bg-primary/10 transition-colors",
            invalidVars.length > 0 && "border-destructive bg-destructive/5",
            textClassName
          )}
        >
          {editValue}
        </span>
        
        {/* Variables button */}
        <Popover open={showVariables} onOpenChange={setShowVariables}>
          <PopoverTrigger asChild>
            <button
              data-variables-popup
              className="inline-flex items-center justify-center w-5 h-5 ml-1 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors align-middle"
              onClick={(e) => {
                e.stopPropagation();
                setShowVariables(!showVariables);
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            data-variables-popup
            className="w-48 p-2" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Insert Variable
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableVariables.map((varName) => (
                <Button
                  key={varName}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs font-mono"
                  onClick={() => insertVariable(varName)}
                >
                  {`{{${varName}}}`}
                </Button>
              ))}
              {availableVariables.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No variables available</p>
              )}
            </div>
            <div className="border-t mt-2 pt-2">
              <p className="text-[10px] text-muted-foreground">
                Tip: Use prompt(...) for AI-generated content
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {/* Error indicator */}
        {invalidVars.length > 0 && (
          <span className="absolute -bottom-5 left-0 text-[10px] text-destructive whitespace-nowrap">
            Invalid: {invalidVars.join(", ")}
          </span>
        )}
      </span>
    );
  }

  return (
    <span 
      className={cn(
        "inline cursor-pointer hover:bg-primary/10 rounded px-1 -mx-1 transition-colors border-b border-transparent hover:border-primary/30",
        textClassName
      )}
      onClick={handleStartEdit}
    >
      {displayValue}
    </span>
  );
}