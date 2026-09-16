# GOODBOT Apprentice 04 — handoff for Claude

Owner: Aditya Gudal. Version: 0.4.0. Complete independent GOODBOT source.
No Claude session was contacted; no remote branch/push/deployment was performed.

## Mandate

The owner found the chore-selection loop boring. Keep the hotel world, but make
teaching a robot into a partner the main progression. This release implements the
first narrow, genuinely fitted local apprentice rather than just describing it.

Baseline: supplied `goodbot-studio-03-camera-fix-source.zip` (0.3.1), preserving the
robot-camera controller fix, renderer, recording/contact bench and original campaign.
It is NOT a current remote checkout. Read repository instructions and compare newer
work before merging. Do not overwrite Driftfall or replace its publishing destination.

## First read

- README.md: controls, local run and current release scope.
- docs/APPRENTICE.md: model, information firewall, provenance and limitations.
- docs/TEST_REPORT.md: actual executed tests, failures fixed, remaining gates.
- docs/CHANGELOG.md: new work followed by historical changes.

## New modules

- public/src/lessons.js: three authored request contexts and feasible layout variations.
- public/src/apprentice.js: observations, legal candidate enumeration, sparse linear
  softmax fit, evidence matching, notebook validation and data-only serialization.
- public/src/apprentice-session.js: consented pre-decision drafts, completion matching,
  fit ownership, preview/run/ask/takeover, attempt provenance, pause/undo behavior.
- public/src/apprentice-ui.js and public/apprentice.css: lesson hub, Teach/Learn/New
  layout/Your turn, explicit consent, takeover, compatible destinations, notebook UI.
- tests/apprentice.test.mjs and tests/apprentice_browser.py: learner and integration
  regressions. tools/evaluate-apprentice.mjs: reproducible authored-layout evaluation.

## Important code differences

Game.command admits task-incorrect but compatible placement ONLY for the authored
learningSandbox scenes. Ownership, type/capacity checks and completion evaluation stay
in place. Ordinary six-shift campaign strict destination behavior is unchanged.
Game history and the existing episode recorder identify autonomous commands with
apprentice:vN rather than labeling them as human input. App exposes a copied diagnostic
summary, not mutable state or test setters. Build and browser harness module order
include the new modules. Source/static previews include the additional stylesheet.

## Do not overclaim

Nori learns high-level action choices from structured virtual state. It does not learn
vision, tactile sensing, physics, arm joint control, navigation, moral behavior or
arbitrary language. The deterministic task director is not the learned apprentice.
Its solved plan and hidden desired destinations must NEVER enter learner features or
candidate filters. Hand tracking is an optional pointer, not arm teleoperation.
The analytic pressure bench is not hotel tactile data. Old RGB episode ZIPs are not
silently converted into training examples. Import accepts only the new notebook schema.
Training agreement is not held-out accuracy; semantic preference weights are not
calibrated probabilities. A taught context must not be confused with generic knowledge.

## Privacy and regression requirements

No teaching without a fresh unchecked consent acknowledgement. No autoplaying a loaded
model. No research upload, camera frames, raw hands, audio or API credentials in the
notebook. Persistence/export are explicit. Stop/hidden tab/pause/takeover must preserve
cargo and not silently resume. Keep original camera-consent and recorder-consent flows.
Do not relax test assertions or replace the actual policy with the task compiler to
make the apprentice appear successful. A built-in safety block is not learned success.

## Next priorities

1. Run normal HTTP/CSP, real WebGL and live-device checks. Preserve explicit renderer
   requirements; do not count a CPU test as GPU evidence.
2. Playtest teaching comprehension, accidental examples, interruption clarity and
   whether people voluntarily teach a second routine. Do not infer fun from unit tests.
3. Add a visible before/after replay comparison using real versions on the same initial
   state. Keep correction-contaminated layouts out of unseen evaluation results.
4. Improve comfortable hand manipulation and authored task complexity only after the
   loop works. Cooperative parallel work and larger scene variations are deferred.
5. For learning beyond these three contexts, define a larger observation/action grammar
   and nontrivial held-out tasks. Avoid leaking the instruction compiler's answer key.

Deliver source/static/evidence checkpoints with actual checksums and changelogs after
concrete improvements. Do not claim deployment or another agent's action without proof.
