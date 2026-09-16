# GOODBOT Studio 03 camera hotfix — verification report

Version **0.3.1**. Built from the supplied Studio 03 (0.3.0) source archive.
Final report generated 2026-09-16T03:05:28.200692+00:00. No repository push, site deployment, user-device
modification, Claude session contact, API call or physical webcam test.

## Reproduced defect

The original exact standalone produced alternating forward/back movement while S
was held in Robot camera. Ten nonzero successive movement deltas included nine
direction reversals. The controls used the rendered camera basis and then turned
the robot to face the requested motion, changing that basis again next frame.
`baseline.json` contains the original browser samples. This was not inferred solely
from code or simulated by changing the player's scene during a test.

## Final executed results

| Check | Result | Evidence scope |
|---|---|---|
| JavaScript syntax | 26 modules pass | Game, server, build tools; not GPU shader compilation |
| Node unit tests | **107 pass, 0 fail** | Original 94 plus 13 controller/camera/cache regressions |
| New robot-camera browser suite | **6 pass** | Exact standalone, own CSP; ordinary key/mouse inputs; real cup pickup/delivery |
| Gameplay browser suite | **11 pass** | Full six-shift campaign, consent/camera mocks, keyboard, touch, audio, undo |
| Existing perspective suite | **3 pass** | Three views, mouse look/zoom, scene picking/delivery |
| Recording/contact-bench suite | **7 pass** | Actual ZIP downloads, aligned buffers, stop/discard, close/Escape, tab hide |
| Standalone boot check | Pass | Exact regenerated HTML, own CSP retained, no HTTP requests |
| HTTP assets | **54 byte/MIME checks pass** | Exact public files at root and `/goodbot/`; missing asset gives 404 |

All screenshots and executed browser rendering used **CPU/WASM**. The targeted
robot-camera test observed a maximum automatic-heading step of
0.120000 radians, bounded by 2.4 rad/s times the 0.05 s maximum
simulation step. Reverse/strafe kept their heading; A/D turned without translation;
look/zoom persisted across view changes; pause released held turning controls.
The original full campaign and recording suites were rerun on the final source,
including the recorder-close correction, not just before it.

## Render-cache check

At equal 640 x 460 resolution, a deterministic 24-pose Node raster comparison found
all frame hashes identical before/after shadow caching. Median static bake cost over
the final 20 samples was 187.3 ms versus 145.6 ms on this container. This isolates
shadow-cache work; it is NOT whole-game FPS or a physical-device/GPU benchmark.
The live CPU robot view additionally uses 384-pixel width while moving and restores
up to 640 after 250 ms idle. This trades temporary sharpness for responsiveness.
Source-raster intrinsics and actual per-frame dimensions remain in each recording.
No sensor frame is substituted with an old image shifted on screen.

## Additional defect found during regression

The first recording regression failed an immediate stop assertion after closing the
pressure-bench dialog. Its close event was queued by the browser. Close-click and
Escape now stop the take and clear consent synchronously, retaining the close event
as a fallback. The failure is preserved in `recording-close-race-before-fix.txt`.
Both immediate close and Escape cases passed on the final source. The initial
interrupted full-suite attempt is not counted; the completed final run is used.
Early unit-fixture corrections (a blocked test start position and avoidable floating
angle churn) were resolved before final validation; no pass/failure conditions were
weakened to hide reverse movement or camera jumps.

## Validation limits

Normal file navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`; managed policy was
not modified. Exact-bundle checks used `set_content` with their own CSP retained.
The full source gameplay suite used the documented `--memory --renderer cpu`
harness, removing CSP only from that test document. These are not normal file/HTTP
browser navigation or deployed-CSP tests. HTTP byte checks do not close that gap.

WebGL2 was unavailable, so GPU rendering/performance and GPU static-upload changes
remain unverified. Physical webcam/MediaPipe, Safari/Firefox, this user's Mac/browser,
input-to-photon latency, sustained hardware FPS, camera comfort/fatigue and production
readiness remain untested. No 60 FPS guarantee is made; CPU movement can still be
slower than a production GPU renderer.

## Data/privacy boundaries

The new body-frame control requests are recorded as `directRobot` numeric actions
only after existing episode consent. No actual key codes, raw hands, webcam frames,
microphone, credentials or research uploads were added. RGB/depth/labels and camera
transforms describe the actual virtual camera, with no hidden positional lag.
Hotel contacts remain symbolic and tactile/force values remain unavailable there;
the pressure bench stays a separate analytic fixture, not hotel sensor data.

## Reproduce

From `goodbot/`: `npm run check && npm test`, then `python tools/standalone.py`.
Use `python tests/robot_camera.py`, `python tests/perspective.py`,
`python tests/recording_browser.py`, and `python tests/standalone.py` for exact-bundle
CPU checks. Use `python tests/browser.py --renderer gpu` with the local server on
an actually supported machine for the normal HTTP/GPU gate; do not substitute a CPU
pass or the restricted harness for that release check.

## Evidence files

`node-final.txt`, `syntax-final.txt`, `baseline.json`, `camera-benchmark.json`,
`robot-camera/report.json` and traces, `browser-final/report.json`,
`recording/report.json`, `perspective/report.json`, `http-assets.json`, the standalone
log/report, the caught close-race log, and actual browser screenshots/exports.
