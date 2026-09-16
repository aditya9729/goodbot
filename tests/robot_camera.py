"""Regression for the reported robot-camera vibration.
Uses the exact exported HTML with its CSP retained and normal keyboard/mouse input.
Only reads diagnostics; does not set scene/robot/outcome or patch game controls.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,math,shutil,time
R=Path(__file__).resolve().parents[1];OUT=R.parent/'evidence/robot-camera';OUT.mkdir(parents=True,exist_ok=True)
def state(p):return p.evaluate('goodbotDebug()')
def wait(p,expr,seconds=30):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if p.evaluate(expr):return
  p.wait_for_timeout(60)
 raise AssertionError('Timed out: '+expr)
def collect(p):
 p.evaluate('''()=>{window.cameraSamples=[];window.collecting=true;function sample(t){if(!collecting)return;cameraSamples.push({t,...goodbotDebug()});requestAnimationFrame(sample)}requestAnimationFrame(sample)}''')
def stop(p):
 return p.evaluate('()=>{collecting=false;return cameraSamples}')
def delta(a,b):return math.atan2(math.sin(a-b),math.cos(a-b))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-webgl','--disable-webgl2'])  # CPU/WASM path: these checks describe its backend name and moving-resolution drop
 p=browser.new_page(viewport={'width':1280,'height':800});errors=[];requests=[];tests=[];traces={}
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 p.set_content((R/'GOODBOT-Real-Look.html').read_text(),wait_until='load');wait(p,'!!window.goodbotDebug')
 assert state(p)['version']==json.loads((R/'package.json').read_text())['version'];p.locator('#begin-btn').click();p.locator('[data-view="robot"]').click();p.wait_for_timeout(400)
 assert state(p)['view']=='robot';assert 'W/S drive' in p.locator('.view-help').inner_text()
 # Reversing should translate in just one direction, not flip every frame.
 before=state(p);collect(p);p.keyboard.down('s');p.wait_for_timeout(850);p.keyboard.up('s');samples=stop(p);traces['reverse']=samples
 yaw=before['robotYaw'];moves=[(b['robot']['x']-a['robot']['x'])*math.sin(yaw)+(b['robot']['z']-a['robot']['z'])*math.cos(yaw) for a,b in zip(samples,samples[1:])]
 assert all(v<=1e-7 for v in moves),moves
 assert sum(v<-1e-7 for v in moves)>=3,moves
 assert all(abs(delta(s['robotYaw'],yaw))<1e-8 for s in samples)
 tests.append('Holding S moves only backward; no alternating-frame direction or heading flips')
 # Move back into the room without a scene reset, then strafe with held heading.
 p.keyboard.down('w');p.wait_for_timeout(650);p.keyboard.up('w');before=state(p);collect(p)
 p.keyboard.down('q');p.wait_for_timeout(300);p.keyboard.up('q');samples=stop(p);traces['strafe']=samples;after=state(p)
 assert abs(delta(after['robotYaw'],before['robotYaw']))<1e-8
 assert math.hypot(after['robot']['x']-before['robot']['x'],after['robot']['z']-before['robot']['z'])>.04
 tests.append('Q/E body-frame strafe does not spin the view')
 # Turning in place is rate limited, with no translation.
 before=state(p);collect(p);p.keyboard.down('a');p.wait_for_timeout(400);p.keyboard.up('a');samples=stop(p);traces['turn']=samples;after=state(p)
 assert math.hypot(after['robot']['x']-before['robot']['x'],after['robot']['z']-before['robot']['z'])<1e-8
 assert abs(delta(after['robotYaw'],before['robotYaw']))>.08
 assert all(abs(delta(b['robotYaw'],a['robotYaw']))<=.090001 for a,b in zip(samples,samples[1:]))
 tests.append('A/D turns in place; per-frame heading step is bounded')
 # Inspecting with mouse changes only look. Camera settings survive view switching.
 box=p.locator('#world').bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5;before=state(p)
 p.mouse.move(x,y);p.mouse.down(button='right');p.mouse.move(x+55,y+18,steps=5);p.mouse.up(button='right');p.mouse.wheel(0,-120);p.wait_for_timeout(500);look=state(p)
 assert look['robot']==before['robot'];assert abs(look['viewPose']['lookYaw'])>.1
 p.locator('[data-view="room"]').click();p.locator('[data-view="robot"]').click();again=state(p)
 for key in ['lookYaw','lookPitch','fov']:assert again['viewPose'][key]==look['viewPose'][key]
 p.locator('[data-view="robot"]').click();assert state(p)['viewPose']['lookYaw']==look['viewPose']['lookYaw']
 p.locator('#center-view').click();assert state(p)['viewPose']['lookYaw']==0
 tests.append('Look/zoom do not move the robot; mode switches preserve them; Center view resets')
 # Actual task-driven navigation, all corners, pickup and delivery, in robot camera.
 collect(p);p.locator('[data-task="place-cup-a"]').click();wait(p,"goodbotDebug().robot.held==='cup-a'",60)
 p.locator('#deliver-btn').click();wait(p,"goodbotDebug().tasks.some(t=>t.id==='place-cup-a'&&t.done)",60)
 samples=stop(p);traces['task-route']=samples
 jumps=[abs(delta(b['robotYaw'],a['robotYaw'])) for a,b in zip(samples,samples[1:])]
 assert max(jumps,default=0)<=.120001,max(jumps,default=0)
 assert max(s['shadowBuilds'] for s in samples)==min(s['shadowBuilds'] for s in samples)
 assert any(s['raster']['width']<=384 for s in samples)
 p.wait_for_timeout(650);assert state(p)['raster']['width']==640
 tests.append('Cup approach and delivery complete with bounded turns and cached static shadows; idle detail returns')
 # Stop keys on pause, including while turning.
 p.keyboard.down('d');p.wait_for_timeout(100);p.keyboard.press('p');p.keyboard.up('d');before=state(p);p.wait_for_timeout(300);after=state(p)
 assert before['robot']==after['robot'];assert before['robotYaw']==after['robotYaw'];p.locator('#resume-btn').click();p.wait_for_timeout(200)
 assert state(p)['robotYaw']==after['robotYaw']
 tests.append('Pause and resume clear held turning controls')
 p.screenshot(path=str(OUT/'robot-view.png'))
 p.locator('[data-view="room"]').click();p.screenshot(path=str(OUT/'room.png'))
 assert not errors,errors;assert not any(r.startswith(('http:','https:')) for r in requests),requests
 report={'passed':len(tests),'failed':0,'tests':tests,'pageErrors':errors,'requests':requests,'backend':state(p)['renderer'],'maxAutoTurnStepRad':max(jumps,default=0),'maxExpectedTurnStepRad':.12,'scope':'Exact standalone via set_content with its own CSP. Actual inputs, read-only diagnostics. No file navigation, physical webcam, GPU or deployed browser validation.'}
 (OUT/'report.json').write_text(json.dumps(report,indent=2));(OUT/'traces.json').write_text(json.dumps(traces))
 print(json.dumps(report,indent=2));browser.close()
