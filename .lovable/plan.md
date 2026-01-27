

# Improve Content Machine Dialog Contrast

## Problem

The Content Machine dialog feels "hard to see" because:
1. The gradient (`blue → indigo → purple`) uses cool tones that blend into the dark slate background
2. The gradient overlay is at low opacity (20%)
3. No contrasting warm accent colors like pSEO Builder has with orange

## Solution

Update the Content Machine styling to create better visual separation and contrast while maintaining a distinct identity from pSEO Builder.

## Changes

### File: `src/components/ModeSwitchDialog.tsx`

Update the `content-machine` configuration in `modeConfig`:

| Property | Current | New |
|----------|---------|-----|
| `gradient` | `from-blue-500 via-indigo-500 to-purple-500` | `from-cyan-400 via-blue-500 to-indigo-600` |
| `iconBg` | `bg-gradient-to-br from-blue-400 to-indigo-600` | `bg-gradient-to-br from-cyan-400 to-blue-600` |

The new gradient introduces **cyan** as a bright, contrasting accent - similar to how pSEO uses orange to "break" the purple monotony.

### Additional Enhancements

1. **Increase gradient overlay opacity** for Content Machine specifically (from 20% to 30%)
2. **Add a cyan glow effect** in the top-right corner to match the warmer orange glow pSEO has
3. **Brighten the icon background** with more saturated cyan tones

### Visual Comparison

```text
Before (Content Machine):
┌─────────────────────────────┐
│  Dark slate + muted blue    │  ← Low contrast
│  Purple blends into bg      │
│  Feels washed out           │
└─────────────────────────────┘

After (Content Machine):
┌─────────────────────────────┐
│  Bright cyan accent         │  ← High contrast
│  Creates visual "pop"       │
│  Distinct identity          │
└─────────────────────────────┘
```

### Code Changes Summary

```tsx
// Lines 15-22 - Updated modeConfig for content-machine
"content-machine": {
  title: "Welcome to Content Machine",
  icon: FileText,
  description: "Create in-depth, AI-researched articles that rank...",
  gradient: "from-cyan-400 via-blue-500 to-indigo-600",  // Brighter with cyan
  iconBg: "bg-gradient-to-br from-cyan-400 to-blue-600", // Matching icon
  buttonText: "Start Writing",
},
```

Additionally, add mode-specific glow colors:
- For Content Machine: cyan glow (`bg-cyan-500/30`)
- Keep pSEO's orange/pink warmth

This creates visual parity between modes - each has a distinctive "accent break" color that stands out against the dark background.

