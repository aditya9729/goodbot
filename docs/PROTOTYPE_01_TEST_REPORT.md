# GOODBOT Hotel Prototype 01 — verification report

Date: September 15, 2026. Version: 0.1.0. Independent new game; no remote deployment.

## Executed on the final game source

| Check | Outcome | What it establishes |
|---|---|---|
| JavaScript syntax | 15 modules passed | Source, server and build scripts parse in Node 22.16.0 |
| Node tests | **58 passed, 0 failed** | All six levels complete with ordinary simulation commands; 100 seeds × six scenario variants compile; permission, capacity, footprint/support, dependencies, undo, collision, cancellation, input, camera lifetime, request guards and mocked API/server checks |
| Browser regression | **11 scenarios passed, 0 failed** | Same final game source in explicitly documented memory harness; actual UI/mouse/keyboard/touch events; full six-shift campaign; synthetic camera/inference |
| Exact static asset checks | **30 passed** | All 15 public files served byte-for-byte at root and /goodbot/, with HTTP content types recorded |
| Standalone preview | Passed | Exact bundled HTML executed via set_content with its own CSP retained; boot/play controls work; camera/API disabled; no HTTP requests |
| Visual inspection | Performed | Desktop room and lobby; mobile full-page rendering; task board, consent and completion screens captured |

Environment: Node 22.16.0; Python 3.13.5; Playwright 1.57.0; installed Chromium in
headless mode. Renderer is always Canvas2D isometric geometry by design—not a
fallback secretly substituted for a failed WebGL renderer.

## Eleven final browser scenarios

1. Landing starts without camera access or AudioContext, draws the real room,
   permits an actual canvas-object click, delivery and completed first shift.
2. All six campaign shifts complete through task-button/placement/finish/next UI.
   The test never mutates gameplay states, teleports the robot or forces a win.
3. Real keyboard drive, undo after pickup, and pause/resume.
4. Fresh consent checkbox gating and synthetic camera permission denial; video-only
   constraints checked.
5. Cancellation before permission resolves stops the late-arriving stream.
6. Synthetic calibration, missing-hand pause, and Stop from the pause screen;
   cargo remains held throughout.
7. Synthetic palm motion and pinch select a real task button and Place button,
   causing ordinary robot approach, pickup, travel and delivery.
8. A simulated hidden-tab event releases the synthetic camera and pauses play.
9. Optional AI request has its own initially unchecked consent; free local scene
   remix works without a provider or API key.
10. Real Web Audio context starts only on activation and suspends/resumes with
    pause/mute controls. This is not a human listening-quality evaluation.
11. Mobile layout fits its viewport; actual touch events select and deliver an item.

No unexpected JavaScript page errors were reported in the final run. Simulation
time was not accelerated and browser tasks used the normal input paths. Direct
state construction is used only in named adversarial Node tests (for example a
floating object must not count as a delivery), not to force campaign success.

## Important validation boundaries

Normal Chromium navigation to HTTP/data origins was blocked by the managed
execution environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). The browser policy was
not changed. `--memory` loaded the same modules as blob URLs into an allowed blank
document and injected CSS. It removed CSP **from the test document only** and
replaced the worker URL to support named synthetic camera mocks. The shipped
source HTML retains its CSP and real worker path.

Therefore the final browser suite is **not evidence of normal HTTP module loading,
production CSP behavior, real MediaPipe downloads/inference, real webcam permission
prompts, physical tracking quality, or a deployed GitHub Pages site**. The 30 HTTP
checks establish exact server bytes, not browser policy correctness. The separate
standalone check kept that bundle's own CSP intact, but file:// navigation itself
was not tested because of the same navigation restriction.

No live AI requests were made and no user key was supplied. The Responses adapter,
refusals/incomplete output, schema/semantic validation and server controls were
exercised with mocked provider responses. Actual model compatibility, latency,
quality, usage cost and provider retention configuration remain to be checked.

No physical robot, real hotel scene, cloth/contact solver, real hotel procedure,
multiplayer, mobile Safari/Firefox, GPU performance, latency/fatigue study, research
transfer evaluation, accessibility certification or commercial readiness claim is
established by these tests.

## Defects found and addressed

The initial browser pass completed the full campaign but failed the camera-stop
case after tracking loss: the gameplay Stop control sat behind an active pause
modal. A second, directly operable Stop control was added inside that modal.
Targeted camera tests and the final complete regression pass now verify that
stopping capture preserves cargo. The earlier failing report is retained in the
QA package for transparency.

Additional review strengthened full object-footprint support checks, whole-chair
route clearance, direct-drive timestep clamping and the paid-request budget
reservation after asynchronous body parsing (preventing a concurrent request race).
New regression cases cover footprint and timestep behavior. Core and browser
results reported above were produced after these game changes.

## Not remote work

No GitHub clone was overwritten, branch pushed, Actions workflow run, Pages setting
changed, paid service created, or Claude session contacted. The opt-in deployment
example must be reviewed in a separate GOODBOT repository. It defaults to actual
HTTP browser tests, not the restricted-environment harness.
