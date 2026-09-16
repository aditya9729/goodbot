# GOODBOT Apprentice 04 — verification report

Version **0.4.0**. Generated **2026-09-16T03:53:23.735923+00:00**. Based on the supplied camera-fixed 0.3.1
source, not a current remote checkout. No remote push, deployment, API request,
Claude-session contact, real webcam capture or physical robot connection.

## Final executed results

| Check | Result | Scope |
|---|---|---|
| JavaScript syntax | 31 modules passed | Source, server and tools; not GPU shader validation |
| Node tests | **133 passed, 0 failed** | Original 107 plus 26 apprentice/lesson/data/controller regressions |
| Apprentice browser | **5 scenarios passed** | Exact standalone with own CSP, actual UI teaching/fitting/rollout, takeover, consent, malformed imports and mobile |
| Existing gameplay browser | **11 scenarios passed** | Full six-shift campaign, input, undo, synthetic camera lifecycle, audio, AI consent and touch |
| Robot-camera browser | **6 checks passed** | Reverse/strafe/turn stability, look/zoom persistence, ordinary pickup/delivery and pause |
| Perspective browser | **3 checks passed** | Actual views, picking, look/zoom and delivery |
| Recording/contact-bench browser | **7 checks passed** | Real downloaded virtual-episode and independent tactile-model ZIPs; consent/lifetime/alignment |
| Standalone boot | Passed | Exact bundled HTML, own CSP retained, no HTTP requests |
| HTTP assets | **64 byte/MIME checks passed** | 32 public assets at root and /goodbot/; absent asset returns 404 |
| Authored learner benchmark | **60/60 scenarios completed** | Reference-script demonstrations, normal Game APIs, new seeds in same authored layout family |

The 32 browser scenarios/checks above exclude the separate standalone boot check.
No game state was changed to force a browser win. All executed browser rendering was
CPU/WASM. The learner was not given handcrafted weights or the compiled task answers.

## Actual browser teaching evidence

The browser test entered the cup-round lesson, acknowledged teaching consent, used
ordinary task and placement buttons for two cup deliveries, and pressed Finish. That
produced **5 completed decision examples**. Pressing Learn fitted **46 parameter slots**
with real gradient updates. New layout changed the cart/cup positions and room seed.
Your turn completed the new room in **5 learned decisions**, through the ordinary
Game command API, with **0 interventions**. No further teaching examples were added
by the robot's own rollout. The downloaded `browser-trained-nori.json` contains the
actual notebook and learned weights from that run.

The demonstration inputs were automated browser UI events, not a physical human
playtest. This proves integration on the tested scenario, not that people find the
loop enjoyable or that one example teaches a broadly capable robot.

The same test switched to the untaught tea context and verified that the apprentice
asked for help without dispatching a task. The explicit Take over test stopped an
autonomous controller and verified consent was not implicitly enabled. Pause also
stopped autonomy. JSON round-trip and structural/feature validation were exercised in
Node; a malformed UI import was rejected. Normal-origin persistence across real
browser reloads is not established by these tests.

## Reference-teacher benchmark: interpret narrowly

`tools/evaluate-apprentice.mjs` records an explicit scripted teacher through ordinary
Game commands: 5 decisions for collecting cups, 5 for tea service, 6 for towels. A
single fit over these 16 examples produced 136 parameter slots. It then completed all
60 evaluation-only seeds (20 per context). The empty model asked for help in all 60.

The empty-model comparison is NOT a comparison against a capable baseline. Task
contexts were taught; only cart/cup placements and equivalent object order changed.
The furniture/layout family and high-level primitives remain authored. This is not
arbitrary-room generalization, image understanding, contact learning, a safety
certificate, transfer to physical robots or an AI-trust/user-outcome study.

## Information and privacy checks

Tests verify that goal fields and the solved plan can throw on access without breaking
the policy observation. Changing hidden destinations does not alter policy features
or scores. The candidate mask always offers Finish with empty hands, even before
completion. Only teaching scenes allow compatible but task-incorrect placements; such
placements do not satisfy goals. Original campaign destinations remain strict.

Teaching requires its own initially unchecked consent. Only completed actions enter
the notebook. Rejected/cancelled actions do not become positive labels. Finish stops
teaching synchronously. Exact undo-snapshot matching prevents erasing unrelated data.
Autonomous action provenance is separate from human choices. Import rejects unknown
fields/media payloads, malformed features, inconsistent explanations and nonfinite or
out-of-range weights. Camera frames, raw hands, microphones and API credentials are
not in the notebook. Persistent storage and download require explicit player actions.

## Browser/runtime boundaries

The current HTTP attempt returned `ERR_BLOCKED_BY_ADMINISTRATOR`; its actual failure
log is retained. Managed policy was not changed. The apprentice, robot-camera,
recording, perspective and standalone checks used exact bundled HTML via set_content
with its own CSP retained. The original campaign used its explicitly named --memory
harness, removing CSP only from that test document. These are not normal HTTP/file
navigation or production-deployment tests.

A current blank-page probe reports WebGL2 unavailable. This release retains the
previous GPU backend, but it has not been validated here. No physical webcam/model,
Safari/Firefox, hardware frame rate, comfort/fatigue or real-device persistence study
was performed. Synthetic hand-control regressions are not physical tracking evidence.

## Defects/fixture corrections during development

- A completed human demonstration initially retained teaching consent until the next
  animation frame. Finish now clears it synchronously; a dedicated unit test and
  the final browser journey pass.
- Undo initially could remove a prior taught example after a newer untaught action.
  It now requires identity with the exact undo snapshot.
- A lifecycle-guard edit accidentally prevented preview/running ticks. Unit tests
  caught it; the guard is now limited to starting a new run. Final autonomous tests
  complete normally.
- One adversarial test changed desired fields after Game had already compiled its
  goals. The corrected fixture constructs the alternate goal before Game creation;
  the assertion remains that an incorrect finished arrangement is rejected.
- An early browser script tried clicking Export inside a closed notebook. The final
  script opens it through the ordinary UI first. An interrupted runner without a
  final result is not counted.
- The old robot-camera script pinned version 0.3.1 and stopped before exercising
  controls on 0.4.0. It now compares against package.json; the full six checks were
  rerun and passed, without weakening any movement or camera assertions.

## Evidence map

`FINAL_SUMMARY.json`, `node-final.txt`, `syntax-final.txt`, `learner-benchmark.json`,
`apprentice-final/`, `campaign-final/`, `robot-camera/`, `recording/`, `perspective/`,
`http-assets.json`, `environment.json`, and the exact standalone report are included
in the evidence archive. Earlier failures and final reruns are kept distinct.

Read `docs/APPRENTICE.md` for the model, notebook schema and deferred work. The
original six-shift hotel remains an assisted kinematic game; the pressure bench is
still independent analytic data, not contact sensors on the robot.
