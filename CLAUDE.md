# CLAUDE.md — Home Gym Tracker (Lady version)

## Project summary
A single-user, offline-first PWA for logging a fixed, **light-load** 3-day full-body program (no heavy lifting) on an Android phone (Chrome). No backend, no accounts. All data in IndexedDB on the device.

This is the **lady version**, forked from the male version (https://github.com/aabstack/home-gym-tracker, tag `male-v1.0.0`). It has its own program, its own IndexedDB database name (`home-gym-tracker-lady`) and backup id, a rose accent colour, and program-specific progression rules read from the seed (`progressionLadder`, `defaults.minTargetRir`, `defaults.maxAddedKg`).

Read these before writing code:
- `SPEC.md`: features, data model, business logic (source of truth for behaviour)
- `PROGRAM.md`: the training program; the JSON block in it is the canonical seed data
- `DESIGN.md`: UI rules
- `TASKS.md`: build order; work through it phase by phase and tick boxes as you go

## Tech stack (do not substitute without asking)
- **Vite + React 18 + TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **Dexie.js** (IndexedDB wrapper) + `dexie-react-hooks` for persistence and live queries
- **React Router** (hash router, so GitHub Pages works without server config)
- **vite-plugin-pwa** (Workbox) for manifest, service worker, offline caching
- **Recharts** for progress charts
- **Vitest + React Testing Library** for tests
- **date-fns** for dates

## Commands
- `npm run dev`: dev server (use `--host` to test on the phone over LAN)
- `npm run build`: production build into `dist/`
- `npm run preview`: serve the build
- `npm test`: run Vitest
- `npm run lint`: ESLint + `tsc --noEmit`

## Folder layout
```
src/
  data/        program.seed.json (from PROGRAM.md), db.ts (Dexie schema), seed.ts
  domain/      pure logic: rotation.ts, progression.ts, deload.ts, stats.ts (unit-tested)
  features/    today/, session/, history/, exercise/, settings/, body/
  i18n/        English/Arabic UI strings, Arabic program content, I18nProvider
  components/  shared UI (Button, Stepper, Timer, Sheet, Card)
  hooks/       useWakeLock, useRestTimer, useVibrate
  pwa/         manifest assets, icons
```

## Rules
1. **Business logic lives in `src/domain/` as pure functions with unit tests.** UI components never contain progression or rotation math.
2. **Seed data comes only from the JSON block in `PROGRAM.md`.** Copy it verbatim into `src/data/program.seed.json`; don't retype or "improve" exercise text.
3. **Program definitions are read-only seed; user data is separate.** Never mutate seed tables when logging. Re-seeding on app update must never touch Sessions or SetLogs.
4. **Version the Dexie schema.** Any schema change gets a new `db.version(n)` with a migration. Never drop user tables.
5. **Offline first.** No runtime network calls. No CDNs; bundle all assets and fonts.
6. **Units are kg.** Store weights as numbers in kg with 0.25 kg precision.
7. **Autosave every set immediately.** A session must survive the app being killed mid-workout and resume on reopen.
8. **Mobile only.** Design for a 360×780 CSS-px viewport (S23). Desktop just centres the mobile layout at max-width 480px.
9. Keep dependencies minimal. Ask before adding anything not listed above.
10. **Every user-visible string goes through `useI18n().t`** with a key in both `strings.en.ts` and `strings.ar.ts` (a test checks they match). Program text is translated in `content.ar.ts`; the seed JSON stays English. Use logical Tailwind classes (`ms-`, `pe-`, `start-`, `text-start`) so RTL works.
11. After each phase in `TASKS.md`: run `npm run lint`, `npm test` and `npm run build`; fix failures before moving on.

## Definition of done
All `TASKS.md` boxes ticked, tests passing, Lighthouse PWA "installable" check passing, and the app works with the phone in airplane mode.
