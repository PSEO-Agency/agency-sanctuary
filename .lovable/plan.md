
# Plan: Change AI Template Validation Logic

## Overview
Modify the AI Template Generator's validation to:
1. Make unused variables purely informational (not a warning)
2. Block progress only when a section has empty/missing content

## Changes to Make

### File: `src/components/campaigns/steps/AITemplateGeneratorDialog.tsx`

#### 1. Update `getSectionWarnings` function to remove variable usage warnings
Remove the warning about unused variables since the user only wants to use some of their variables:

```typescript
// REMOVE these lines (511-519):
if (!hasVariable && selectedVars.length > 0) {
  const hasAnyVariable = Object.values(content).some(v => 
    /\{\{\w+\}\}/.test(String(Array.isArray(v) ? v.join('') : v))
  );
  if (!hasAnyVariable) {
    warnings.push("No variables used in this section");
  }
}
```

Keep only the empty section check at lines 499-502 which warns when a section has no content.

#### 2. Update Variable Usage Summary UI (lines 745-749)
Change the warning message to be informational rather than alarming:

**Before:**
```tsx
{variableUsageSummary.some(v => v.usedIn === 0) && (
  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
    <AlertCircle className="h-3 w-3" />
    Some variables are not used. You can edit sections below to add them, or regenerate.
  </p>
)}
```

**After:**
```tsx
{variableUsageSummary.some(v => v.usedIn === 0) && (
  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
    Some variables are not used in this template. This is fine if intentional.
  </p>
)}
```

#### 3. Change unused variable icons (lines 737-741)
Make the unused variable indicator less alarming by using a neutral icon instead of warning:

**Before:**
```tsx
{usedIn > 0 ? (
  <Check className="h-4 w-4 text-green-500 shrink-0" />
) : (
  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
)}
```

**After:**
```tsx
{usedIn > 0 && (
  <Check className="h-4 w-4 text-green-500 shrink-0" />
)}
```

(Simply remove the warning icon for unused variables)

#### 4. Add actual blocking for empty sections
Modify `handleApprove` function to check for sections with no content:

```typescript
const handleApprove = () => {
  const currentTemplate = generatedTemplates[currentEntity?.id];
  
  if (currentTemplate) {
    // Check for empty sections - block progress if any section has no content
    const emptySections = currentTemplate.sections.filter(
      s => !s.content || Object.keys(s.content).length === 0 ||
        Object.values(s.content).every(v => 
          v === "" || (Array.isArray(v) && v.length === 0)
        )
    );
    
    if (emptySections.length > 0) {
      toast.error(`Cannot proceed: ${emptySections.length} section(s) have no content. Please edit or remove empty sections.`);
      return;
    }
    
    // ... rest of existing logic
  }
};
```

#### 5. Add a "Remove Section" button for truly empty sections
Allow users to remove problematic empty sections instead of being stuck.

## Summary of Behavior Changes

| Scenario | Before | After |
|----------|--------|-------|
| Variable not used | ⚠️ Warning icon + amber message | ✓ Neutral text only |
| Empty section | ⚠️ Warning only (non-blocking) | 🚫 Blocks "Approve" + toast error |
| Partially used variables | Appears broken | Clear messaging that it's intentional |

## Technical Notes
- The variable selection step before generation is unchanged - users still select which variables they want to use
- The empty section check uses strict validation: checks for empty object OR all empty values
- Adding section removal capability ensures users aren't stuck with AI-generated empty sections
