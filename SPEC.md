# SPEC.md — Product Requirements

## 1. User & context
- One user (lady version): 29 y/o, 62 kg, 160 cm, training at home 3×/week (Mon/Wed/Fri suggested, any non-consecutive days allowed). **No heavy lifting:** dumbbells capped at 10 kg per hand, higher reps, RIR 2–3, never to failure.
- Equipment: power rack with pull-up bar, 20 kg adjustable dumbbell set (≈10 kg per hand as a pair, ≈18–20 kg on a single handle), adjustable bench, light (yellow) resistance band. The lady program uses the dumbbells at 2–10 kg per hand only.
- Used mid-workout on a phone: sweaty hands, short attention, between sets. Speed of logging matters more than anything.

## 2. Screens

### 2.1 Today (home)
- Shows **next workout** in rotation (A → B → C → A…), its name and focus, and estimated duration.
- Shows **training week number** and a **DELOAD WEEK** banner when applicable (§5.3).
- Primary button: **Start Workout**. Secondary: "Choose a different day" (pick A/B/C manually).
- If an unfinished session exists: show **Resume Workout** instead (with started time).
- Small stats strip: sessions this week (x/3), current streak in weeks, last session date.

### 2.2 Warm-up
- Checklist of the 6 warm-up items from `PROGRAM.md`, each tappable to tick.
- Optional 4-minute countdown.
- "Skip" and "Done → Start Lifting" buttons.

### 2.3 Active session
- Vertical list of exercise cards in program order. Supersets are visually grouped and alternate (A1, B1, A2, B2…).
- Each card shows: name, target muscles, prescription (`3 × 10–12 / leg · Tempo 3-1-1-0 · Rest 90s`), a **"Last time"** line (e.g. `12.5 kg × 12, 12, 11 @ RIR 2`), and a **progression suggestion chip** if one applies (§5.2).
- Each card has one row per prescribed set. A row has:
  - Weight (kg) stepper, prefilled from last session's same set (or blank first time)
  - Reps stepper, prefilled with the top of the rep range
  - RIR selector (0, 1, 2, 3, 4+), default 2
  - Tick button → marks set complete, saves instantly, starts the rest timer
- For `perSide` exercises: one row per set, with reps meaning reps per side (no separate left/right rows), plus an optional "uneven sides" note.
- For `loadType: "bodyweight"` or `"assisted"`: weight field shows "BW" and an optional "+kg" (added) or "Band assist" toggle.
- Per-set "technique" multi-select tags: `tempo`, `pause`, `1.5 reps`, `unilateral`, `drop set`, `band`, `rest-pause`, `partials`.
- **Add set** / **Remove set** per exercise. **Swap exercise** lets you pick any other seeded exercise in the same movement pattern.
- Tap exercise name → Exercise Guide sheet (§2.5).
- Session notes field and optional bodyweight field at the bottom.
- **Finish Workout** → summary screen.

### 2.4 Rest timer
- Starts automatically when a set is ticked, using that exercise's `restSec`.
- Sticky bottom bar: big countdown, −15s / +15s, Skip.
- At 0: vibrate (pattern 200-100-200 ms via `navigator.vibrate`) and show a system notification if the app is backgrounded (request notification permission on first workout).
- Store the timer's end timestamp so the countdown stays correct after the app is backgrounded or the screen turns off.
- Screen Wake Lock API keeps the screen on during an active session (toggle in Settings, default on).

### 2.5 Exercise Guide (bottom sheet)
- Name, targets, prescription, tempo explained in words ("3 s down, 1 s pause, 1 s up, 0 s at top").
- Sections: **Setup**, **Execution**, **Progression**, straight from seed data.
- Mini history: last 5 sessions' top set for this exercise.

### 2.6 Session summary
- Duration, total sets, total volume (Σ weight × reps; for bodyweight moves use reps only and show separately).
- PRs hit this session (§5.4).
- Per-exercise list showing whether you **beat**, **matched** or **fell short of** last time.
- Done → back to Today.

### 2.7 History
- Reverse-chronological session list (date, day A/B/C, duration, sets). Tap → read-only session detail, with an edit option for fixing typos.
- Calendar month view showing training days as dots, coloured by day type.

### 2.8 Progress
- Exercise picker → line charts over time:
  - Top-set weight
  - Best estimated 1RM (Epley: `w × (1 + reps/30)`, only for sets with reps ≤ 15 and w > 0)
  - Total reps per session (for bodyweight exercises)
  - Session volume
- Bodyweight chart if logged.
- Weekly sets per muscle group (from `targets`) for the last 8 weeks, as a bar chart.

### 2.9 Settings
- Available dumbbell weights per handle (editable list; default `2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20` kg). Steppers snap to these values.
- Rest timer: vibrate on/off, sound on/off, default adjustment.
- Keep screen awake during workouts: on/off.
- Program start date (drives week number/deload).
- Rotation: reset to Day A.
- **Export** all data as JSON (full backup) and CSV (one row per set).
- **Import** JSON backup (validate and preview counts before overwriting; offer merge or replace).
- Danger zone: delete all data (double confirm).

## 3. Navigation
Bottom tab bar with 4 tabs: **Today · History · Progress · Settings**. The active session is full-screen, with no tab bar.

## 4. Data model (Dexie)

```ts
// Seed (read-only, replaced on seed version bump)
Exercise { id: string; name: string; targets: string[]; pattern: Pattern;
  loadType: 'dumbbell' | 'bodyweight' | 'assisted' | 'band';
  perSide: boolean; setup: string; execution: string; progression: string; }

ProgramDay { id: 'A' | 'B' | 'C'; name: string; focus: string; order: number;
  items: ProgramItem[]; }

ProgramItem { exerciseId: string; sets: number; repMin: number; repMax: number;
  restSec: number; tempo: string; supersetGroup?: string; }

Pattern = 'vertical_pull' | 'horizontal_pull' | 'horizontal_push' | 'vertical_push'
        | 'knee' | 'hip' | 'core' | 'arms' | 'shoulder_health';

// User data (never overwritten by seed)
Session { id: string (uuid); dayId: 'A'|'B'|'C'; startedAt: number; endedAt?: number;
  weekNumber: number; isDeload: boolean; bodyweightKg?: number; notes?: string;
  warmupDone: boolean; }

SetLog { id: string; sessionId: string; exerciseId: string; setIndex: number;
  weightKg: number | null; addedKg?: number; bandAssist?: boolean;
  reps: number; rir: 0|1|2|3|4; techniques: string[]; completedAt: number; }

Settings { key: string; value: unknown }   // key-value table
Meta { key: 'seedVersion' | 'schemaVersion' | ...; value: unknown }
```

Indexes: `SetLog` on `sessionId`, `exerciseId`, `[exerciseId+completedAt]`; `Session` on `startedAt`.

## 5. Business logic (`src/domain/`, all unit-tested)

### 5.1 Rotation (`rotation.ts`)
- Next day = the day after the last **completed** session's day (A→B→C→A). No sessions → A.
- A manual day choice overrides the suggestion for that session only; rotation then continues from whatever was done.
- Warning (not a block) if the last session ended less than 40 hours ago: "Consider resting today."

### 5.2 Progression suggestions (`progression.ts`)
Implements the program's double progression plus the progression ladder.

For each exercise, look at the most recent completed session containing it:
1. **Hit target** = every prescribed working set reached `repMax` with RIR ≥ 1.
2. If hit target:
   - If a heavier available dumbbell exists (and `loadType = 'dumbbell'`) → suggest **"Go up to {next} kg, aim for {repMin}+ reps"**.
   - Else → suggest the **next ladder step** not yet used in the last 2 sessions for this exercise (from the `techniques` tags), in this order: `Tempo 4–5 s eccentric` → `Pause 2–3 s in stretch` → `1.5 reps` → `Unilateral` (only if not already `perSide`) → `Mechanical drop set on last set` → `Rest-pause last set`.
   - For bodyweight/assisted: suggest dropping band assist first, then `+2.5 kg` added (dumbbell between feet), then the ladder.
3. If any set fell below `repMin` in 2 consecutive sessions → suggest **"Hold load, focus on form"**, or "Drop to {prev} kg".
4. Otherwise → **"Beat last time: +1 rep on any set"**.

Return `{ kind, message, suggestedWeightKg?, suggestedTechnique? }`. The UI shows it as a chip and can prefill the weight.

### 5.3 Week number & deload (`deload.ts`)
- `weekNumber = floor((sessionDate − programStartDate) / 7 days) + 1`, with programStartDate defaulting to the first session's Monday.
- **Deload** when `weekNumber % 6 === 0`.
- In a deload week: prescribed sets = `ceil(sets / 2)`, same weights, suggestions show "Deload: keep weights, half the sets", and the progression engine ignores deload sessions when evaluating "hit target".

### 5.4 PRs (`stats.ts`)
Per exercise, flag a PR when a set beats all prior sets on either:
- **Weight PR:** a higher weight at ≥ `repMin` reps
- **Rep PR:** more reps at the same or a higher weight

Also compute volume, estimated 1RM, weekly sets per muscle (count each working set once for each muscle in `targets`).

## 6. Non-functional
- Fully offline after first load. Installable (manifest, 192/512 maskable icons, `display: standalone`, `theme_color` matches the dark UI).
- Cold start < 2 s on S23. Logging a set ≤ 2 taps when the prefilled values are correct.
- Session state persisted on every change. Reopening resumes exactly where you left off, including a running rest timer.
- Export file name: `gym-backup-YYYY-MM-DD.json`. CSV columns: `date,day,exercise,set,weight_kg,added_kg,band_assist,reps,rir,techniques,notes`.
- Accessible: min 48 px tap targets, WCAG AA contrast, works with system font scaling up to 130%.

## 7. Out of scope (v1)
Accounts, cloud sync, multiple programs or program editor, social features, Wear OS. Keep the code structured so a program editor could be added later.
