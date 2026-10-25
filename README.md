# Home Gym Tracker — Lady version

An offline-first **Progressive Web App** for logging a **light, 3-day full-body program** (A → B → C) at home, with no heavy lifting. No backend and no accounts: all data stays on the phone.

**Live app:** https://aabstack.github.io/home-gym-tracker-lady/ (source: https://github.com/aabstack/home-gym-tracker-lady)

> This is the **lady version**. It shares the app engine with the **male version** (https://github.com/aabstack/home-gym-tracker, tag `male-v1.0.0`) but has its own program, its own on-device database and backups, and a rose colour theme. The two apps can be installed on the same phone without mixing data.

## The program
Designed for a 29-year-old, 62 kg, 160 cm, training at home with the same equipment: power rack with pull-up bar, 20 kg adjustable dumbbells, adjustable bench and the yellow band. Full details are in [PROGRAM.md](PROGRAM.md).

- **Light loads:** dumbbells 2–10 kg per hand; the weight list stops at 10 kg. No single-heavy-dumbbell exercises, and no weight added to bodyweight exercises.
- **Higher reps, slow tempo:** 10–20 reps with a 3-second lowering on most moves.
- **Effort:** every set ends with 2–3 reps in reserve; never to failure. A set only counts towards progressing when it ends at RIR 2 or more.
- **Progression:** reps first, then technique (slower lowering, pauses, 1.5 reps, one side at a time) before any weight increase. No drop sets or rest-pause.
- **Days:**
  - **A — Legs, back and core:** goblet box squat, kneeling band lat pulldown, DB Romanian deadlift, incline push-up, DB hip thrust, dead bug
  - **B — Single-leg strength and posture:** reverse lunge, one-arm DB row, seated DB shoulder press, bench step-up, band face pull, Pallof press
  - **C — Glutes, upper body and arms:** Bulgarian split squat, incline DB press, single-leg hamstring bridge, incline prone row, lateral raise, curl + triceps superset
- Deload every 6th week (half the sets, same weights).

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
