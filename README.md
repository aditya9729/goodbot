# GOODBOT / Make Room — Apprentice 04

**Version 0.4.0 · Nori, a locally trainable apprentice**

Built from the supplied Studio 03 camera-fixed source (0.3.1), not a current remote checkout.
This is a complete independent GOODBOT project. Driftfall is not modified. Nothing has
been pushed, published, or delivered to a separate Claude session.

## Play

Open the supplied **GOODBOT-Apprentice-04.html**, or this project's historical bundle
filename `GOODBOT-Real-Look.html` (same generated game). The single-file preview has
no HTTP dependencies and deliberately disables webcam and external AI controls.
Learning, local notebook exports, music, virtual episode recording and the separate
analytic contact bench work without API keys.

1. Select **Meet Nori** in the welcome panel, or **Apprentice** in the header.
2. Select **The cup round**. Click **Teach**, read the local-teaching notice and opt in.
3. Pick a cup through the scene or its task card; choose **Cups · service cart** in
   the apprentice panel. Repeat for the second cup, then press **Finish shift**.
4. Press **Learn** to fit the small model. Press **New layout** to move the actual cart
   and cup positions. Press **Your turn** to watch Nori choose and execute the job.
5. Use **Take over** to stop. **Teach** opens a fresh consent choice to label a
   correction. Taking over by itself does not begin data collection.

The other two lessons are **Tea for two** (cups belong on the desk tray) and **Fresh
beginnings** (open the cupboard, then move folded towels to the shelf). A model trained
only on collecting cups explicitly asks for an example of an untaught request.

The original six-shift campaign remains under **Your shifts**, without changing its
strict destination and permission rules. The Robot-camera control fixes are retained.

## What actually learns

A linear softmax action scorer is fitted locally by gradient descent. It starts with
no demonstrations and no routine weights. The inputs are whitelisted structured virtual
state and one of three authored request contexts, **not pixels or raw sensor data**.
It chooses existing pick/place/open/finish skills. It cannot read the solved task plan,
hidden desired destinations, completion predicates, or the human's task-card ordering.

Navigation, reach-and-place animations, compatible-object checks and protected-object
rules are authored assistance. Equal learned action types use a nearest-object tie
break. These helpers are not learned skills. Prediction weights are not calibrated
success probabilities. Read `docs/APPRENTICE.md` for the exact model and data boundary.

Compatible but task-incorrect placements are possible **only in apprentice lessons**.
They do not satisfy the task. This lets the learner genuinely choose between the cart
and tea tray rather than inherit a destination answer from the legality filter.

## Learning data and privacy

Teaching needs a separate, initially unchecked consent choice for each take. It records
virtual pre-decision snapshots, alternatives, selected/completed skills, timestamps,
assistance labels and correction links. It excludes webcam frames, raw hand landmarks,
microphone audio, API keys and research uploads. No external training request is made.

The notebook stays in memory unless you explicitly enable **Keep this apprentice on
this browser**, or export a JSON file. Import validates the version, size, feature/state
consistency, numeric weights and allowed fields; it never executes imported code.
**Forget apprentice** removes its model/examples and optional browser save, not your
campaign progress or files you previously exported.

Prior RGB/depth episode ZIPs are NOT automatically accepted as demonstrations. They
lack the explicit pre-decision choice records this new learner needs. The existing
visual recorder and analytic tactile fixture remain separate systems with separate
consent. This is not vision, tactile, force, joint-level or physical-robot training.

## Source workflow

```sh
npm run check
npm test
npm start
# Open http://127.0.0.1:4174/goodbot/
```

Node 22+; no npm install or external game dependencies are needed. `npm run package:site`
stages only `public/` in `dist/`. `python tools/standalone.py` regenerates the offline
single-file preview. `tests/requirements.txt` lists Python browser-test dependencies.

Do not replace Driftfall's publishing route. `deploy/pages.yml` is still an opt-in
example for a separate GOODBOT repository/destination; inspect the current repository
and its instructions before merging. Keep secrets outside public files and Git.

## Validation boundaries

See `docs/TEST_REPORT.md` for executed results. Browser tests in this environment use
an exact standalone document with its CSP retained, or the separately named source
memory harness. These are not normal deployed-browser tests. WebGL, real webcam/model,
Safari/Firefox, hardware frame-rate and human enjoyment remain unverified. Learning
results concern narrow authored virtual-layout variants and assisted high-level skills,
not general intelligence or transfer to a hotel robot.
