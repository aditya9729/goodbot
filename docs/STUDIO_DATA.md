# Studio 03 — virtual data contract

## Trust boundaries

Two different sources have different schemas. They must not be joined as if they
are synchronized sensors on the same robot:

1. `goodbot.virtual_episode.v1`: the running **assisted hotel game**.
2. `goodbot.synthetic_bench_episode.v1`: the **independent prescribed contact model**.

The camera used for hand input is a third system and is never recorded. Export is
a local user action. These changes do not add research uploads, analytics, account
identity or a data backend. Webcam consent, local episode consent, bench consent
and optional server-side AI consent are separate. No recording consent is persisted.

## Hotel archive

```
manifest.json
samples.jsonl
  frame_id, simulation_time_s, wall_elapsed_s, camera, files, state
actions.jsonl
  normalized requests, arguments, acceptance, assistance, modality
executions.jsonl
  completed assisted task actions, not joint or motor commands
relations.jsonl
  task-state support/grasp begin/end, not physics events
rgb/000000.png
depth/000000.f32
instances/000000.u16
```

All files in a frame share an ID and capture state. Each `.f32` is little-endian
float32 with `height × width` row-major samples; `.u16` is little-endian uint16.
Images have no HUD, hand cursor, menu, highlight ring or webcam. RGB is display-
referred 8-bit output with approximate sRGB/gamma conversion, not linear radiance.
Depth and labels receive no gamma or tone mapping.

Depth is **optical z in simulated metres**, not radial distance. NaN means no hit.
A game unit is treated as a metre, not calibrated to a physical hotel. The CPU path
converts its perspective reciprocal-depth buffer to float32 metres. The GPU path
packs millimetres and declares a 0.001 m quantization; it remains unvalidated.
Instance zero is background. No-hit is not a finite zero distance.

### Camera coordinates and resizing

`K_row_major` describes the nominal exported image. The source raster's width,
height and intrinsics are additionally exported under `source_raster`, because
RGB/depth/labels are identically nearest-neighbor downsampled. Exact source centers:

```
sx = floor((x + 0.5) * source_width / exported_width) + 0.5
sy = floor((y + 0.5) * source_height / exported_height) + 0.5
X_camera = (sx - cx_source) * z / fx_source
Y_camera = (sy - cy_source) * z / fy_source
Z_camera = z
X_world = R_world_camera * X_camera + t_world_camera
```

Pixel origin is the upper-left edge. Camera optical axes are right/down/forward.
`T_world_camera_optical_row_major` is a 4 × 4 **camera-to-world** transform, not its
inverse. The authored world is y-up. Rotation columns are camera right, negative
camera up and camera forward. FOV and camera motion may change between samples.
The virtual camera is ideal pinhole with no distortion; no physical calibration.

`Room` and `Overview` are marked `privileged_player_camera`; `Robot camera` is
marked `virtual_robot_head`. The latter follows the authored base and current look
angle. It is not a calibrated hardware head, and it is not a wrist camera. Changing
view during a take is allowed; consumers must not assume constant extrinsics.
There is no synchronized multi-camera capture yet.

### Stable instance categories

0 background; 1 architecture/decor; 2 bed; 3 nightstand; 4 desk; 5 cupboard;
6 shelf; 7 cart; 8 robot; 9 cup-a; 10 cup-b; 11 towel-0; 12 towel-1;
13 chair; 14 keepsake; 15 suitcase. The manifest is authoritative.
Labels are coarse: the robot is not segmented into links, and small decorations
may share architecture/furniture labels. Instance IDs describe render geometry,
not independent semantic object discovery.

### State and actions

`initial_state`, each frame's `state`, and an available `final_state` include scene
and seed, room permission, robot base position/quaternion, held object, authored
object pose/ownership/protection and assistance information. Rotations are xyzw.

The task engine's held-object anchor is not the mesh origin. Both `task_anchor_m`
and `rendered_pose` are exported deliberately. Neither is a physically simulated
joint attachment. Arm animation scalar and reach target are not joint angles.
Joint positions and torques are null. Do not silently substitute rendered mesh
angles for motor state when building a learning dataset.

Requested high-level actions and accepted/rejected status are separate from later
completed assisted actions. `direct` contains normalized keyboard-direction input,
not a motor torque. Pointer, task-button and hand-pointer commands are deliberately
grouped because the game does not currently disambiguate those request sources.
Pause/resume are logged as interface actions. There are no raw hand landmarks.

A support relation follows **task state**, not a geometric narrow-phase test.
For example, picking up a cup changes its relation from an authored surface to an
assisted grasp. Relationship labels can help debug task sequencing; they cannot
establish contact position, penetration, impulse or pressure. Those fields are null.
An unavailable measurement is not measured zero. No tactile stream exists for the
hotel tasks in this release.

### Time, memory and lifecycle

The game clamps simulation steps. Wall time and simulation time differ, especially
on CPU. Recording requests 2 images per active simulated second, rather than real-
time fixed-rate video. Each RGB/depth/label packet has the actual simulation and
relative wall time. Encoding can skip requests; skipped encoding attempts are counted.
There is no interpolation that creates nonexistent frames.

Stop prevents new capture; a previously captured PNG may finish encoding. Export
waits for that in-flight frame. Discard invalidates pending async work and clears
local memory. Paused play captures no new frames. Hidden tab, scene change, mission
finish and bench entry stop the take. Start never enables the webcam. The memory
caps are intentionally conservative for a prototype; this is not long-duration
streaming storage or a browser performance claim.

## Analytic tactile bench archive

Manifest identifies `analytic_fixture_not_gameplay`. Configuration contains:

- Fixed object pose; prescribed, rate-limited opposing pad indentation.
- 800 N/m stiffness, 2 N·s/m damping, at most 4 mm indentation and 25 mm/s speed.
- Two 20 × 20 mm pads, each 16 × 16 taxels, 1/60 s model timestep.
- Per-step normal force: `F = max(0, k*delta + c*delta_dot)` while `delta > 0`,
  otherwise `F=0`. During unloading the model can exert zero force before geometric
  indentation reaches zero. `contact` is indentation state, not proof of positive force.
- Assumed Gaussian footprint, sigma 3 mm. Let weights be `w_i` and cell area `A`:
  `p_i = F*w_i/(A*sum(w))`. Thus `sum(p_i*A) = F` within float32 tolerance.

Each pad sample includes normal force N, modeled world force/normal, surface origin,
pressure Pa, cell area m², row/column count and pressure-weighted center of pressure.
The fixed block surfaces are at world x = ±0.01 m. Taxel columns increase world y;
rows increase world z. These are surface-coordinate axes, not a full handed sensor
rotation. Opposing pad force normals have opposite x signs. Grid array is row-major.
CoP is [u,v] in metres about the pad center; no-contact CoP is null. Shear/slip null
means unavailable. Object resultant is zero because the prescribed forces are equal
and opposite, not because a free dynamic object was solved to equilibrium.

At settled 2 mm indentation, each pad has `800 * .002 = 1.6 N`. The colored live map
uses a fixed 0–60 kPa display scale; exported data stays in Pa. The color image is
not an optical tactile camera, an elastomer simulation, or a sensor-specific model.
A maximum 1,800 samples / 30 model seconds or 32 MiB JSON applies. Wall-clock time
is recorded separately; this is not a measured 60 Hz physical sensor stream.

## What would make hotel contacts useful for robot-learning research?

First replace assisted attachment with articulated rigid-body mechanics, explicit
collision meshes, masses/inertias, material friction/restitution and controlled
end-effector constraints. Record geometric contact manifolds separately from solver
impulses. Only then derive estimated tactile readings with a specified sensor model,
cell geometry, filtering, noise and saturation. Verify conservation, timestep effects,
known loads, geometry alignment and hardware agreement before making transfer claims.

A reference browser physics API is Rapier's official contact-manifold documentation:
https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/
Rapier is **not included** in this release. Its contact-point/normal/manifold and
solver-force distinction is why this release does not invent those measurements.

For vision-based tactile rendering, TACTO is a reference implementation, not a
bundled dependency or a new-project recommendation without maintenance review:
https://github.com/facebookresearch/tacto
That repository is archived and explicitly relies on an external physics engine
for contact dynamics. Tactile appearance is not a substitute for validated forces.

Research utility is unproven. Episodes include privileged state and assistance.
A successful export is evidence of recording, not proof of successful policy
learning, reliable grasping, human consent to research reuse, or sim-to-real transfer.
