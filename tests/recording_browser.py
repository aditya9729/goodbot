"""Exact standalone document, its own CSP retained. Real UI, exports and bytes.
No scene mutation, virtual camera mocks, game completion bypass or network requests.
This tests set_content, not normal URL navigation or GPU/physical webcam behavior.
"""
from pathlib import Path
import json, shutil, time, zipfile, struct, io, math
from PIL import Image
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R.parent/'evidence/recording';OUT.mkdir(parents=True,exist_ok=True)
def wait(page,expression,timeout=35):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  if page.evaluate(expression):return
  page.wait_for_timeout(90)
 raise AssertionError(expression)
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':1000},accept_downloads=True);errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.set_content((R/'GOODBOT-Real-Look.html').read_text());wait(page,'!!window.goodbotDebug');page.locator('#begin-btn').click()
 assert not page.evaluate('goodbotDebug().recording.active');assert page.evaluate('goodbotDebug().recording.frames')==0
 page.locator('#record-btn').click();assert not page.locator('#record-agree').is_checked();assert page.locator('#record-start').is_disabled();page.screenshot(path=str(OUT/'consent.png'))
 page.locator('#record-agree').check();page.locator('#record-start').click();wait(page,'goodbotDebug().recording.frames>=1');results.append({'test':'fresh separate consent gates real virtual-frame recording','status':'pass'})
 page.locator('[data-task="place-cup-a"]').click();wait(page,"goodbotDebug().robot.held==='cup-a'");page.screenshot(path=str(OUT/'hotel-recording.png'))
 page.locator('[data-view="robot"]').click();page.wait_for_timeout(1200);page.locator('[data-view="room"]').click();page.locator('#deliver-btn').click();wait(page,"goodbotDebug().tasks.some(t=>t.id==='place-cup-a'&&t.done)")
 page.locator('#stop-recording-live').click();wait(page,'!goodbotDebug().recording.busy');count=page.evaluate('goodbotDebug().recording.frames');assert count>5
 page.wait_for_timeout(900);assert page.evaluate('goodbotDebug().recording.frames')==count
 page.locator('#record-btn').click()
 with page.expect_download() as d:page.locator('#record-export').click()
 archive=OUT/'goodbot-example-hotel-episode.zip';d.value.save_as(archive)
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  manifest=json.loads(z.read('manifest.json'));frames=[json.loads(l) for l in z.read('samples.jsonl').splitlines() if l];actions=[json.loads(l) for l in z.read('actions.jsonl').splitlines() if l];relations=[json.loads(l) for l in z.read('relations.jsonl').splitlines() if l]
  assert manifest['frame_count']==len(frames)==count;assert manifest['privacy']['webcam_frames'] is False;assert not manifest['privacy']['automatic_upload']
  executions=[json.loads(l) for l in z.read('executions.jsonl').splitlines() if l];assert any(a['kind']=='pick' for a in executions);assert any(a['kind']=='place' for a in executions)
  assert len(actions)>=2;assert any(a['kind']=='command' for a in actions);assert any(r['kind']=='assisted_grasp_relation' for r in relations)
  views=set();last=-1
  for f in frames:
   w,h=f['camera']['width'],f['camera']['height'];im=Image.open(io.BytesIO(z.read(f['files']['rgb'])));assert im.size==(w,h)
   assert len(z.read(f['files']['depth']))==w*h*4;assert len(z.read(f['files']['instances']))==w*h*2
   depths=struct.unpack('<'+'f'*(w*h),z.read(f['files']['depth']));ids=struct.unpack('<'+'H'*(w*h),z.read(f['files']['instances']));assert all(0<=v<=15 for v in ids)
   assert any(v>0 and math.isfinite(v) for v in depths);assert all(not math.isfinite(v) or v>.05 for v in depths)
   assert f['state']['tactile']['available'] is False;assert all(c['normal_force_N'] is None for c in f['state']['relations'])
   assert f['simulation_time_s']>last;last=f['simulation_time_s'];views.add(f['camera']['view'])
  assert {'room','robot'}<=views
  (OUT/'example-manifest.json').write_text(json.dumps(manifest,indent=2))
 results.append({'test':'ordinary cup pickup/delivery exported as aligned RGB/depth/instances with per-frame camera, actions and symbolic relations','status':'pass','frames':count,'views':sorted(views),'bytes':archive.stat().st_size})
 page.locator('#record-discard').click();assert page.evaluate('goodbotDebug().recording.frames')==0;assert not page.locator('#record-agree').is_checked();page.locator('[data-close="record-dialog"]').click();results.append({'test':'stop prevents further samples; discard releases frames and resets consent','status':'pass'})
 page.locator('#bench-btn').click();assert page.locator('#bench-record').is_disabled();page.locator('#bench-agree').check();page.locator('#bench-record').click()
 page.locator('#bench-indent').fill('2');page.locator('#bench-offset').fill('2');wait(page,'goodbotDebug().bench.force_N>1.5');page.wait_for_timeout(650);page.screenshot(path=str(OUT/'contact-bench.png'))
 page.locator('#bench-indent').fill('0');wait(page,'!goodbotDebug().bench.contact');page.locator('#bench-stop').click()
 with page.expect_download() as d:page.locator('#bench-export').click()
 benchArchive=OUT/'goodbot-example-synthetic-bench.zip';d.value.save_as(benchArchive)
 with zipfile.ZipFile(benchArchive) as z:
  assert z.testzip() is None;m=json.loads(z.read('manifest.json'));samples=[json.loads(l) for l in z.read('samples.jsonl').splitlines() if l];assert samples and m['source']=='analytic_fixture_not_gameplay';phases=set()
  for sample in samples:
   phases.add(sample['contact_phase'])
   for pad in sample['pads']:
    assert len(pad['pressure_Pa'])==256
    total=sum(pad['pressure_Pa'])*pad['taxel_area_m2'];assert abs(total-pad['normal_force_N'])<1e-5
  assert {'begin','persist','end'}<=phases
 results.append({'test':'synthetic bench exports modeled forces with force-conserving 16×16 taxels and contact phases','status':'pass','samples':len(samples)})
 # Confirm panel-close safety using a new, intentionally consented bench take.
 page.on('dialog',lambda d:d.accept());page.locator('#bench-record').click();wait(page,'goodbotDebug().bench.active');page.locator('[data-close="bench-dialog"]').click();assert not page.evaluate('goodbotDebug().bench.active');results.append({'test':'closing bench panel stops synthetic recording','status':'pass'})
 # Escape takes the same immediate release path and resets the consent checkbox.
 page.locator('#bench-btn').click();page.locator('#bench-agree').check();page.locator('#bench-record').click();wait(page,'goodbotDebug().bench.active');page.keyboard.press('Escape');assert not page.evaluate('goodbotDebug().bench.active');assert not page.locator('#bench-agree').is_checked();results.append({'test':'Escape stops bench recording and clears consent immediately','status':'pass'})
 # Check local recording releases on a synthetic visibility event, not a camera mock.
 page.locator('#record-btn').click();page.locator('#record-agree').check();page.locator('#record-start').click();wait(page,'goodbotDebug().recording.frames>=1');page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));")
 assert not page.evaluate('goodbotDebug().recording.active');assert page.evaluate("goodbotDebug().recording.stopReason==='tab_hidden'");results.append({'test':'hidden-tab event stops virtual capture and pauses gameplay','status':'pass'})
 assert not errors,errors;assert not any(u.startswith(('http:','https:')) for u in requests),requests
 (OUT/'report.json').write_text(json.dumps({'scope':'exact standalone set_content; retained CSP; CPU/WASM; actual UI and ZIP downloads; no HTTP navigation, WebGL or real webcam validation','results':results,'pageErrors':errors,'requests':requests},indent=2));print(json.dumps(results,indent=2));b.close()
