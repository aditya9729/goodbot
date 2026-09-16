> Historical task/AI architecture from the initial prototype. For Studio 03 rendering, recording and data boundaries, read README.md and docs/STUDIO_DATA.md.

# Prototype 02 rendering addendum

The task/control/server architecture below is retained. Its original Canvas2D
renderer has moved to `public/src/render-flat.js` as an explicitly labeled fallback.
The new default uses `render.js`, `hotel3d.js`, `geometry.js` and embedded
`raster-data.js`, built from `renderer-src/raster.c`. It projects triangles in
perspective, caches static color/depth and lights, then draws dynamic object/robot
geometry. It displays that rendered image on a Canvas2D surface, not WebGL.
Read the current `README.md` and `docs/TEST_REPORT.md` for fidelity/performance limits.

---

# Architecture and next work

## Data, not prose, decides success

A scene contains static furniture, movable/protected objects, permission flags,
destination surfaces with type/capacity constraints, and a route region. Scout
builds tasks only from this contract. Tasks refer to entity/destination IDs.
Steward preserves room permission and ownership. Planner adds open/takeover
prerequisites. Checker walks a simulated sequence using the same route/reach
functions as gameplay and checks capacity. This is a feasibility proof **within
the simplified authored model**, not complete task-and-motion planning.

At runtime a task completes only when an item is unheld, associated with the
requested surface, fully within its footprint, at its support height and settled
for at least 0.45 simulated seconds. Chair overlap with the protected route blocks
completion. Finish also rechecks every protected object's exact initial pose.

The optional AI response has only `title`, `brief` and `taskIds`. Full coverage,
unique IDs, bounded text, prerequisites and feasibility are verified on the
server AND in the client. A language model can generate schema-conforming but
wrong values; JSON Schema is not a replacement for these semantic checks.
A future scene generator should add allowed tasks/verbs through this contract,
not supply executable model-generated JavaScript.

## Main loop

Inputs → intent command → nearest reachable approach → collision-aware route →
short arm animation → assisted action → stable-state evaluation → progress/reward.
The application clamps large timesteps. Holding an object changes its pose but
never drops it simply because tracking is lost. Pause cancels pending intent.
Only one item is carried in this milestone; the second arm supports the visual
carry. No independent two-arm teleoperation is claimed.

## Agent scope and API boundaries

No separate coding agents or external agent sessions were launched to make this
release. The in-game director's four roles are deterministic local code. The
optional model adapter makes one bounded Responses request, not an autonomous
agent tool loop. Server input is only known level ID, seed, and explicit consent;
the server regenerates its canonical scene instead of trusting arbitrary uploaded
scene JSON. Narration is rendered as bounded text nodes, never HTML.

Provider credentials are environment variables. The server is local-only and has
CSRF/origin/host checks and a process budget. Public hosting requires separate
authentication and durable abuse/cost protections. `store:false` is sent to the
provider, but is not a general guarantee about provider retention policies.

## Camera provenance

`camera.js` and `vision-worker.js` are adapted from the user's Driftfall checkpoint
02 + music update (0.1.1). The camera lifetime and worker request-guard unit tests
were ported too. Worker messages now support one-hand pointing for GOODBOT;
flight controls and flight simulation were not reused. New `hands.js`, UI/lifecycle
wiring and synthetic browser tests validate this application's mapping.

Google MediaPipe 0.10.14 runtime/WASM are loaded from named jsDelivr assets, and
the hand-landmarker model from Google's model host, only after opt-in. Inference
runs in a classic worker. Stream ownership uses generation tokens, including late
permission results. The integration is not a claim that this model has been
validated on real people, devices or lighting conditions.

## Prioritized continuation tasks

1. Run normal-HTTP browser tests with the shipped source CSP, then physical webcam
   and tracking checks on real devices. Verify camera stop from every modal state.
2. Observe new players without coaching: selection mistakes, grasp comprehension,
   willingness to start another shift, arm fatigue and accidental pinches.
3. Upgrade assisted reach/place to a real robot model with FK/IK, gripper collision
   geometry and a rigid-body/contact solver. Keep the readable intent-level input.
4. Author a genuinely different corridor/laundry/repair-room layout, with the same
   scene contract and full-route solvability tests; don't merely change the palette.
5. Extend the director with additional vetted verbs (drawer, object handover,
   carrying a tray, tidying hotel-owned objects) and conservative constraints.
6. Add optional server-side AI only after testing with the selected model and budget.
   Record accepted/rejected proposal examples; no gameplay needs a live key.
7. Explore local co-op after controller feel is validated. Networked multiplayer,
   learning from interventions and real hotel reconstruction are separate projects.

## Primary implementation references consulted

- MediaPipe Hand Landmarker Web guide:
  https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- OpenAI Structured Outputs guide:
  https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI API key safety:
  https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety

These document dependencies and API design; they do not certify this game.
