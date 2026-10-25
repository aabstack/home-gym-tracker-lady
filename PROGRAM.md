# PROGRAM.md — Training Program & Seed Data (Lady version)

## Who it's for
- 29 years old, 160 cm, 63.5 kg (InBody 770, 26 Sep 2026: body fat 30.2%, skeletal muscle 24.4 kg, BMR 1,328 kcal). Trains at home 3×/week (Mon/Wed/Fri suggested, with ≥ 48 h between sessions).
- **Goal (from her own 16-week plan):** bigger, stronger glutes and thighs, a more defined waist and a toned belly, and leaner back and arms, **without heavy lifting**.
- If you are pregnant or postpartum, have pain, or have a medical condition, check with a doctor or physiotherapist first, and skip or swap any exercise that doesn't feel right.

## Structure (program v2)
- **A — Glutes and quads:** hip thrust, goblet box squat, Bulgarian split squat, side-lying hip abduction, glute kickback, reverse crunch
- **B — Upper body, arms and core:** band lat pulldown, one-arm row, incline press, lateral raise, face pull, band triceps pushdown, dead bug
- **C — Glutes and hamstrings:** Romanian deadlift, hip thrust (with a pause), step-up, single-leg hamstring bridge, side-lying hip abduction, Pallof press
- Lower body in 2 of every 3 sessions, hip thrusts twice per rotation, and glute-side (abduction) work twice.
- Incline push-up, reverse lunge, seated shoulder press, prone row, incline curl and overhead triceps extension stay in the app as **swap options**.

## From her gym plan to the home version
Her 16-week plan was written for a commercial gym. Exercises that need machines or cables are replaced with home equivalents that train the same muscles:

| Her plan (gym) | In the app (home) |
| :--- | :--- |
| Hip Thrust, Bulgarian Split Squat, Romanian Deadlift, Step-Up, Lateral Raise, Face Pull, Pallof Press, Dead Bug, Incline Chest Press | Same exercise (dumbbells, bench or band) |
| Squat, Leg Press, Hack/Smith Squat | Goblet box squat, Bulgarian split squat |
| Walking Lunges | Bench step-up (reverse lunge available as a swap) |
| Leg Curl | Single-leg hamstring bridge (heel on bench) |
| Leg Extension | Covered by squats, split squats and step-ups; no home equivalent added |
| Hip Abduction machine | **Side-lying hip abduction** (band around the knees to progress) |
| Glute Kickback (cable) | **Glute kickback on all fours** (band around the foot to progress) |
| Lat Pulldown | Kneeling band lat pulldown |
| Seated (cable) Row | One-arm bench-supported DB row |
| Triceps Pushdown (cable) | **Band triceps pushdown** (band over the pull-up bar) |
| Reverse Crunch | **Reverse crunch** |

## Outside the gym sessions (from her plan)
These belong to her plan rather than the app, and they matter as much as the workouts for a defined waist and leaner back and arms (fat can't be lost from one spot by training it; it comes from overall diet and activity):
- Walk 8,000–12,000 steps a day; the two non-lifting days are walks plus 10 minutes of stretching.
- About 1,900–2,000 kcal on training days and 1,800 on rest days, with 110–120 g of protein every day. Review after 3–4 weeks.
- Sleep 7–9 hours.
- Measure weight, waist, hips and thigh, and take front/side/back photos, every 4 weeks.

## Principles
- **Light to moderate loads only.** Dumbbells go from 2 kg to 10 kg per hand (the app's weight list stops at 10 kg). There are no single-heavy-dumbbell exercises, and bodyweight exercises never have weight added by the app.
- **Higher reps, slow and controlled:** 10–20 reps per set with a 3-second lowering on most exercises.
- **Effort:** finish every set with 2–3 reps in reserve (RIR 2–3). Never train to failure.
- **Progress with reps and technique before weight:** first add reps to the top of the range, then work through the ladder below. Move up one dumbbell step only when every set reaches the top of the range at RIR 2 or more.
- **Deload:** every 6th week, halve the sets and keep the same weights.
- **Tempo notation:** eccentric (lowering) – bottom pause – concentric (lifting) – top pause, in seconds.

## Equipment
Power rack with pull-up bar, 20 kg adjustable dumbbell set (used at 2–10 kg per hand), adjustable bench, light (yellow) resistance band.

## Progression ladder
Move up one step at a time for an exercise, only after reaching the top of the rep range on all sets at RIR 2 or more:
1. Add reps up to the top of the range
2. Tempo: slow the lowering to 3–4 s
3. Pause 1–2 s in the stretched position
4. 1.5 reps
5. One side at a time (unilateral)

## Canonical seed data
**Claude Code:** copy this JSON block verbatim into `src/data/program.seed.json`. Bump `seedVersion` whenever the program changes.

```json
{
  "seedVersion": 2,
  "warmup": [
    {"id": "wu_pass_through", "name": "Band pass-throughs", "detail": "Wide grip, overhead to behind the hips", "dose": "×10"},
    {"id": "wu_pull_apart", "name": "Band pull-aparts", "detail": "Arms straight, squeeze shoulder blades", "dose": "×15"},
    {"id": "wu_scap_pullup", "name": "Scapular pull-ups", "detail": "Hang from rack bar, move shoulder blades only, arms straight (keep your feet on the floor for help if needed)", "dose": "×8"},
    {"id": "wu_wgs", "name": "World's greatest stretch", "detail": "Lunge, elbow to instep, rotate open", "dose": "×3 / side"},
    {"id": "wu_squat_bridge", "name": "Bodyweight squat + glute bridge", "detail": "Controlled, full range", "dose": "×10 each"},
    {"id": "wu_ramp", "name": "Ramp-up set", "detail": "One light set of the first exercise at ~50% effort", "dose": "×1 set"}
  ],
  "exercises": [
    {
      "id": "goblet_box_squat",
      "name": "Goblet Box Squat",
      "targets": ["Quads", "Glutes"],
      "pattern": "knee",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Set the bench flat behind you. Stand about a foot in front of it with your feet shoulder-width apart and toes turned out slightly. Hold one light dumbbell (4–10 kg) vertically against your chest.",
      "execution": "Sit your hips back and down until you lightly touch the bench, keeping your chest tall and your knees tracking over your toes. Don't drop onto the bench: touch it, pause for a second, then stand up by pushing through your whole foot.",
      "progression": "Add reps up to 3×15. Then slow the lowering to 4 seconds. Then pause for 2 seconds just above the bench without touching it."
    },
    {
      "id": "band_lat_pulldown",
      "name": "Kneeling Band Lat Pulldown",
      "targets": ["Lats", "Upper Back"],
      "pattern": "vertical_pull",
      "loadType": "band",
      "perSide": false,
      "setup": "Loop the yellow band over the rack's pull-up bar so both ends hang down. Kneel underneath it and hold one end in each hand with your arms straight up.",
      "execution": "Pull your shoulder blades down first, then drive your elbows down to your sides until your hands reach shoulder height. Squeeze for a second, then let your arms rise slowly back up without shrugging.",
      "progression": "Kneel a little further back so the band starts with more tension. Then add a 2-second squeeze at the bottom. Then pull one arm at a time."
    },
    {
      "id": "db_rdl",
      "name": "DB Romanian Deadlift",
      "targets": ["Hamstrings", "Glutes"],
      "pattern": "hip",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Stand tall with your feet hip-width apart, holding a light dumbbell (4–10 kg) in each hand in front of your thighs.",
      "execution": "With soft knees, push your hips back and slide the dumbbells down the front of your legs, keeping your back flat. Stop when you feel a strong hamstring stretch (usually around mid-shin), then squeeze your glutes to stand tall.",
      "progression": "Add reps up to 3×15. Then slow the lowering to 4 seconds. Then pause for 2 seconds at the bottom of the stretch."
    },
    {
      "id": "incline_push_up",
      "name": "Incline Push-Up (hands on bench)",
      "targets": ["Chest", "Triceps", "Front Delts"],
      "pattern": "horizontal_push",
      "loadType": "bodyweight",
      "perSide": false,
      "setup": "Place your hands on the edge of the flat bench, a little wider than your shoulders. Walk your feet back until your body forms a straight line from head to heels.",
      "execution": "Lower your chest to the edge of the bench with your elbows at about 45° from your body. Keep your hips in line with your shoulders, then push the bench away to return.",
      "progression": "Add reps up to 3×15. Then slow the lowering to 3–4 seconds. Then move to a lower surface (a step, or the floor on your knees), working towards full floor push-ups."
    },
    {
      "id": "db_hip_thrust",
      "name": "DB Hip Thrust",
      "targets": ["Glutes", "Hamstrings"],
      "pattern": "hip",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Rest your upper back (just below the shoulder blades) across the long side of the flat bench, with your feet flat and hip-width apart. Place a dumbbell (5–10 kg) across your hips and hold it with both hands.",
      "execution": "Tuck your chin and ribs, then drive through your heels to lift your hips until your body is flat from knees to shoulders. Squeeze your glutes for 2 seconds at the top, then lower under control.",
      "progression": "Add reps up to 3×20. Then hold the top for 3 seconds. Then switch to single-leg hip thrusts without the dumbbell."
    },
    {
      "id": "dead_bug",
      "name": "Dead Bug",
      "targets": ["Core"],
      "pattern": "core",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Lie on your back on a mat with your arms pointing straight up and your knees bent at 90° above your hips. Gently press your lower back into the floor.",
      "execution": "Slowly reach one arm overhead while straightening the opposite leg until it hovers just above the floor. Keep your lower back pressed down the whole time, then return and switch sides. One reach on each side counts as one rep.",
      "progression": "Slow each reach to 3 seconds. Then hold the stretched position for 2 seconds. Then hold the yellow band between your hands for extra tension."
    },
    {
      "id": "db_reverse_lunge",
      "name": "Reverse Lunge",
      "targets": ["Quads", "Glutes"],
      "pattern": "knee",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Stand tall with your feet hip-width apart and your hands on your hips. Hold the rack upright for balance if you need to.",
      "execution": "Step one foot back and lower until your back knee nearly touches the floor, keeping most of your weight on your front foot. Drive through your front heel to return to standing. Finish all reps on one side, then switch.",
      "progression": "Add reps up to 3×12 per leg. Then pause for 1 second at the bottom. Then hold a light dumbbell (2–5 kg) in each hand and log it as +kg."
    },
    {
      "id": "sa_db_row",
      "name": "Single-Arm Bench-Supported DB Row",
      "targets": ["Lats", "Mid-Back"],
      "pattern": "horizontal_pull",
      "loadType": "dumbbell",
      "perSide": true,
      "setup": "Set the bench flat. Put the same-side knee and hand on the bench, with your other foot planted wide. Use a light dumbbell (4–10 kg).",
      "execution": "Let the dumbbell hang until your shoulder blade is stretched forward. Row the dumbbell towards your hip (not your armpit), hold the top for 1 second, then lower slowly.",
      "progression": "Add reps up to 3×15. Then slow the lowering to 4 seconds. Then add a 2-second squeeze at the top."
    },
    {
      "id": "seated_db_shoulder_press",
      "name": "Seated DB Shoulder Press",
      "targets": ["Shoulders", "Triceps"],
      "pattern": "vertical_push",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Set the bench to its highest incline (about 80–85°). Start with light dumbbells (2–6 kg) at ear level, palms facing slightly in.",
      "execution": "Press up and slightly in, keeping your ribs down so your back doesn't arch. Lower for 3 seconds back to ear level.",
      "progression": "Add reps up to 3×15. Then pause for 1 second at the bottom. Then press one arm at a time while the other arm holds at the top."
    },
    {
      "id": "bench_step_up",
      "name": "Bench Step-Up",
      "targets": ["Quads", "Glutes"],
      "pattern": "knee",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Stand facing the flat bench (or a stable step) and place one whole foot on it. Make sure the bench can't slide or tip.",
      "execution": "Lean slightly forward and push through the foot on the bench to stand up on it, without pushing off with your back foot. Step down slowly with the same leg you started with, then repeat. Finish all reps on one side, then switch.",
      "progression": "Add reps up to 3×12 per leg. Then lower yourself back down over 3 seconds. Then hold light dumbbells (2–5 kg) at your sides and log them as +kg."
    },
    {
      "id": "band_face_pull",
      "name": "Band Face Pull",
      "targets": ["Rear Delts", "Rotator Cuff"],
      "pattern": "shoulder_health",
      "loadType": "band",
      "perSide": false,
      "setup": "Anchor the band on the rack upright at face height.",
      "execution": "Pull towards your forehead, splitting your hands apart and rotating your knuckles back so your arms end in a 'double biceps' position. Hold 2 seconds and keep your shoulder blades back.",
      "progression": "Step farther from the anchor. Then do 1.5 reps. Then hold the end position for 3 seconds."
    },
    {
      "id": "band_pallof_press",
      "name": "Band Pallof Press",
      "targets": ["Core"],
      "pattern": "core",
      "loadType": "band",
      "perSide": true,
      "setup": "Loop the band around the rack upright at chest height, using a J-hook to stop it sliding. Stand side-on to the rack, far enough away that the band is under tension.",
      "execution": "Brace your core and press your hands straight out from your chest, resisting the pull to twist. Hold 2 seconds with your arms extended, then bring your hands back slowly.",
      "progression": "Step farther from the rack. Then switch to a half-kneeling stance. Then extend the hold to 5 seconds."
    },
    {
      "id": "bulgarian_split_squat",
      "name": "Bulgarian Split Squat",
      "targets": ["Quads", "Glutes"],
      "pattern": "knee",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Set the bench flat. Rest the laces of your rear foot on the pad, with your front foot about 2–3 feet in front of the bench. Hold the rack upright for balance at first if you need to.",
      "execution": "Lower your back knee straight down towards the floor, keeping your front heel planted and your chest tall. Pause for 1 second at the bottom, then drive through your whole front foot to stand.",
      "progression": "Add reps up to 3×12 per leg. Then slow the lowering to 3 seconds. Then hold a light dumbbell (4–8 kg) against your chest and log it as +kg."
    },
    {
      "id": "incline_db_press",
      "name": "Incline DB Press",
      "targets": ["Chest", "Front Delts", "Triceps"],
      "pattern": "horizontal_push",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Set the bench to a 30° incline. Rest light dumbbells (3–8 kg) on your knees, then bring them up as you lie back.",
      "execution": "Lower with your elbows at about 45–60° from your torso until you feel a gentle chest stretch. Press up in a slight arc without clanking the dumbbells together.",
      "progression": "Add reps up to 3×15. Then add a 2-second pause at the bottom. Then do 1.5 reps."
    },
    {
      "id": "sl_hamstring_bridge",
      "name": "Single-Leg Hamstring Bridge (heel on bench)",
      "targets": ["Hamstrings", "Glutes"],
      "pattern": "hip",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Lie on your back with one heel on the flat bench and your knee bent about 90°. Rest your arms on the floor by your sides.",
      "execution": "Drive your heel down into the bench and lift your hips until your body forms a straight line from knee to shoulder. Hold 1 second, then lower for 3 seconds.",
      "progression": "Add reps up to 3×15 per leg. Then straighten your knee a little more for extra hamstring work. Then hold the top for 3 seconds."
    },
    {
      "id": "incline_prone_db_row",
      "name": "Incline Prone DB Row",
      "targets": ["Mid-Back", "Rear Delts"],
      "pattern": "horizontal_pull",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Set the bench to about 30–45°. Lie chest-down with your chin just past the top of the pad and a light dumbbell (2–6 kg) in each hand.",
      "execution": "Let your shoulders round forward in the stretch, then pull your elbows back and wide until your shoulder blades meet. Hold 2 seconds at the top.",
      "progression": "Add reps up to 3×15. Then slow the lowering to 4 seconds. Then try Y-raises (thumbs up, arms straight, raising them into a Y)."
    },
    {
      "id": "lateral_raise",
      "name": "DB Lateral Raise",
      "targets": ["Shoulders"],
      "pattern": "vertical_push",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Stand tall with very light dumbbells (2–4 kg) at your sides, palms facing in and knees soft.",
      "execution": "With a slight bend in your elbows, raise your arms out to the sides until your hands reach shoulder height, leading with your elbows. Pause briefly, then lower slowly over 2 seconds.",
      "progression": "Add reps up to 3×15. Then hold the top for 1 second. Then do 1.5 reps (lower halfway, raise again, then lower fully)."
    },
    {
      "id": "incline_db_curl",
      "name": "Incline DB Curl",
      "targets": ["Biceps"],
      "pattern": "arms",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Set the bench to 45–60° so your arms hang behind your torso, with a light dumbbell (2–6 kg) in each hand.",
      "execution": "Curl while keeping your elbows fixed and pointing down. Lower for 3 seconds to a full stretch.",
      "progression": "Add reps up to 3×15. Then hold 1.5 seconds in the stretch at the bottom. Then curl one arm at a time with a pause at the top."
    },
    {
      "id": "overhead_db_triceps_ext",
      "name": "Overhead DB Triceps Extension",
      "targets": ["Triceps"],
      "pattern": "arms",
      "loadType": "dumbbell",
      "perSide": false,
      "setup": "Sit at the highest bench incline and hold one light dumbbell (3–8 kg) with both hands overhead.",
      "execution": "Lower the dumbbell behind your head to a comfortable stretch, keeping your elbows pointing forward. Extend fully without flaring your elbows.",
      "progression": "Add reps up to 3×15. Then hold 1.5 seconds in the stretch. Then add a 2-second squeeze at the top."
    },
    {
      "id": "side_lying_hip_abduction",
      "name": "Side-Lying Hip Abduction",
      "targets": ["Glutes (side)", "Hips"],
      "pattern": "glute",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Lie on your side on a mat with your legs straight and stacked, hips tipped slightly forward, and your head resting on your bottom arm. This replaces the gym's hip abduction machine.",
      "execution": "Keeping your toes pointing forward (not up), lift your top leg to about 35–45°, leading with your heel. Pause, then lower slowly without letting your legs touch. Finish all reps, then switch sides.",
      "progression": "Add reps up to 3×20. Then hold the top for 2 seconds. Then loop the yellow band around your knees (doubled up) for extra resistance."
    },
    {
      "id": "glute_kickback",
      "name": "Glute Kickback (on all fours)",
      "targets": ["Glutes"],
      "pattern": "glute",
      "loadType": "bodyweight",
      "perSide": true,
      "setup": "Kneel on all fours on a mat with your hands under your shoulders and your knees under your hips. Brace your core so your back stays flat. This replaces the cable or machine kickback.",
      "execution": "Kick one leg back and up until it is in line with your body, squeezing your glute hard at the top. Don't arch your lower back. Lower slowly until your knee is back under your hip, and repeat. Finish all reps, then switch sides.",
      "progression": "Add reps up to 3×15 per leg. Then hold the top for 2 seconds. Then hook the yellow band around your working foot and hold the ends under your hands for resistance."
    },
    {
      "id": "reverse_crunch",
      "name": "Reverse Crunch",
      "targets": ["Lower Abs", "Core"],
      "pattern": "core",
      "loadType": "bodyweight",
      "perSide": false,
      "setup": "Lie on your back on a mat with your arms by your sides, knees bent and feet just off the floor.",
      "execution": "Breathe out and curl your knees towards your chest, rolling your hips slightly off the floor with your lower abs rather than momentum. Lower slowly until your feet almost touch the floor.",
      "progression": "Add reps up to 3×15. Then slow the lowering to 3 seconds. Then do it lying on the flat bench, holding the bench behind your head, for a bigger range."
    },
    {
      "id": "band_triceps_pushdown",
      "name": "Band Triceps Pushdown",
      "targets": ["Triceps"],
      "pattern": "arms",
      "loadType": "band",
      "perSide": false,
      "setup": "Loop the yellow band over the rack's pull-up bar. Stand facing it and hold one end in each hand at chest height, with your elbows pinned to your sides. This replaces the cable pushdown.",
      "execution": "Keeping your elbows still, push your hands down until your arms are straight and squeeze the backs of your arms. Let your hands rise slowly back to chest height.",
      "progression": "Stand a little further back for more tension. Then hold the bottom for 2 seconds. Then do one arm at a time."
    }
  ],
  "days": [
    {
      "id": "A",
      "name": "Full-Body A",
      "focus": "Glutes and quads",
      "order": 1,
      "items": [
        {"exerciseId": "db_hip_thrust", "sets": 4, "repMin": 10, "repMax": 15, "restSec": 75, "tempo": "2-0-1-2"},
        {"exerciseId": "goblet_box_squat", "sets": 3, "repMin": 10, "repMax": 15, "restSec": 75, "tempo": "3-1-1-0"},
        {"exerciseId": "bulgarian_split_squat", "sets": 3, "repMin": 8, "repMax": 12, "restSec": 75, "tempo": "3-1-1-0"},
        {"exerciseId": "side_lying_hip_abduction", "sets": 3, "repMin": 15, "repMax": 20, "restSec": 30, "tempo": "2-0-1-1"},
        {"exerciseId": "glute_kickback", "sets": 2, "repMin": 12, "repMax": 15, "restSec": 30, "tempo": "2-0-1-1"},
        {"exerciseId": "reverse_crunch", "sets": 3, "repMin": 10, "repMax": 12, "restSec": 45, "tempo": "2-0-1-1"}
      ]
    },
    {
      "id": "B",
      "name": "Full-Body B",
      "focus": "Upper body, arms and core",
      "order": 2,
      "items": [
        {"exerciseId": "band_lat_pulldown", "sets": 3, "repMin": 12, "repMax": 15, "restSec": 60, "tempo": "2-0-1-1"},
        {"exerciseId": "sa_db_row", "sets": 3, "repMin": 12, "repMax": 15, "restSec": 60, "tempo": "2-0-1-1"},
        {"exerciseId": "incline_db_press", "sets": 3, "repMin": 10, "repMax": 15, "restSec": 60, "tempo": "3-1-1-0"},
        {"exerciseId": "lateral_raise", "sets": 2, "repMin": 12, "repMax": 15, "restSec": 45, "tempo": "2-0-1-1"},
        {"exerciseId": "band_face_pull", "sets": 3, "repMin": 15, "repMax": 20, "restSec": 45, "tempo": "2-0-1-2"},
        {"exerciseId": "band_triceps_pushdown", "sets": 3, "repMin": 12, "repMax": 15, "restSec": 45, "tempo": "2-0-1-1"},
        {"exerciseId": "dead_bug", "sets": 3, "repMin": 8, "repMax": 10, "restSec": 45, "tempo": "2-1-2-0"}
      ]
    },
    {
      "id": "C",
      "name": "Full-Body C",
      "focus": "Glutes and hamstrings",
      "order": 3,
      "items": [
        {"exerciseId": "db_rdl", "sets": 3, "repMin": 10, "repMax": 15, "restSec": 75, "tempo": "3-1-1-0"},
        {"exerciseId": "db_hip_thrust", "sets": 3, "repMin": 12, "repMax": 15, "restSec": 60, "tempo": "2-1-1-2"},
        {"exerciseId": "bench_step_up", "sets": 3, "repMin": 10, "repMax": 12, "restSec": 60, "tempo": "2-0-1-1"},
        {"exerciseId": "sl_hamstring_bridge", "sets": 3, "repMin": 10, "repMax": 15, "restSec": 60, "tempo": "3-0-1-1"},
        {"exerciseId": "side_lying_hip_abduction", "sets": 2, "repMin": 15, "repMax": 20, "restSec": 30, "tempo": "2-0-1-1"},
        {"exerciseId": "band_pallof_press", "sets": 3, "repMin": 12, "repMax": 12, "restSec": 45, "tempo": "2-2-1-0"}
      ]
    }
  ],
  "progressionLadder": [
    {"id": "reps", "label": "Add reps to top of range"},
    {"id": "tempo", "label": "Tempo: 3–4 s lowering"},
    {"id": "pause", "label": "Pause 1–2 s in the stretch"},
    {"id": "1.5 reps", "label": "1.5 reps"},
    {"id": "unilateral", "label": "One side at a time"}
  ],
  "defaults": {
    "dumbbellWeightsKg": [2, 3, 4, 5, 6, 7, 8, 9, 10],
    "deloadEveryNWeeks": 6,
    "defaultRir": 2,
    "minTargetRir": 2,
    "maxAddedKg": 0
  }
}
```

## Notes for the app
- For `perSide` exercises, `repMin`/`repMax` are **per side**.
- In a superset, `restSec: 0` on the first exercise means you go straight to the second exercise with no rest. The rest timer runs after the second exercise.
- The Pallof press has a fixed target (`repMin` = `repMax`). Its progression is technique and stance, not load.
- `minTargetRir: 2`: a set only counts towards "hit the target" if it ended with at least 2 reps in reserve.
- `maxAddedKg: 0`: the app never suggests adding weight to bodyweight exercises; it moves to the technique ladder instead. She can still log light dumbbells on them manually as +kg.
- The progression ladder used by the app is the `progressionLadder` list above. Drop sets and rest-pause are deliberately left out.
