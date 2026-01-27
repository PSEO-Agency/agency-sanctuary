import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AudienceLevel } from "@/hooks/useAnnouncements";

interface AudienceSelectorProps {
  value: AudienceLevel[];
  onChange: (value: AudienceLevel[]) => void;
}

const AUDIENCE_OPTIONS: { value: AudienceLevel; label: string; description: string; color: string }[] = [
  { 
    value: "country_partner", 
    label: "Country Partners", 
    description: "Partner-level announcements",
    color: "bg-orange-500"
  },
  { 
    value: "agency", 
    label: "Agencies", 
    description: "Agency-level announcements",
    color: "bg-blue-500"
  },
  { 
    value: "subaccount", 
    label: "Subaccounts", 
    description: "Account-level announcements",
    color: "bg-purple-500"
  },
];

export function AudienceSelector({ value, onChange }: AudienceSelectorProps) {
  const toggleAudience = (audience: AudienceLevel) => {
    if (value.includes(audience)) {
      onChange(value.filter(a => a !== audience));
    } else {
      onChange([...value, audience]);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Target Audience</Label>
      <div className="grid gap-2">
        {AUDIENCE_OPTIONS.map(option => (
          <label
            key={option.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
              value.includes(option.value) 
                ? "border-primary bg-primary/5" 
                : "border-border hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={value.includes(option.value)}
              onCheckedChange={() => toggleAudience(option.value)}
            />
            <div className={cn("w-3 h-3 rounded-full", option.color)} />
            <div className="flex-1">
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-destructive">Select at least one audience</p>
      )}
    </div>
  );
}
