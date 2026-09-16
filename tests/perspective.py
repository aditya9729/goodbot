"""Camera/input regression on exact standalone bundle, its CSP retained.
No browser URL-policy changes; no game state setters.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,time,shutil
R=Path(__file__).resolve().parents[1];out=R.parent/'evidence/perspective';out.mkdir(parents=True,exist_ok=True)
def wait(page,expr,seconds=30):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if page.evaluate(expr):return
  page.wait_for_timeout(80)
 raise AssertionError('Timed out: '+expr)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-webgl','--disable-webgl2'])  # CPU/WASM path: these checks describe its backend name and moving-resolution drop
 page=b.new_page(viewport={'width':1600,'height':980});errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.set_content((R/'GOODBOT-Real-Look.html').read_text(),wait_until='load');wait(page,'!!window.goodbotDebug');page.locator('#begin-btn').click();wait(page,'!goodbotDebug().paused')
 assert page.evaluate("goodbotDebug().renderer==='Studio 3D · CPU/WASM'")
 results=[];images=[];timings=[]
 for mode in ['room','robot','overview']:
  page.locator('[data-view="'+mode+'"]').click();wait(page,"goodbotDebug().view==='"+mode+"'");page.wait_for_timeout(500)
  data=page.locator('#world').screenshot();images.append(hashlib.sha256(data).hexdigest());timings.append({'view':mode,'lastRenderMs':page.evaluate('goodbotDebug().renderMs')});page.screenshot(path=str(out/(mode+'.png')))
 assert len(set(images))==3;results.append({'test':'three distinct depth-rendered camera views','status':'pass'})
 before=page.evaluate('goodbotDebug().robot');box=page.locator('#world').bounding_box();page.mouse.move(box['x']+box['width']*.52,box['y']+box['height']*.54);page.mouse.down(button='right');page.mouse.move(box['x']+box['width']*.60,box['y']+box['height']*.56,steps=6);page.mouse.up(button='right');page.mouse.wheel(0,-160);page.wait_for_timeout(500)
 assert page.evaluate('goodbotDebug().robot')==before;assert hashlib.sha256(page.locator('#world').screenshot()).hexdigest()!=images[-1];results.append({'test':'right-drag and scroll alter view without moving robot','status':'pass'})
 page.locator('[data-view="overview"]').click();page.wait_for_timeout(600)
 pt=page.evaluate("goodbotDebug().hotspots.find(p=>p.id==='cup-a')");assert pt
 box=page.locator('#world').bounding_box();page.mouse.click(box['x']+pt['x'],box['y']+pt['y']);wait(page,"goodbotDebug().robot.held==='cup-a'")
 page.locator('#deliver-btn').click();wait(page,"goodbotDebug().tasks.some(t=>t.id==='place-cup-a'&&t.done)");results.append({'test':'3D canvas pick plus ordinary delivery in overview view','status':'pass'})
 # Capture the room with the robot in the actual task, rather than teleporting it.
 page.locator('[data-view="room"]').click();page.locator('[data-task="place-cup-b"]').click();wait(page,'goodbotDebug().robot.z<6.9');page.screenshot(path=str(out/'room-in-play.png'))
 assert not errors,errors;assert not any(u.startswith(('https:','http:')) for u in requests),requests
 report={'passed':len(results),'failed':0,'tests':results,'pageErrors':errors,'networkRequests':requests,'observedLastRenderMs':timings,'scope':'Exact standalone HTML loaded with set_content and its CSP retained. CPU/WASM renderer, real pointer events. Not file navigation or deployed HTTP browser validation.'}
 (out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));b.close()
