# GOODBOT Hotel Prototype 02 — verification report

Date: September 15, 2026. Game version 0.2.0. Perspective visual update.
No remote commit, deployment, physical robot connection or external AI request.

## Results

| Check | Final result | Scope |
|---|---|---|
| JavaScript syntax | 20 modules pass | Renderer, game, server and tools |
| Node tests | 67 pass, 0 fail | 58 existing + 9 geometry/raster regressions |
| Gameplay browser regression | 11 scenarios pass | Actual WASM backend asserted; normal UI actions; memory harness |
| Perspective browser checks | 3 scenarios pass | Three views, orbit/zoom, canvas picking and ordinary delivery |
| Standalone bundle | Pass | Exact HTML, own CSP retained, no HTTP requests, camera/API disabled |
| HTTP bytes / MIME | 40 checks pass | 20 files at root and /goodbot/; missing asset returns 404 |

The browser regression completes all six shifts via ordinary task/pick/place/finish/
next actions. It does not teleport the robot, mutate game state, or force completion.
It also checks keyboard driving, undo, pause, denial/cancellation/late permission,
synthetic calibration and hand selections, tracking loss while holding cargo,
hidden-tab cleanup, separate AI consent, local remix, audio and mobile touch.

The final regression explicitly requires `Perspective 3D · WASM`, not the retained
2D fallback. An earlier run passed gameplay but still emitted a hard-coded legacy
renderer label; the harness label was fixed, an explicit renderer assertion added,
and the complete suite rerun. Those final outputs are the delivered evidence.

New Node tests cover zero-import WASM loading, finite geometry/material capacities
for all six scene variants, normalized rounded normals, depth occlusion, exact
baked-buffer restore, dynamic rendering without game-state changes, near-plane
clipping, ceiling omission only in overview, and orthonormal camera basis. The
near-plane fixture was corrected during development: its original triangle lay on
a plane through the camera and therefore projected to a degenerate line. The final
fixture genuinely crosses the near plane with visible projected area.

## Browser environment and boundaries

Node 22.16.0; Python 3.13; Playwright and headless Chromium in the working container.
Normal browser navigation is blocked by managed policy. That policy was not changed.
The full gameplay suite uses `--memory`, loading the actual modules as blob URLs
and injecting the real styles. Only that test document removes the source CSP.
Synthetic capture/worker replacements exercise camera lifecycle and input logic.
They do not test a physical webcam, permission prompt, actual MediaPipe inference,
or recognition quality.

Separate standalone tests execute the exact generated HTML with `set_content` and
retain its CSP, including permission for WASM compilation. They assert the actual
renderer and absence of HTTP requests. These are not file:// or normal HTTP browser
navigation tests. Forty urllib HTTP checks establish server byte and MIME correctness,
not browser CSP/navigation behavior. Source-browser CSP and the optional real
camera/model path remain release gates. The opt-in workflow has not run on GitHub.

WebGL context creation was unavailable. All new screenshots and tests use the
shipped CPU/WASM renderer, not a WebGL substitute presented as GPU evidence. An
explicit fallback banner is present for players whose WASM cannot initialize; the
final renderer-asserting browser tests cannot silently use that path.

## Performance and visual limitations

Three observed camera-rebake samples were 412.8 ms (room), 136 ms (robot), and
187.8 ms (overview) in the headless standalone test. These are single operation
samples at adaptive internal resolutions, not average FPS or input latency. Camera
motion can be slow; static architecture is cached for ordinary robot motion. There
has been no GPU, hardware-device, battery, latency, fatigue or thermal benchmark.

Shading is approximate and some triangle/shadow seams remain visible. Reflections
are not physically accurate; decorative mirror-like panels are not live mirrors.
Robot contacts/placement remain assisted kinematics. Static duvet shapes and folded
towels are not cloth simulation. Doors animate visually without a new swept-volume
physics solver. Dynamic shadows use approximate contact footprints over a static
shadow map. This is not a scanned or calibrated hotel, a research digital twin,
a validated hospitality training system, or a photorealistic finished game.

## Evidence

`node-final.txt`, `syntax.txt`, `regression/report.json`, `browser-run.log`,
`perspective/report.json`, `standalone.json`, and `http.json` are included in the
separate evidence ZIP. Screenshots are actual running code. No generated concept
image is represented as gameplay. Earlier diagnostic PPMs and obsolete captures
are omitted from the release evidence to keep the archive small.
