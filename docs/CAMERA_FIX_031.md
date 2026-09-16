# GOODBOT Studio 03 — robot-camera correction (0.3.1)

## Report and reproduction

Reported: Robot camera skips/shifts and is problematic in the locally opened
Studio 03 HTML. The original bundle was executed with its own CSP using Chromium
`set_content`. File navigation was blocked by the environment; no managed policy
was modified. Holding S caused alternating projected forward/backward steps. Ten
nonzero successive steps included nine direction reversals. The original control
mapping converted keys through the camera basis and then set base heading to the
travel direction, which immediately changed the next frame's input basis.

## Correction

Robot-view inputs are now body-fixed. W/S = forward/reverse; A/D = left/right turn;
Q/E = left/right strafe. Looking doesn't enter the base control calculation. Reverse
and strafe preserve heading. Manual turning is limited to 1.8 radians/second;
automatic route/reach heading changes follow the shortest arc at up to 2.4 rad/s.
These are game-control parameters, not identified physical actuators. Translation
retains the existing navigation checks and manipulation remains assisted.

The head camera follows the current simulated base pose with no hidden translational
lag or camera shake. Per-view look/zoom is preserved across view switches. Right-drag
looks independently, scroll zooms, and C / Center view resets the look and field of
view. Current view buttons no longer unexpectedly reset the view when clicked again.
The base initially faces into the hotel, not at the nearby exit wall.

## Rendering

A camera-only update no longer regenerates the static directional shadow map or
re-uploads the static mesh to the GPU. The camera raster itself is still re-rendered
from current geometry. A fixed-resolution 24-pose Node comparison found every frame
pixel-identical to the original renderer with shadow rebuilds; the local raster-only
median was 187.3 ms before and 145.6 ms after cache reuse. This is not end-to-end FPS,
a device benchmark, or a GPU performance claim. Raw measurements are in the evidence.

On CPU, moving robot view uses up to 384 pixels wide, then restores up to 640 after
250 ms idle; other view resolutions are preserved. The tradeoff is visible temporary
softness while driving in exchange for less main-thread blocking. GPU rendering keeps
its higher-resolution path but was unavailable for validation here. CPU movement can
still be slower than a production GPU renderer. No 60 FPS guarantee is made.

## Data and privacy

Every exported camera transform describes the actual rendered viewpoint. Per-frame
source raster and resampling metadata remain authoritative, including changes in
resolution during a recording. `directRobot` events now appear as normalized keyboard
actions; no key logging, raw hands, microphone or webcam images are added. RGB is the
virtual camera. Hotel contacts remain symbolic and the synthetic pressure bench is
still independent. All consent and local-only export requirements remain unchanged.

## Delivery

This package is based on the supplied Studio 03 archive, not a fetched latest remote.
Close or leave the old preview tab and open `GOODBOT-Studio-03-Camera-Fix.html` to run
this code. An already-open 0.3.0 file is not updated by receiving a new ZIP. The source
is a complete GOODBOT-only folder. Review the patch against any newer Claude edits
rather than overwriting them. No remote repository, deployment or Claude session was
changed. Tests and remaining gates are in the current `TEST_REPORT.md`.

## Additional regression fix

The recording regression exposed a timing race: the browser queues a dialog's
`close` event, so the pressure-bench recording flag could remain active immediately
after the close button. Close-click and Escape now release the take and clear its
consent synchronously, with the close event retained as a fallback. The failing log
is preserved in the evidence. This does not add data collection or change its scope.
