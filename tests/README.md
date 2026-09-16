# Camera hotfix validation (0.3.1)

The current `docs/TEST_REPORT.md` supersedes historical counts below. Run the
original suites plus `node --test tests/robot-camera.test.mjs` and
`python tests/robot_camera.py`. The new exact-bundle browser test uses ordinary
controls and only read-only diagnostics, including a real cup pickup/delivery in
Robot camera. It requires the CPU/WASM raster for explicit cache/resolution checks;
it is not evidence of GPU, file navigation, or live webcam behavior.

# Studio 03 — reproducing validation

Read `docs/TEST_REPORT.md` for executed results and limitations. Install Node 22+;
the game/unit tests have no npm dependencies. Browser tests need Python, Playwright
and Pillow. Data decoding previews additionally use NumPy.

```sh
npm run check
npm test
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
npm start
```

In another terminal, run the real HTTP suite with the shipped source CSP:

```sh
python tests/browser.py --renderer gpu --out qa-local/gpu
```

`--renderer gpu` requires WebGL2 and fails on a CPU fallback. `--renderer cpu`
requires the actual CPU/WASM path. `--renderer auto` accepts either 3D backend and
reports the selected one per scenario; it is not a GPU release gate. None accepts
the legacy 2D fallback. These flags select **test expectations**, not the renderer.
Use a genuinely CPU-only environment for CPU tests; do not alter managed policies.
`--executable /path/to/chromium` chooses an installed browser as needed.

The eleven scenarios exercise the six-shift campaign, mouse picking and delivery,
keyboard, undo, pause, webcam denial/cancellation/late permission, synthetic hand
calibration/pointing/pinch/loss, tab-hide, AI consent/local fallback, audio and touch.
They use ordinary inputs, not teleportation, game-state mutation or a forced win.
The camera/model in named tests is synthetic and does not validate hardware.

When normal navigation is actually blocked, the explicitly named restricted harness:

```sh
python tests/browser.py --memory --renderer cpu --out qa-local/restricted
```

loads the same modules as blob URLs and injects actual styles. It removes source CSP
ONLY from that test document. It does not change enterprise policy or claim normal
HTTP/CSP validation. This is the environment used for the delivered full campaign.

## Exact standalone / recording checks

```sh
python tools/standalone.py
python tests/standalone.py
python tests/perspective.py
python tests/recording_browser.py
```

These execute the exact bundled HTML using `set_content`, retain its own CSP, and
exercise real UI inputs. Camera/API are deliberately disabled in that HTML.
The supplied versions of these three tests explicitly target the tested CPU path;
a normal GPU recording release gate still needs equivalent runs on supported hardware.
No HTTP or file:// navigation is established by `set_content`.

`recording_browser.py` saves the actual downloaded archives and validates CRC,
PNG/depth/mask dimensions, timestamps, privileged-view tags, assistance, null hotel
force/tactile data, requested vs executed actions, consent, Stop, discard, tab-hide,
and independent pressure-pad export conservation/phases. The hotel episode uses a
normal cup pickup/delivery. No artificial contact solver is hidden behind these tests.

`tools/inspect_episode.py` verifies dense-array sizes and creates a world point cloud
from declared source-raster intrinsics. Its reprojection check verifies mathematical
conventions only, not sensor calibration or physical scene reconstruction accuracy.

## Remaining release gates

GPU shader compilation/linking and runtime; metadata pass pixel orientation and
quantization against known geometry; normal HTTP/HTTPS source CSP; real MediaPipe
worker downloads/network behavior and physical webcam permission/accuracy; real
browser CPU/GPU/memory/latency measurements; Safari/Firefox; independent audio listening;
real contact solver and tactile calibration if making research/contact-data claims.
The manual opt-in workflow requires GPU HTTP tests and has not run remotely.
