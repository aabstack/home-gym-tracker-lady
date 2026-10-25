# TASKS.md — Build Plan

Work through the phases in order. After each phase run `npm run lint && npm test && npm run build`, fix any failures, then tick the boxes.

## Phase 1 — Scaffold
- [x] Vite + React + TS (strict) project, Tailwind, ESLint, Prettier, Vitest
- [x] Hash router with 4 tab routes + full-screen `/session/:id` and `/warmup` routes
- [x] Bottom tab bar, dark theme tokens from `DESIGN.md` as Tailwind theme colours
- [x] Mobile shell: max-width 480px, safe-area padding
- **Check:** app runs on the phone via `npm run dev -- --host` on the same Wi-Fi _(needs the phone; verified locally at 360×780)_

## Phase 2 — Data layer & seed
- [x] Copy the JSON block from `PROGRAM.md` verbatim into `src/data/program.seed.json`
- [x] Dexie schema (`db.ts`) for the tables in SPEC §4, versioned
- [x] `seed.ts`: on startup, if `Meta.seedVersion` is older than the JSON's `seedVersion`, replace the Exercise/ProgramDay/Warmup tables only
- [x] Unit tests: seeding is idempotent and never touches Session/SetLog
- **Check:** seed loads; 18 exercises and 3 days are present _(seed has 19 exercises, 6 + 6 + 7; the canonical JSON wins and the test asserts 19)_

## Phase 3 — Domain logic (pure, tested)
- [x] `rotation.ts` + tests (SPEC §5.1)
- [x] `deload.ts` + tests (week 6 and week 12 deload, halved sets with `ceil`)
- [x] `progression.ts` + tests covering every branch of SPEC §5.2 (dumbbell step-up, ladder order, bodyweight path, stall, default)
- [x] `stats.ts` + tests (volume, Epley e1RM, PR detection, weekly sets per muscle)
- **Check:** ≥ 90% coverage on `src/domain/` _(100% lines, ~96% branches)_

## Phase 4 — Today, warm-up, active session
- [x] Today screen (next day, deload banner, resume, stats strip)
- [x] Warm-up checklist screen
- [x] Session screen with exercise cards, steppers, RIR, tick → autosave
- [x] Prefill from last session; "Last time" line; suggestion chip
- [x] Superset grouping for Day C
- [x] Add/remove set, swap exercise (same `pattern`), technique tags sheet
- [x] Bodyweight/assisted handling (BW, +kg, band assist)
- [x] Finish flow + summary screen with PRs and beat/match/short comparison
- **Check:** kill the app mid-session, reopen, and it resumes exactly where you left off _(verified: logged sets, unsaved drafts and the running rest timer all restore)_

## Phase 5 — Rest timer & device features
- [x] Timer based on an end timestamp (survives backgrounding), sticky bar, ±15 s, skip
- [x] Vibration at 0; notification when backgrounded (ask permission once)
- [x] Wake Lock during session (re-acquire on `visibilitychange`)
- **Check:** start a 60 s rest, lock the screen, and it vibrates/notifies on time _(needs the phone)_

## Phase 6 — Exercise guide
- [x] Bottom sheet with setup/execution/progression, tempo in words, last 5 top sets

## Phase 7 — History & progress
- [x] Session list + detail + edit
- [x] Month calendar with day-coloured dots
- [x] Progress charts per exercise (top set, e1RM, reps, volume), bodyweight, weekly sets per muscle
- **Check:** with ~10 fake sessions (add a dev-only "generate demo data" button), charts render correctly _(verified with 12 demo sessions)_

## Phase 8 — Settings, backup
- [x] Dumbbell weight list, timer prefs, wake lock toggle, program start date, reset rotation
- [x] JSON export/import (validate, preview, merge/replace), CSV export
- [x] Delete all data (double confirm)
- **Check:** export → delete all → import restores everything identically _(covered by an automated test in `src/data/backup.test.ts`)_

## Phase 9 — PWA & deploy
- [x] vite-plugin-pwa: manifest per `DESIGN.md`, icons (192, 512, maskable), precache all assets, `registerType: 'autoUpdate'` with an "Update available" toast
- [x] Set Vite `base` for GitHub Pages; GitHub Actions workflow that builds and deploys `dist/` to Pages on push to `main`
- [x] Lighthouse: PWA installable, performance ≥ 90 on mobile
- **Check:** install on the S23 via Chrome "Add to Home screen"; it works in airplane mode _(offline verified locally with the server stopped; install on the phone after deploying)_

## Phase 10 — Polish
- [x] Empty states (no history yet, no chart data)
- [x] Font scaling to 130% doesn't break layouts
- [x] Remove the demo data button from the production build
- [x] Update `README.md` with the final URL and any setup notes
