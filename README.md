# Home Gym Tracker — Lady version

An offline-first **Progressive Web App** for logging a **light, 3-day full-body program** (A → B → C) at home, with no heavy lifting. No backend and no accounts: all data stays on the phone.

**Live app:** https://aabstack.github.io/home-gym-tracker-lady/ (source: https://github.com/aabstack/home-gym-tracker-lady)

> This is the **lady version**. It shares the app engine with the **male version** (https://github.com/aabstack/home-gym-tracker, tag `male-v1.0.0`) but has its own program, its own on-device database and backups, and a rose colour theme. The two apps can be installed on the same phone without mixing data.

## The program
Version 2 is built around her own 16-week plan (bigger, stronger glutes and thighs, a defined waist and toned belly, leaner back and arms), adapted to home training with the same equipment: power rack with pull-up bar, 20 kg adjustable dumbbells, adjustable bench and the yellow band. Full details, including how each gym machine maps to a home exercise, are in [PROGRAM.md](PROGRAM.md).

- **Light loads:** dumbbells 2–10 kg per hand; the weight list stops at 10 kg. No single-heavy-dumbbell exercises, and no weight added to bodyweight exercises.
- **Higher reps, slow tempo:** 10–20 reps with a controlled lowering.
- **Effort:** every set ends with 2–3 reps in reserve; never to failure. A set only counts towards progressing when it ends at RIR 2 or more.
- **Progression:** reps first, then technique (slower lowering, pauses, 1.5 reps, one side at a time) before any weight increase. No drop sets or rest-pause.
- **Days:**
  - **A — Glutes and quads:** hip thrust, goblet box squat, Bulgarian split squat, side-lying hip abduction, glute kickback, reverse crunch
  - **B — Upper body, arms and core:** band lat pulldown, one-arm DB row, incline DB press, lateral raise, face pull, band triceps pushdown, dead bug
  - **C — Glutes and hamstrings:** Romanian deadlift, hip thrust (paused), step-up, single-leg hamstring bridge, side-lying hip abduction, Pallof press
- Deload every 6th week (half the sets, same weights).
- Walking (8,000–12,000 steps), nutrition (≈1,900–2,000 kcal on training days, 110–120 g protein) and 4-weekly measurements come from her plan and are listed in PROGRAM.md; the app doesn't track them yet.

If she is pregnant or postpartum, has pain, or has a medical condition, check with a doctor or physiotherapist before starting, and skip or swap anything that doesn't feel right.

## Features
Same as the male version:
- Today screen with the next workout, training week and deload banner; tap any exercise for its guide
- Warm-up checklist with a "How" animation for every item
- Fast set logging (weight, reps, RIR, technique tags) with autosave, rest timer, "Last time" line and progression suggestions
- Animated stick-figure demo for every exercise, timed to its tempo, plus a "Watch demo" YouTube search
- History list and calendar, progress charts, JSON/CSV backup, works fully offline

## Development
```bash
npm install
npm run dev          # http://localhost:5173
npm test
npm run lint
npm run build
```

## Install on the phone
1. Open https://aabstack.github.io/home-gym-tracker-lady/ in **Chrome**.
2. Tap ⋮ → **Add to Home screen** → **Install**. The icon is called **Lady Gym**.
3. Open it from the home screen; it works offline.
4. Back up regularly from **Settings → Export backup**.
