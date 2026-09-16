"""Execute the exact standalone HTML via set_content, retaining its own CSP.
This validates the bundle, not browser file:// navigation (restricted here).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,shutil,time
R=Path(__file__).resolve().parents[1]
(R/'evidence').mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-webgl','--disable-webgl2'])  # CPU/WASM path: these checks describe its backend name and moving-resolution drop
 p=b.new_page(viewport={'width':1440,'height':940});errors=[];requests=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 p.set_content((R/'GOODBOT-Real-Look.html').read_text(),wait_until='load')
 deadline=time.monotonic()+15
 while not p.evaluate('!!window.goodbotDebug') and time.monotonic()<deadline:p.wait_for_timeout(80)
 assert p.evaluate('!!window.goodbotDebug');assert p.evaluate("goodbotDebug().renderer.includes('WASM')");p.locator('#begin-btn').click();p.wait_for_timeout(300)
 assert p.locator('#hands-btn').is_disabled();assert p.locator('#ai-open-btn').is_disabled();assert not errors,errors
 assert all(not r.startswith(('http:','https:')) for r in requests),requests
 p.screenshot(path=str(R/'evidence/standalone.png'))
 (R/'evidence/standalone.json').write_text(json.dumps({'status':'pass','method':'exact standalone document set_content, its CSP retained','notTested':'file:// navigation','errors':errors,'networkRequests':requests,'cameraAndApiDisabled':True},indent=2));print('Standalone bundle: PASS, own CSP retained, no HTTP requests.')
 b.close()
