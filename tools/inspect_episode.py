#!/usr/bin/env python3
"""Inspect GOODBOT virtual episodes without extracting untrusted ZIP paths.

Optional image/point-cloud outputs require NumPy and Pillow:
    python -m pip install numpy pillow
    python tools/inspect_episode.py episode.zip --frame 3 --out inspected

Depth is optical-axis z, not Euclidean range. See docs/STUDIO_DATA.md.
"""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path, PurePosixPath
import zipfile

MAX_ARCHIVE_BYTES = 170 * 1024 * 1024
MAX_MEMBER_BYTES = 128 * 1024 * 1024


def read_member(archive: zipfile.ZipFile, name: str) -> bytes:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or "\\" in name:
        raise ValueError(f"Unsafe archive member: {name!r}")
    info = archive.getinfo(name)
    if info.file_size > MAX_MEMBER_BYTES:
        raise ValueError(f"Member exceeds the read limit: {name}")
    return archive.read(info)


def inspect_episode(path: Path, frame_index: int, output: Path | None) -> dict:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or len(names) > 2000:
            raise ValueError("Duplicate or excessive archive entries")
        if sum(item.file_size for item in archive.infolist()) > MAX_ARCHIVE_BYTES:
            raise ValueError("Archive exceeds the uncompressed size limit")
        manifest = json.loads(read_member(archive, "manifest.json"))
        if manifest.get("schema") != "goodbot.virtual_episode.v1":
            raise ValueError("Expected a virtual hotel episode, not a tactile-bench archive")
        frames = [json.loads(line) for line in read_member(archive, "samples.jsonl").splitlines() if line]
        if len(frames) != manifest["frame_count"] or not 0 <= frame_index < len(frames):
            raise ValueError("Frame index/count mismatch")
        frame = frames[frame_index]
        camera = frame["camera"]
        width, height = int(camera["width"]), int(camera["height"])
        if not 1 <= width <= 4096 or not 1 <= height <= 4096:
            raise ValueError("Unsupported frame dimensions")
        paths = frame["files"]
        depth_bytes = read_member(archive, paths["depth"])
        labels_bytes = read_member(archive, paths["instances"])
        if len(depth_bytes) != width * height * 4 or len(labels_bytes) != width * height * 2:
            raise ValueError("Truncated or incorrectly shaped dense frame")
        result = {
            "schema": manifest["schema"], "frames": len(frames), "selected_frame": frame_index,
            "simulation_time_s": frame["simulation_time_s"], "view": camera["view"],
            "observation_scope": camera["observation_scope"], "width": width, "height": height,
            "physics": manifest["physics"], "tactile_available": frame["state"]["tactile"]["available"],
            "force_measurements_available": False, "backend": camera["backend"],
        }
        if output is None:
            return result
        try:
            import numpy as np
            from PIL import Image, ImageDraw
        except ImportError as exc:
            raise RuntimeError("Image export requires: python -m pip install numpy pillow") from exc
        depth = np.frombuffer(depth_bytes, dtype="<f4").reshape(height, width)
        labels = np.frombuffer(labels_bytes, dtype="<u2").reshape(height, width)
        rgb = np.asarray(Image.open(io.BytesIO(read_member(archive, paths["rgb"]))).convert("RGB"))
        if rgb.shape != (height, width, 3):
            raise ValueError("RGB dimensions do not match depth")
        valid = np.isfinite(depth) & (depth > 0) & (labels > 0)
        source = camera.get("source_raster", camera)
        K = np.asarray(source["K_row_major"], dtype=float).reshape(3, 3)
        T = np.asarray(camera["T_world_camera_optical_row_major"], dtype=float).reshape(4, 4)
        if not np.isfinite(K).all() or not np.isfinite(T).all() or K[0, 0] <= 0 or K[1, 1] <= 0:
            raise ValueError("Invalid camera calibration")
        if not np.allclose(T[3], [0, 0, 0, 1]) or not np.allclose(T[:3, :3].T @ T[:3, :3], np.eye(3), atol=1e-5):
            raise ValueError("Invalid camera transform")
        yy, xx = np.indices(depth.shape)
        z = depth[valid]
        sx = np.floor((xx[valid] + .5) * source["width"] / width) + .5
        sy = np.floor((yy[valid] + .5) * source["height"] / height) + .5
        points_camera = np.stack(((sx - K[0, 2]) * z / K[0, 0],
                                  (sy - K[1, 2]) * z / K[1, 1], z), axis=1)
        points_world = points_camera @ T[:3, :3].T + T[:3, 3]
        # Reproject the constructed point cloud to verify conventions, not geometric fidelity.
        reprojection = (points_world - T[:3, 3]) @ T[:3, :3]
        rx = reprojection[:, 0] / reprojection[:, 2] * K[0, 0] + K[0, 2]
        ry = reprojection[:, 1] / reprojection[:, 2] * K[1, 1] + K[1, 2]
        error = max(float(np.max(np.abs(rx - sx), initial=0)),
                    float(np.max(np.abs(ry - sy), initial=0)))
        output.mkdir(parents=True, exist_ok=True)
        np.save(output / "depth_m.npy", depth, allow_pickle=False)
        np.save(output / "instances.npy", labels, allow_pickle=False)
        Image.fromarray(rgb).save(output / "rgb.png")
        depth_display = np.zeros((height, width), dtype=np.uint8)
        depth_display[valid] = np.clip((1 - depth[valid] / 15) * 255, 0, 255).astype(np.uint8)
        Image.fromarray(depth_display).save(output / "depth-preview.png")
        palette = np.zeros((65536, 3), dtype=np.uint8)
        for key in manifest["instance_labels"]:
            label = int(key)
            palette[label] = [(label * 61 + 40) % 220 + 25, (label * 103 + 80) % 220 + 25,
                              (label * 157 + 10) % 220 + 25]
        mask = palette[labels]
        Image.fromarray(mask).save(output / "instances-preview.png")
        preview = Image.new("RGB", (width * 3, height + 56), "#141c1a")
        draw = ImageDraw.Draw(preview)
        titles = ["GAME RGB / no interface", "AXIAL DEPTH / 0–15 m grayscale", "INSTANCE LABELS / false color"]
        for i, image in enumerate([Image.fromarray(rgb), Image.fromarray(depth_display).convert("RGB"), Image.fromarray(mask)]):
            preview.paste(image, (i * width, 36))
            draw.text((i * width + 12, 11), titles[i], fill="white")
        draw.text((12, height + 39), f"Frame {frame_index} · {camera['view']} · synthetic scene · not a physical sensor capture", fill="white")
        preview.save(output / "rgb-depth-instances.png")
        colors = rgb[valid]
        ids = labels[valid]
        with (output / "points-world.ply").open("w", encoding="ascii") as file:
            file.write("ply\nformat ascii 1.0\ncomment Synthetic GOODBOT renderer points; not a real scan\n")
            file.write(f"element vertex {len(points_world)}\nproperty float x\nproperty float y\nproperty float z\n")
            file.write("property uchar red\nproperty uchar green\nproperty uchar blue\nproperty ushort instance_id\nend_header\n")
            for point, color, label in zip(points_world, colors, ids):
                file.write(f"{point[0]:.6f} {point[1]:.6f} {point[2]:.6f} {color[0]} {color[1]} {color[2]} {label}\n")
        result.update(valid_points=len(points_world), round_trip_pixel_error=error,
                      depth_min_m=float(z.min()) if len(z) else None,
                      depth_max_m=float(z.max()) if len(z) else None,
                      instance_ids=[int(x) for x in np.unique(labels)])
        (output / "inspection.json").write_text(json.dumps(result, indent=2))
        return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--frame", type=int, default=0)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(inspect_episode(args.archive, args.frame, args.out), indent=2))
    except (ValueError, KeyError, OSError, RuntimeError, zipfile.BadZipFile) as error:
        parser.exit(1, f"Cannot inspect episode: {error}\n")


if __name__ == "__main__":
    main()
