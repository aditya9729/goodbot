# GOODBOT · Make Room — Hotel Prototype 02

**Perspective hotel / visual-direction revision · version 0.2.0**

A playable change to the actual game, not a concept render. This release replaces
the default isometric drawing with an original 3D hotel, preserving the six shifts,
local scene-aware task director, music, consent and assisted robot interactions.
It is independent of Driftfall. No remote repository or deployment was changed.

## Try it

Open the separately supplied `GOODBOT-Real-Look.html`. It is a single-file offline
mouse/keyboard/touch preview. Camera and API controls are disabled in this preview;
use the source server for those optional integrations. The HTML runs the actual
WASM triangle renderer, not a background image. There are no external art downloads.

To run the complete source, from this `goodbot/` directory, with Node 22+:

```sh
npm run check
npm test
npm start
# http://127.0.0.1:4174/goodbot/
```

The bundled renderer is precompiled; playing does not require npm dependencies,
Clang, or a build step. The optional webcam still downloads its declared MediaPipe
runtime/model after consent. No live webcam or live AI service was tested here.

## New visual direction

Full perspective geometry, full-height walls, an interior ceiling, a deep window
opening and skyline, curtains, oak floorboards, a rug, upholstered headboard,
shaped pillows/duvet, ceramic cups, cabinetry, and a metal-framed service cart.
Procedural surface variation and a directional shadow map replace flat fills.
The mobile robot has volume, wheels, a torso, camera head, and animated arm links.
The interface gives more screen space to the room and keeps task controls readable.

This is **more grounded 3D, not photorealism or a scanned hotel**. Mesh detail and
lighting remain approximate. There are visible shading seams and limited reflection
fidelity; the decorative dark panel is not a real-time mirror. Bedding and folded
towels are fixed geometry. Arms and objects remain assisted/kinematic, not a new
contact or cloth simulation. Hotel tasks are fictional game rules, not procedures.

## Cameras and controls

| Input | Action |
|---|---|
| Room | Interior perspective; resets the room camera |
| Robot camera | Camera near the robot's head; follows base motion |
| Overview | Elevated inspection view; removes the ceiling |
| Right-mouse drag | Look/orbit within the selected view |
| Mouse wheel | Adjust field of view (zoom) |
| Click/tap an object or task | Ordinary approach, pickup, opening or flagging |
| Place button / destination | Carry to the authorized location and place |
| Click floor | Request a route on open floor |
| WASD / arrows | Drive relative to current camera directions |
| U / H / P / M | Undo / hint / pause / sound |

A camera change is not a game reset. Mouse look does not command the robot.
Use the task buttons when a small object is occluded or difficult to select.
Extreme manual camera angles may show scene boundaries; Room resets the view.
The close room camera can crop the robot near the entry position; Overview gives
an unobstructed operational view. On touch, use camera presets and task buttons.

The six scenario IDs and objectives are unchanged: welcome, checkout, stayover,
preference, rescue and quiet. No extra levels are claimed by this visual release.
The practice bot remains scripted, and the local Scout/Steward/Planner/Checker
roles are deterministic functions, not independent language-model agents.

## Renderer and performance

`renderer-src/raster.c` implements a bounded software triangle rasterizer compiled
to WebAssembly. It has perspective-correct interpolation, a depth buffer, procedural
materials, per-pixel lighting, static directional shadows, and approximate contact
occlusion. The result is copied into a Canvas2D display surface. It is **not WebGL**.
Static architecture/color/depth are cached; dynamic robot/task meshes share the
cached depth buffer. `public/src/raster-data.js` embeds the WASM with zero imports.

The constrained browser here could not provide WebGL, and external library downloads
failed. This renderer makes the new scene playable without those dependencies. It
is not the recommended final high-performance graphics architecture. Full camera
rebakes took approximately 136–413 ms in three headless test samples; these are not
FPS or device benchmarks. A moving robot camera can feel slower. Static-view motion
uses a cheaper cached path. No 60 FPS, battery-life or mobile performance claim is made.

If WASM initialization fails, an explicit banner announces the retained **2D
compatibility mode**. Tests for this release assert the real WASM backend, so they
cannot silently pass using that fallback. A production-quality next graphics pass
should move this scene to a GPU renderer, add better assets and measured device QA.

To regenerate the shipped renderer, with Clang 17+ and wasm-ld installed:

```sh
python tools/build-renderer.py
npm test
python tools/standalone.py
```

## Consent, keys and privacy

No webcam activation on arrival. The source build requires a fresh unchecked
acknowledgement, explicit activation and browser permission, requests video only,
and retains visible Stop controls. Cancellation, late permission, hidden tab and
exit release capture. Tracking loss pauses without releasing held cargo.
No camera frames or hand recordings are stored or uploaded by the game.

AI proposals are optional and separately consented. Credentials remain server-side.
Use the included `.env.example` as documentation; the server reads environment
variables and does not automatically load that file. Never put keys in HTML or
`public/`. The offline/static experience works without an AI service. The adapter's
live provider path remains unverified; baseline mocked tests still pass.
See `docs/PROTOTYPE_01_README.md` for the existing adapter configuration and consent
contract, and `docs/ARCHITECTURE.md` for the deterministic task system.

## Verification

67 Node tests passed, including nine new geometry/raster tests. Eleven browser
regressions pass with the actual WASM backend asserted, including the six-shift
campaign and synthetic camera controls. Three additional camera/picking scenarios
pass on the exact standalone document with its CSP retained. Forty HTTP asset
checks match source bytes at both root and `/goodbot/`. See `docs/TEST_REPORT.md`.

Browser policy blocked normal navigation in this environment. Gameplay regression
uses the documented memory harness; standalone tests use `set_content`. No physical
webcam, live model/API, deployed browser, normal file navigation, real-device
performance, or commercial-readiness claim follows from these checks.

## Build and hand off

```sh
npm run package:site
# dist/ contains only the static client
```

The source ZIP contains a `goodbot/` project folder. Merge deliberately into the
existing GOODBOT working tree without overwriting newer work. Do not extract a
static-site ZIP over a source repository. Do not replace Driftfall's Pages site.
`deploy/pages.yml` remains an opt-in example for a separate repository; it
has not run remotely. `CLAUDE_HANDOFF.md` describes the current implementation and
next graphics tasks. Historical prototype-01 docs are labeled as such.
