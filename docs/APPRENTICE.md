# Nori: implementation and data contract

## Product slice

Teach → Learn → New layout → Your turn → Take over. Three authored lessons reuse the
hotel geometry: collect cups, set tea, and replenish folded towels. The policy may
choose incorrectly; rejected execution and low preference separation stop it for help.
No policy updates happen invisibly. New examples make the fitted model stale until the
player presses Learn. Existing examples are retained in subsequent fits.

## Implemented versus deferred

Implemented: actual local training; consented decision collection; pre-action state;
completion checks; learned destination selection; explicit previews; interruptible
execution; context/phase abstention; correction links; bounded notebook persistence;
data-only import/export; random authored layout variants; pure/interactive regressions.

Deferred: general-language task understanding, arbitrary room generation, learned
navigation, physical grasp controllers, image/tactile encoders, inferred contact forces,
old episode-ZIP import, multiple robots, simultaneous player/robot work, a test-room
editor, online sharing, large-scale learning and real-world usefulness studies.

## Model

`public/src/apprentice.js` implements a linear softmax scorer. Each candidate contributes
seven sparse binary symbolic features crossing an authored request context with action
kind, object type, source/destination role, held type, remaining source count (bucketed
at 3), and cupboard state. There are no absolute coordinates, object names/IDs, colors,
goal destinations, task-list order, success predicates or recorder images in these
features. Coordinates are used only by an explicit nearest-object tie break among
feature-equivalent candidates, and by the built-in navigation controller.

Duplicate feature-equivalent actions form one class during training and ranking. A
human may select either of two equivalent cups without the other becoming a negative
semantic example. Each fit starts from zero weights over all retained examples, using
220 gradient epochs, averaged cross-entropy gradients, a 0.55 learning step and 0.0015
weight decay. It yields to the browser every 12 epochs. Corrections are explicitly
linked to a learner attempt and have weight 2; ordinary examples have weight 1.

The ordinary cup-round demonstration contributes five successful decisions: pick,
place, pick, place, finish. This currently yields 46 nonzero/learned parameter slots.
Teaching one example per lesson contributes 16 decisions and 136 parameter slots.
These counts are properties of the included small task grammar, not scale or accuracy
claims. The displayed training-match count is NOT a held-out metric.

The learner asks for help without a fitted model, with pending unfitted examples, in
an untaught context/held-object phase, or when the top two semantic preference weights
differ by less than 0.04. The last rule is a hand-set heuristic, not calibrated
uncertainty. It does not guarantee abstention on every unfamiliar situation.

## Information firewall and guardian

`observeForPolicy` is the sole learner observation constructor. It never reads
`game.plan`, `desired`, taskDone, success labels, score or history. It supplies object
ownership/movability/protection, positions, locations, held state, zone types/capacity,
permission and cupboard state. This is privileged structured game metadata, not robot
camera perception. The source-count feature means currently movable hotel objects
still at their source, not objects known to be at a wrong goal destination.

`legalActions` excludes protected/guest objects, full or type-incompatible zones and
closed-container pickups. It offers finish whenever hands are empty, even when the
room is incomplete. It does not call navigation, task completion or the solution
compiler. Execution uses the original Game API; navigation may fail, and finish may
be rejected. Both lead to help rather than forced success. Original campaign rules
still forbid task-incorrect destinations. Only `learningSandbox` authored scenes allow
physically compatible alternative destinations, retaining ownership and permission
checks and unchanged goal evaluation.

Human task cards still show instructions and suggested goals. They are teaching aids,
not policy inputs. Unit tests make hidden fields throw on access, alter goal labels,
and verify observations/scores remain unchanged.

## Episode and action ownership

`ApprenticeSession` wraps the already-instrumented Game commands. While consented
teaching is active, it records an observation and alternatives BEFORE command dispatch,
then commits a draft only when the corresponding assisted execution appears. Cancelled,
rejected or outside-vocabulary actions do not become positive training examples.
Finish revokes teaching consent synchronously, rather than waiting for a render frame.
Undo removes an example only when it matches the exact undo snapshot. An untaught
later action cannot accidentally remove an older demonstration.

Autonomous commands run through the same game/recorder API. They carry
`apprentice:vN` provenance and are never self-labeled as human demonstrations. Preview
lasts 0.95 active simulation seconds; Take over cancels routing while retaining cargo.
A run has a 32-decision limit. Pause, hidden tab, lesson change and tracking-loss pause
stop autonomous work/teaching. Resuming requires explicit user action. No intervention
starts consented collection on its own.

## Notebook format

Schema: `goodbot.apprentice.v1`, model: `linear_softmax_action_ranker`.

A notebook contains weights, version, examples, dirty state, optional fit metadata,
and privacy/limitations metadata. UI exports also include a bounded recent-attempt log.
A demonstration includes context, held phase, whitelisted virtual observation,
candidate feature lists, selected index, chosen action semantics, source room seed,
request/completion simulation timestamps, assistance type and optional correction link.
It contains neither RGB images nor raw webcam/hand/audio data.

Limits: 256 examples, 48 candidate actions per decision, 24 features per candidate,
20 objects/12 destinations per observation, 2 MB import size, finite bounded parameters,
known symbolic fields, and reconstructed-feature consistency. Import never executes
file content. Imported attempts/training accuracy are not used as verified evaluations.
Browser persistence is opt-in; restoring a saved notebook does not restore teaching
consent or start the robot.

## Evidence and correct interpretation

Pure tests can exercise many authored layout seeds cheaply via normal Game commands.
The browser suite demonstrates and trains with actual UI events, then lets the learner
finish a fresh seed. It does not assign weights, teleport objects, mutate scene state,
force completion or accelerate the simulation clock. Read-only diagnostic snapshots
are used only for assertions. A fresh room is marked as previously taught when its seed
appears in the notebook; after a correction it is not a novel evaluation layout.

Reference-teacher unit tests use ordinary commands from an explicitly scripted teacher,
not physical player recordings. Results on those finite authored layouts are not
human playtest results, arbitrary-layout generalization, a safety guarantee, or
real-world robot competence. The high-level motion skills remain authored assistance.

## Research context

This sparse correction loop is motivated by interactive imitation-learning ideas, not
an implementation of the full DAgger algorithm or its guarantees. Ross, Gordon and
Bagnell (2011), “A Reduction of Imitation Learning and Structured Prediction to No-Regret
Online Learning,” describes why learner-induced states matter for sequential prediction:
https://proceedings.mlr.press/v15/ross11a.html . Here the player selectively intervenes,
the model is tiny, the state is structured, and evaluation stays inside the game.
