# Original software triangle renderer

`raster.c` is Apache-2.0 source written for this prototype. No downloaded mesh,
texture library, external renderer binary or hidden import is required. The game
ships a precompiled wasm32 binary embedded in `public/src/raster-data.js`.

Rebuild from `goodbot/` with Python, Clang 17+ and wasm-ld:

```sh
python tools/build-renderer.py
npm test
python tools/standalone.py
```

Vertex layout is position xyz, normal xyz, uv, material ID (9 floats). Triangles
are contiguous. Material layout is RGB, roughness, metalness, pattern ID, emission,
texture scale (8 floats). Camera config is eye xyz, target xyz, focal factor, exposure.
The output is RGBA8 in exported memory. Scene builders and tests bound geometry
and material indices; the binary is not a general-purpose parser of untrusted meshes.

`bake` stores architectural pixels/depth and static shadow map. `dynamic` restores
those buffers and draws movable scene triangles. Pattern 9 is a cheap alpha-darkened
contact footprint, not full dynamic lighting. The renderer does not simulate contacts,
articulations, grasping or cloth. It implements a visual approximation, not a complete
physically-based or path-tracing solution. CPU performance limits this architecture.


## Camera hotfix shadow modes

`render` / `bake` shadow argument: 0 disables shadows, 1 rebuilds the static map,
2 reuses it (initializes it if no map exists). Call mode 1 whenever the geometry,
light or shadow-relevant materials change; moving the camera alone uses mode 2.
`shadowBuildCount()` is a read-only regression diagnostic. Rendering still redraws
visible geometry from the current viewpoint. Pixel/depth/instance outputs remain
real rendered buffers, not a previous image shifted on screen.
