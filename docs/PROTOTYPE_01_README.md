# GOODBOT · Make Room — Hotel Prototype 01

**A little robot. Six small shifts. A hotel full of stories.**

A playable, independent browser game set in the fictional Little Lantern Hotel.
Click or pinch to select an object; the wheeled, two-arm robot approaches, collects
it, and helps you place it at an authorized destination. Complete rooms with care,
protect guest belongings, rescue a practice bot, and unlock robot paints and details.

This is **new implemented code**, not the earlier design-only handoff. It does not
modify Driftfall, its C++ engine, its music, its repository, or its Pages deployment.
Nothing in this package has been remotely pushed or deployed.

## Play immediately

Open the separately supplied `GOODBOT-Play.html` in a modern browser. It is a
single-file **offline keyboard/mouse/touch preview** with all six campaign shifts,
local seeded missions, music and progress. Camera and API controls are deliberately
disabled there. Its inline/blob-module packaging and CSP differ from the source site.

## Run the complete source

Install Node.js 22 or later. From the extracted `goodbot/` directory:

```sh
npm run check
npm test
npm start
```

Open `http://127.0.0.1:4174/goodbot/`.

No npm dependencies or game build step are required. All artwork and music are
procedural; keyboard/touch play has no remote runtime dependency. Optional webcam
mode downloads a pinned MediaPipe runtime and model only after consent. A suitable
origin (HTTPS or localhost) and a supported browser are needed for camera use.

## Controls

| Input | Action |
|---|---|
| Click/tap an object | Approach, then pick up / open / flag as appropriate |
| Click the gold destination or Place button | Approach and place the carried object |
| Click/tap floor | Request an open-floor route |
| WASD / arrows | Drive in screen-relative directions |
| U | Undo the last interaction |
| H | Highlight the next outstanding task |
| P / Escape | Pause (when not in another modal) |
| M | Toggle original background music and effects |
| Optional hand controls | Hold an open palm still to calibrate, move palm to point, pinch to choose |

The task panel is a fully operable alternative to selecting small scene objects.
There is no race clock or penalty for taking a break. The game does not require
both hands. The optional webcam is a **point-and-pinch intent interface**, not
continuous 6-DOF teleoperation of each arm.

## Six shifts

1. **First shift / 204:** collect two hotel cups onto the service cart.
2. **Room reset / 208:** open the cupboard, deliver two towels, collect cups, park
   the chair clear of the marked route, and flag the forgotten keepsake.
3. **Stayover / 305:** deliver the requested towel; leave private belongings alone.
4. **Make space / 402:** deliver a cup to a different requested tray, replenish towels
   and park the chair. Type-compatible but unrequested destinations are rejected.
5. **Rescue shift / 407:** a deliberately poor scripted practice bot retries a blocked
   lane. Take over, move the chair, and complete the collection job. No learning claim.
6. **Do Not Disturb / 501:** no entry is authorized. Deferring the job is the solution.

These reuse **one authored room geometry**, with different task contracts, props,
permissions and six color palettes. They are not six unique 3D environments.
Daily kindness chooses a deterministic scenario/seed by UTC date. It is local,
not a verified online competition. Level badges unlock actual paint choices in
Your shifts, plus an automatic bellhop cap and rescue antenna detail.

## A scene-grounded task director

The game works without an API. Four deterministic roles build its task board:

- **Scout** reads object types, ownership, allowed destinations and scene permission.
- **Steward** excludes unauthorized movement and enforces protected belongings.
- **Planner** generates tasks and prerequisite ordering from those scene facts.
- **Checker** verifies route legs, reach approximation, capacity and complete coverage.

They are rule-based modules, **not four autonomous LLM agents**. The director is
not interpreting photographs or reconstructing unknown rooms. It uses the authored
symbolic scene graph. The optional single-model layer can remix narration and task
order; it cannot invent new verbs, objectives, objects or permissions.

## Optional server-side AI

**Do not paste an API key into chat, browser JavaScript, the game UI or GitHub.**
The supplied adapter uses the OpenAI Responses API with JSON Schema output. No live
API call was made during development; the provider path has mocked tests only.

```sh
cp .env.example .env
# Edit .env locally:
# GOODBOT_AI_ENABLED=1
# OPENAI_API_KEY=<your key, only in this local file>
# OPENAI_MODEL=<an available Responses model supporting JSON Schema>
node --env-file=.env server/index.mjs
```

Then open **Behind the task board → Optional AI remix**, acknowledge the separate
virtual-scene/usage-cost disclosure, and request one proposal. A successful,
validated proposal resets the current room. Declining or failure leaves local
play available. Only canonical authored scene data and allowed task IDs go to the
provider; no webcam, hand, guest identity or research episode data does.

The local server binds to loopback, checks Host and Origin, uses a session CSRF
nonce, restricts request fields and length, has a 25-second provider timeout,
allows one concurrent request, requires ten seconds between calls, and defaults
to a hard ten-attempt cap per server process. Failed provider attempts count too.
There is no automatic retry. Restarting resets the cap. This is a **local developer
service, not a production authenticated public API**. Add authentication, durable
quotas, cost controls and an appropriate hosting threat model before public use.

GitHub Pages can host the static game but not this Node/API server. Do not place
keys in Pages secrets expecting them to be hidden in downloaded JavaScript.

## Privacy and scope

No camera prompt on arrival. Camera consent is fresh and initially unchecked;
video only, no microphone. Stop controls exist both in play and on the pause
screen. Cancellation, late permission, setup failure and hidden-tab cleanup are
handled. Lost tracking cancels pending movement but **preserves held objects**.
Raw video is not displayed by default. The application has no recording or upload
path for camera frames/landmarks. Third-party runtime download metadata is disclosed;
request guards are defense in depth, not a vendor audit or zero-telemetry proof.

Progress and selected paint stay in browser local storage; virtual interaction
history is transient debugging state. Research contributions, analytics accounts,
real guest data, physical robot control and multiplayer are not implemented.

## Simulation fidelity

The renderer is original **Canvas2D isometric geometry**, not WebGL or Three.js.
The robot uses a grid-based route planner, base collision checks, bounded approach
reach, animated arms and **assisted kinematic placement**. Objects are not simulated
by a rigid-body contact solver. The arms are a visual embodiment, not a physical
kinematic chain with joint torque limits or collision-complete IK. There are no
liquids or cloth dynamics: the bed is static and towels are folded rigid bundles.

These simplifications are visible in the interface and documented for future
robotics work. Game episodes are not validated real-robot demonstrations. The
fictional task rules are not hotel operating procedures or accessibility standards.

## Tests, packaging and deployment

See `docs/TEST_REPORT.md` for executed checks and limitations and
`tests/README.md` for reproducible browser tests.

```sh
npm run package:site     # copies public/ to dist/, excluding server and secrets
python tools/standalone.py
```

`deploy/pages.yml` is an **opt-in example for a separate GOODBOT repository**.
It is intentionally not installed as an active `.github/workflows` file, to avoid
accidentally replacing Driftfall's Pages site. Establish a new destination before
publishing. For an existing static host, place `public/` at a separate `/goodbot/`
route and preserve its other routes. Review the actual hosted CSP/module/camera
behavior before calling a release ready.

## File map

`public/src/game.js` owns the game state; `scene.js` defines levels; `director.js`
builds and checks tasks; `navigation.js` handles routes/reach; `render.js` draws the
room; `app.js` owns UI and controls; `hands.js` maps landmarks; `camera.js` owns
camera resources; `vision-worker.js` runs optional inference; `audio.js` composes
the original “Little Lantern” loop. `server/` is never part of the static package.

See `CLAUDE_HANDOFF.md` for continuation instructions. Source is Apache-2.0; original
art/music code is included. MediaPipe runtime/model are remote optional dependencies,
not bundled assets. Reused Driftfall camera utilities are credited in `docs/ARCHITECTURE.md`.
