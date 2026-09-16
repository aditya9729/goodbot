"""Rebuild the bundled, dependency-free renderer with clang 17+ and wasm-ld."""
from pathlib import Path
import subprocess,base64
root=Path(__file__).resolve().parents[1]
subprocess.run(['clang','--target=wasm32','-O3','-fno-builtin','-nostdlib','-Wl,--no-entry','-Wl,--export-memory','-Wl,--initial-memory=50331648','-Wl,--max-memory=67108864','-o',str(root/'renderer-src/raster.wasm'),str(root/'renderer-src/raster.c')],check=True)
b=base64.b64encode((root/'renderer-src/raster.wasm').read_bytes()).decode()
(root/'public/src/raster-data.js').write_text('// Compiled from renderer-src/raster.c; Apache-2.0. No network fetch.\nexport const WASM="'+b+'";\n')
print('Rebuilt embedded WASM renderer; no player-side compilation tools required.')
