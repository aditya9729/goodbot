# GOODBOT / Make Room — Studio 03

**Studio 03 camera hotfix · game version 0.3.1**

A visual and local data-recording update to the existing six-shift hotel game.
This is a complete independent GOODBOT project, not a Driftfall replacement.
No repository was pushed, no site deployed, and no Claude session contacted.

## Play

Open the supplied `GOODBOT-Studio-03-Camera-Fix.html` for the single-file preview. The copy
inside this source project retains the historical name `GOODBOT-Real-Look.html`;
they contain the same final game. The preview supports local episode recording
and the contact bench, but deliberately disables webcam and API controls.

For the complete source, run from this directory using Node 22+:

```sh
npm run check
npm test
npm start
# http://127.0.0.1:4174/goodbot/
```

No npm installation, remote artwork or game build step is required. The optional
hand mode still downloads its disclosed runtime/model only after camera consent.
The optional AI adapter remains server-side and separately consented; no API key
is required for rendering, local task generation, recording, or the contact bench.
Do not put credentials in HTML, public assets, recordings, or a Git repository.

## Camera hotfix (0.3.1)

Reproduced the old reverse-control feedback loop in a browser: holding S alternated
between forward/back movement on successive frames. The new body-frame controller
preserves heading during reverse/strafe and rate-limits turning. Automatic grid-path
and reach turns are also rate-limited. The robot starts facing into the room.
Static CPU shadow maps are reused during camera movement; the CPU head-camera raster
uses 384 pixels wide while moving and restores up to 640 after 250 ms idle. This is
an explicit sharpness/responsiveness tradeoff, not a claim of 60 FPS. The GPU path
retains higher resolution. Capture exports the actual raster and current pose.
Read `docs/CAMERA_FIX_031.md` and the current verification report for scope.

## Studio 03 visual changes

Warmer oak flooring, dark walnut cabinetry, a slatted feature wall, wall-sconce
geometry, brass accents and a padded bench improve the authored interior.
The bench is also a navigation obstacle. Robot meshes and carried objects now
rotate with the base. The virtual head camera follows the base heading.
A depth-gradient error that caused large diagonal ambient-occlusion artifacts on
flat walls was corrected and has a regression test. Shadows and surface patterns
were softened, and the camera composition gives a wider working view.

The new **WebGL2 backend** contains metallic/roughness GGX shading, filtered
shadows, antialiased procedural surfaces and filmic output. It is original code,
not Three.js, Rapier or a downloaded engine. It shares geometry with the CPU path.
**WebGL2 could not initialize in the test environment. Its shader/runtime path is
implemented but unvalidated.** The header reports the actual selected backend.
Every supplied screenshot and executed browser check used the improved CPU/WASM
renderer. GPU startup/render failure selects that explicit fallback. Failure of
WASM retains the legacy, explicitly announced 2D mode; recording is unsupported
in that last-resort mode rather than fabricated.

This remains simplified authored geometry, not photorealism, a room scan, a cloth
simulation, ray-traced lighting, or a physically articulated robot. Camera motion
on the CPU can still be slow. No device FPS/latency or GPU-performance claim is made.

## Navigate and manipulate

- Click an object or its task to approach and pick, open or flag it. Click its
  requested destination or the Place button to deliver it.
- Click open floor to request a route. In Room/Overview, WASD/arrows drive relative
  to the view. In Robot camera, W/S move forward/backward, A/D turn in place,
  and Q/E strafe. Right-drag looks independently: it never steers the base.
- C or **Center view** resets look/zoom. Switching views preserves each view's
  look/zoom; clicking the already-active view does not reset it.
- Room / Robot camera / Overview switch views; right-drag looks, scroll changes
  field of view. Overview hides the ceiling. Cameras do not directly command arms.
- U undoes, P pauses, H hints, M toggles optional music/effects.

The six existing shifts and permissions remain. Manipulation is assisted kinematics,
not independent joint control or frictional contact. Only one item is carried.

## Record a virtual hotel episode

Enter a room, press **Record episode**, read the disclosure, check its fresh
unchecked consent box, then press **Start local recording**. Play normally. Use
the visible **Stop** badge or recording panel, then **Export ZIP**. Discard releases
stored data and resets consent. No automatic upload or persistent dataset storage
is added. A pending PNG already captured before Stop may finish encoding.

The ZIP contains aligned rendered RGB, optical-axis depth, stable instance labels,
per-frame camera intrinsics/extrinsics, robot/base and object state, normalized input
requests, completed assisted game actions, and symbolic support/grasp transitions.
The selected view is recorded: there is not yet simultaneous head/wrist capture.
Game RGB excludes the interface. It is NOT the webcam. No raw hands, microphone,
credentials, or player-room imagery enter these archives.

Limits: requested 2 frames per simulated second, 480-pixel width, at most 120 frames,
60 active simulation seconds, 96 MiB image/array bytes and bounded action/event
counts. Actual times are exported. Slow encoding skips frames; it does not invent
fixed-rate data. Pause freezes simulation/capture; hidden tab, room reset, mission
completion and opening the bench stop a hotel take.

**Hotel contact data is symbolic.** A held-object relation is not a physics contact.
Contact points, normals, forces, impulses, tactile data, joint angles and torques
that are not modeled are `null`/unavailable, not fake zero-valued measurements.
See `docs/STUDIO_DATA.md` before using recordings for experiments.

## Synthetic contact / tactile bench

Press **Contact bench** to open an independent analytic fixture. The hotel pauses.
Move indentation and contact-offset sliders to compress two virtual pads against
an object with prescribed fixed pose. Each pad has 16 × 16 pressure cells. Pressures
are in Pa, normal forces in N and centers of pressure in surface coordinates.

The force law is a unilateral spring-damper; the footprint is an assumed normalized
Gaussian. Pressure × taxel area sums to the modeled normal force. A settled 2 mm
compression under the default 800 N/m stiffness gives 1.6 N per pad. This is a model
calculation, not a measurement of an in-game cup grasp or physical sensor.

A separate checkbox permits local bench recording and ZIP export. Bench samples
have explicit simulation times, world normals, equal/opposite modeled forces and
begin/persist/end phases. Model stepping is 1/60 s, but wall-clock rate is not
guaranteed. Maximum 1,800 samples / 30 model seconds or 32 MiB JSON. Closing/hiding
stops the take. Shear, slip, object dynamics, joint torque, sensor noise, elastomer
optics and calibration are not implemented. Do not train or advertise this as
validated hotel manipulation tactile data.

## Inspect an export

```sh
python tools/inspect_episode.py goodbot-episode.zip
# Optional visualizations / world-coordinate PLY point cloud:
python -m pip install -r tools/requirements-data.txt
python tools/inspect_episode.py goodbot-episode.zip --frame 4 --out inspected
```

The script checks ZIP shape/limits, reads typed arrays without unsafe extraction,
and reconstructs rays using the recorded original-raster intrinsics and sampling
map. A successful reprojection check tests conventions, not real-world calibration.

## Build, validate and hand off

```sh
npm run package:site
python tools/standalone.py
# Only needed when modifying the C rasterizer:
python tools/build-renderer.py
```

The precompiled WASM has zero imports and is embedded in `raster-data.js`.
Regeneration needs Clang/wasm-ld. Runtime assets are local except optional hand mode.
Read `docs/TEST_REPORT.md` for executed tests, not just planned ones. The opt-in
`deploy/pages.yml` is for a separate destination and now explicitly requires a GPU
browser pass. It has not run remotely. Do not weaken that gate or replace Driftfall.
`CLAUDE_HANDOFF.md` covers integration and unverified release gates.
