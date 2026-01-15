import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColumnConfig } from "./types";

interface TitlePatternInputProps {
  value: string;
  onChange: (value: string) => void;
  columns: ColumnConfig[];
  label?: string;
  placeholder?: string;
}

export function TitlePatternInput({
  value,
  onChange,
  columns,
  label = "Title Pattern",
  placeholder = "e.g., {{service}} in {{city}}",
}: TitlePatternInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(value.length);

  const insertPlaceholder = (columnId: string) => {
    const placeholder = `{{${columnId}}}`;
    const input = inputRef.current;
    
    if (input) {
      const start = input.selectionStart || cursorPosition;
      const end = input.selectionEnd || cursorPosition;
      const newValue = value.slice(0, start) + placeholder + value.slice(end);
      onChange(newValue);
      
      // Set cursor position after the inserted placeholder
      const newPosition = start + placeholder.length;
      setCursorPosition(newPosition);
      
      // Focus and set selection after state update
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // Fallback: append to end
      onChange(value + placeholder);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">
          Click variables below to insert
        </span>
      </div>
      
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onSelect={handleSelect}
        onClick={handleSelect}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      
      <div className="flex flex-wrap gap-2">
        {columns.map((col) => (
          <Button
            key={col.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs font-mono bg-primary/5 hover:bg-primary/10 border-primary/20"
            onClick={() => insertPlaceholder(col.id)}
          >
            {`{{${col.id}}}`}
          </Button>
        ))}
      </div>
      
      {value && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          <p className="text-sm font-medium">
            {value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
              const col = columns.find(c => c.id === key);
              return col ? `[${col.name}]` : `{{${key}}}`;
            })}
          </p>
        </div>
      )}
    </div>
  );
}
