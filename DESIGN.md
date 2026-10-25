# DESIGN.md — UI/UX Guidelines

## Target device
- Samsung Galaxy S23: 6.1" screen, 1080×2340 px, about **360×780 CSS px** viewport, Chrome on Android.
- Used one-handed, mid-set, possibly sweaty. Design for the **bottom 60% of the screen** (thumb zone).
- Respect safe areas (`env(safe-area-inset-*)`) and Android gesture navigation at the bottom.

## Visual style
- **Dark theme by default** (saves battery on the S23's AMOLED and suits gym lighting). Provide a light theme that follows `prefers-color-scheme`.
- Palette (dark):
  - Background `#0E0F12`, surface `#17191E`, raised surface `#20232A`
  - Text primary `#F2F3F5`, secondary `#A3A8B3`
  - Accent (actions, completed sets) `#FB7185` (rose; light theme `#BE123C`). The male version uses green `#4ADE80`.
  - Day colours: A `#60A5FA` (blue), B `#F59E0B` (amber), C `#C084FC` (violet)
  - Warning/deload `#FBBF24`, danger `#F87171`
- Typography: system font stack. Numbers (weights, reps, timer) use `font-variant-numeric: tabular-nums`.
  - Timer 56px bold, set inputs 22px, body 16px, labels 13px.
- Corners 12–16px, spacing on a 4px grid, minimal shadows (use surface colour steps instead).

## Interaction rules
- **Tap targets ≥ 48×48 px**; primary buttons 56px tall and full width.
- **Steppers instead of keyboards** for weight and reps: large − / + buttons. Tapping the number itself opens a numeric keypad (`inputmode="decimal"`) as a fallback.
  - Weight stepper snaps to the available dumbbell weights from Settings.
  - Reps stepper ±1.
- **Ticking a set** shows a green fill, a light haptic (`navigator.vibrate(30)`), and starts the timer. Long-press a completed set to edit it.
- **Undo** snackbar (5 s) after deleting a set or exercise.
- No hover-dependent UI. Swipe gestures are optional extras, never the only way to do something.
- Prefer bottom sheets for secondary content (exercise guide, technique tags, swap exercise).
- Destructive actions need confirmation. Finishing a session with incomplete sets asks: "3 sets not logged. Finish anyway?"

## Key layouts

### Active session: exercise card
```
┌──────────────────────────────────────┐
│ Bulgarian Split Squat          ⓘ    │
│ Quads · Glutes                       │
│ 3 × 8–12 /leg · 3-1-1-0 · 90s        │
│ Last: 18 kg × 12, 11, 10 @RIR2       │
│ [↑ Try 1.5 reps]  ← suggestion chip  │
├──────────────────────────────────────┤
│ 1  [− 18 kg +] [− 12 +] RIR[2]  [✓] │
│ 2  [− 18 kg +] [− 12 +] RIR[2]  [✓] │
│ 3  [− 18 kg +] [− 12 +] RIR[2]  [✓] │
│ + Add set        Techniques ▾        │
└──────────────────────────────────────┘
```
- Completed rows dim slightly with a green check. The current (first incomplete) row is highlighted.
- Auto-scroll the next exercise into view when all sets of the current one are done.

### Rest timer bar (sticky bottom)
```
┌──────────────────────────────────────┐
│  −15      1:12       +15     Skip    │
│  Next: Incline DB Press · Set 2      │
└──────────────────────────────────────┘
```
- A progress ring or bar fills as the time runs down. It pulses and vibrates at 0.

### Today screen
- Big day card coloured by day type (A/B/C), with exercise names listed.
- Deload banner above it when applicable.
- Start / Resume button pinned near the bottom.

## Charts
- Recharts, dark-themed, no animations longer than 300 ms, x-axis as dates, tap a point to see its value.
- Default range: last 12 weeks, with toggles for 4w / 12w / all.

## Icons & manifest
- Simple generic icon: a stylised dumbbell on a dark rounded square, with a maskable version.
- `name`: "Home Gym Tracker — Lady", `short_name`: "Lady Gym", `display`: "standalone", `orientation`: "portrait", `background_color`/`theme_color`: `#0E0F12`.
