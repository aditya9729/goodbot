"""Browser tests. Default: normal HTTP + shipped CSP. --memory is explicit restricted-
environment harness, using identical modules as blobs and test-only injected CSS.
It does NOT establish deployed CSP, network, real camera or model correctness.
No game-state setters/teleports. Camera/inference are synthetic in named tests.
"""
from pathlib import Path
import argparse,base64,json,re,time,traceback
from playwright.sync_api import sync_playwright
import shutil
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public'
p=argparse.ArgumentParser();p.add_argument('--memory',action='store_true');p.add_argument('--renderer',choices=['cpu','gpu','auto'],default='auto');p.add_argument('--base-url',default='http://127.0.0.1:4174/goodbot/');p.add_argument('--out',default='evidence/browser');p.add_argument('--preview-only',action='store_true');p.add_argument('--only');p.add_argument('--executable');p.add_argument('--disable-webgl',action='store_true',help='Launch without WebGL so the CPU/WASM path is exercised on the same harness.');args=p.parse_args();OUT=ROOT/args.out;OUT.mkdir(parents=True,exist_ok=True)
ORDER=['math.js','identities.js','scene.js','navigation.js','director.js','game.js','geometry.js','hotel3d.js','raster-data.js','render-flat.js','gpu.js','render.js','zip.js','recording.js','tactile.js','data-ui.js','camera.js','hands.js','audio.js','lessons.js','apprentice.js','apprentice-session.js','apprentice-ui.js','app.js']
results=[]
MOCK=r'''() => {
 window.cameraMock={calls:0,stops:0,terminated:0,frames:0,kind:'deny',hands:true,x:.5,y:.5,pinch:false}; const m=window.cameraMock;
 Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async constraints=>{m.calls++;m.constraints=constraints;if(m.kind==='deny')throw new DOMException('Camera denied','NotAllowedError');const track={stop:()=>m.stops++,addEventListener(){}};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};if(m.kind==='pending')return new Promise(resolve=>m.resolve=()=>resolve(stream));return stream;}}});
 Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{configurable:true,get(){return this._stream||null},set(v){this._stream=v;}});
 Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>4});
 Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get:()=>performance.now()/1000});
 HTMLMediaElement.prototype.play=async()=>{};HTMLMediaElement.prototype.pause=()=>{};
 window.createImageBitmap=async()=>({close(){}});
 window.Worker=class{constructor(){this.onmessage=null;}terminate(){m.terminated++;}postMessage(data){
 if(data.type==='init')queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));
 if(data.type==='frame'){m.frames++;const points=Array.from({length:21},()=>({x:m.x,y:m.y}));points[0]={x:m.x,y:m.y+.3};points[9]={x:m.x,y:m.y};points[4]={x:m.x-.1,y:m.y-.1};points[8]={x:m.x+(m.pinch?-.08:.1),y:m.y-.1};queueMicrotask(()=>this.onmessage?.({data:{type:'result',landmarks:m.hands?[points]:[],inferenceMs:1,timestamp:data.timestamp}}));}
 }};
}'''
def wait(page,expr,seconds=15):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if page.evaluate(expr):return True
  page.wait_for_timeout(70)
 return False
 raise AssertionError('Timed out: '+expr)
def load(page,mock=False,width=1440,height=940):
 page.set_viewport_size({'width':width,'height':height})
 if args.memory:
  html=(PUBLIC/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html);html=re.sub(r'<link[^>]*>','',html);html=re.sub(r'<script type="module"[\s\S]*?</script>','',html)
  icon='data:image/svg+xml;base64,'+base64.b64encode((PUBLIC/'icon.svg').read_bytes()).decode();html=html.replace('./icon.svg',icon)
  page.set_content(html);page.add_style_tag(content=(PUBLIC/'style.css').read_text()+(PUBLIC/'realism.css').read_text()+(PUBLIC/'studio.css').read_text()+(PUBLIC/'apprentice.css').read_text())
  if mock:page.evaluate(MOCK)
  source=[{'name':n,'code':(PUBLIC/'src'/n).read_text()} for n in ORDER]
  page.evaluate(r'''async sources=>{const urls={};for(const {name,code} of sources){let text=code.replace(/from\s+['"]\.\/([^'"]+)['"]/g,(_,file)=>`from '${urls[file]}'`);text=text.replace("new URL('./vision-worker.js', import.meta.url)","new URL('https://goodbot.test/src/vision-worker.js')");urls[name]=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));}await import(urls['app.js']);}''',source)
 else:
  if mock:page.add_init_script('('+MOCK+')()')
  page.goto(args.base_url,wait_until='networkidle')
 wait(page,'!!window.goodbotDebug');page.wait_for_timeout(200)
 backend=page.evaluate('goodbotDebug().renderer')
 expected={'cpu':'Studio 3D · CPU/WASM','gpu':'Studio 3D · WebGL2'}
 assert backend in expected.values(), 'Expected actual 3D renderer, not 2D compatibility'
 if args.renderer!='auto': assert backend==expected[args.renderer],f'Required {args.renderer}, got {backend}'
def state(page):return page.evaluate('goodbotDebug()')
def begin(page):page.locator('#begin-btn').click();wait(page,'!goodbotDebug().paused')
def idle(page):
 wait(page,'!goodbotDebug().pending && !goodbotDebug().pathLength',20)
 # Completion needs o.settled >= .45 SIMULATED seconds. A fixed wall-clock sleep
 # is backend-dependent - it happened to satisfy that on CPU/WASM and to miss it
 # on WebGL2 - so wait on simulated time, which is what the rule is written in.
 t0=page.evaluate('goodbotDebug().simulationTime')
 if not wait(page,f'goodbotDebug().simulationTime>{t0}+0.75',15):page.wait_for_timeout(650)
def solve(page):
 for _ in range(100):
  s=state(page);remaining=[t for t in s['tasks'] if not t['done']]
  if not remaining:return
  task=remaining[0];page.locator('[data-task="'+task['id']+'"]').click();idle(page)
 raise AssertionError('Run did not finish')
def landing(page):
 load(page,mock=True);assert page.evaluate('cameraMock.calls')==0;assert state(page)['audioState']=='none'
 page.screenshot(path=str(OUT/'lobby.png'));begin(page);page.screenshot(path=str(OUT/'room-204.png'))
 assert page.locator('#finish-btn').is_disabled();assert page.locator('[data-task]').count()==2
 if args.preview_only:return
 # Pick the actual object on the canvas, rather than only using task shortcuts.
 s=state(page);pt=next(x for x in s['hotspots'] if x['id']=='cup-a');box=page.locator('#world').bounding_box();page.mouse.click(box['x']+pt['x'],box['y']+pt['y']);idle(page);assert state(page)['robot']['held']=='cup-a'
 page.locator('#deliver-btn').click();idle(page);assert any(t['id']=='place-cup-a' and t['done'] for t in state(page)['tasks'])
 solve(page);page.locator('#finish-btn').click();wait(page,"goodbotDebug().status==='won'");page.screenshot(path=str(OUT/'first-shift-complete.png'))
def campaign(page):
 load(page);begin(page)
 for name in ['welcome','checkout','stayover','preference','rescue','quiet']:
  assert state(page)['scene']==name
  solve(page);assert not page.locator('#finish-btn').is_disabled();page.locator('#finish-btn').click();wait(page,"goodbotDebug().status==='won'")
  if name=='checkout':page.screenshot(path=str(OUT/'checkout-complete.png'))
  if name!='quiet':page.locator('#next-btn').click();wait(page,"goodbotDebug().status==='playing'")
 page.screenshot(path=str(OUT/'quiet-complete.png'))
def pause_undo(page):
 load(page);begin(page);before=state(page)['robot'];page.keyboard.down('ArrowLeft');page.wait_for_timeout(350);page.keyboard.up('ArrowLeft');assert state(page)['robot']!=before
 page.locator('[data-task="place-cup-a"]').click();idle(page);page.locator('#undo-btn').click();assert state(page)['robot']['held'] is None
 page.keyboard.press('p');p=state(page)['robot'];page.wait_for_timeout(200);assert state(page)['robot']==p;page.locator('#resume-btn').click();assert not state(page)['paused']
def camera_denial(page):
 load(page,mock=True);begin(page);page.locator('#hands-btn').click();assert page.locator('#enable-camera').is_disabled();assert page.evaluate('cameraMock.calls')==0
 page.locator('#camera-agree').check();page.locator('#enable-camera').click();wait(page,"document.getElementById('camera-status').textContent.includes('denied')")
 assert page.evaluate('cameraMock.calls')==1;assert not state(page)['cameraActive'];assert page.evaluate('cameraMock.constraints.audio') is False
 page.screenshot(path=str(OUT/'camera-consent.png'))
def camera_cancel(page):
 load(page,mock=True);begin(page);page.evaluate("cameraMock.kind='pending'");page.locator('#hands-btn').click();page.locator('#camera-agree').check();page.locator('#enable-camera').click();wait(page,'cameraMock.calls===1');page.locator('[data-close="camera-consent"]').last.click();page.evaluate('cameraMock.resolve()');page.wait_for_timeout(150);assert page.evaluate('cameraMock.stops')==1;assert not state(page)['cameraActive']
def camera_tracking(page):
 load(page,mock=True);begin(page);page.locator('[data-task="place-cup-a"]').click();idle(page);assert state(page)['robot']['held']=='cup-a'
 page.evaluate("cameraMock.kind='success'");page.locator('#hands-btn').click();page.locator('#camera-agree').check();page.locator('#enable-camera').click();wait(page,'goodbotDebug().handCalibrated',15);wait(page,'!goodbotDebug().paused');assert state(page)['cameraActive']
 page.evaluate('cameraMock.hands=false');wait(page,'goodbotDebug().paused');assert state(page)['robot']['held']=='cup-a'
 page.locator('#stop-camera-paused').click();assert not state(page)['cameraActive'];assert page.evaluate('cameraMock.stops')==1;assert state(page)['robot']['held']=='cup-a'

def hand_pointer_action(page):
 load(page,mock=True);begin(page);page.evaluate("cameraMock.kind='success'");page.locator('#hands-btn').click();page.locator('#camera-agree').check();page.locator('#enable-camera').click();wait(page,'goodbotDebug().handCalibrated',15);wait(page,'!goodbotDebug().paused')
 def pinch_button(selector):
  box=page.locator(selector).bounding_box();x=(box['x']+box['width']/2)/1440;y=(box['y']+box['height']/2)/940
  page.evaluate('(p)=>{cameraMock.x=p.x;cameraMock.y=p.y;cameraMock.pinch=false;}',{'x':.5-(x-.5)/2.6,'y':.5+(y-.52)/2.8});page.wait_for_timeout(750)
  page.evaluate('cameraMock.pinch=true');page.wait_for_timeout(450);page.evaluate('cameraMock.pinch=false')
 pinch_button('[data-task="place-cup-a"]');idle(page);assert state(page)['robot']['held']=='cup-a'
 pinch_button('#deliver-btn');idle(page);assert state(page)['robot']['held'] is None;assert any(t['id']=='place-cup-a' and t['done'] for t in state(page)['tasks'])
 page.locator('#stop-camera').click();assert not state(page)['cameraActive']
def hidden_camera(page):
 load(page,mock=True);begin(page);page.evaluate("cameraMock.kind='success'");page.locator('#hands-btn').click();page.locator('#camera-agree').check();page.locator('#enable-camera').click();wait(page,'goodbotDebug().handCalibrated',15)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));");assert not state(page)['cameraActive'];assert page.evaluate('cameraMock.stops')==1;assert state(page)['paused']

def ai_controls(page):
 load(page);begin(page);page.locator('#director').evaluate('(e)=>e.open=true');page.locator('#ai-open-btn').click();assert page.locator('#generate-ai').is_disabled();page.locator('#ai-agree').check();assert not page.locator('#generate-ai').is_disabled();page.locator('#local-remix').click();assert not page.locator('#ai-dialog').is_visible();assert len(state(page)['tasks'])>0
 page.locator('#director').evaluate('(e)=>e.open=true');page.screenshot(path=str(OUT/'scene-director.png'))
def audio(page):
 load(page);begin(page);page.locator('#audio-btn').click();wait(page,"goodbotDebug().audioState==='running'");page.keyboard.press('p');wait(page,"goodbotDebug().audioState==='suspended'");page.locator('#resume-btn').click();wait(page,"goodbotDebug().audioState==='running'");page.locator('#audio-btn').click();wait(page,"goodbotDebug().audioState==='suspended'")
def mobile(page):
 load(page,width=390,height=844);begin(page);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('[data-task="place-cup-a"]').tap();idle(page);assert state(page)['robot']['held']=='cup-a';page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
 page.locator('#deliver-btn').tap();idle(page);assert any(t['done'] for t in state(page)['tasks'])
with sync_playwright() as pw:
 # Backend is chosen by capability, not a page flag, so forcing the CPU path
 # means denying WebGL at launch. The renderer assertion is unchanged.
 launch_args=['--no-sandbox']+(['--disable-webgl','--disable-webgl2'] if args.disable_webgl else [])
 browser=pw.chromium.launch(executable_path=args.executable or shutil.which('chromium'),headless=True,args=launch_args)
 funcs=[landing] if args.preview_only else [landing,campaign,pause_undo,camera_denial,camera_cancel,camera_tracking,hand_pointer_action,hidden_camera,ai_controls,audio,mobile]
 if args.only:funcs=[f for f in funcs if f.__name__ in args.only.split(',')]
 for fn in funcs:
  context=browser.new_context(has_touch=fn==mobile);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));t=time.monotonic()
  try:fn(page);assert not errors,errors;results.append({'test':fn.__name__,'status':'pass','backend':page.evaluate('goodbotDebug().renderer'),'seconds':round(time.monotonic()-t,2)});print('PASS',fn.__name__,flush=True)
  except Exception as e:
   results.append({'test':fn.__name__,'status':'fail','error':str(e),'trace':traceback.format_exc(),'pageErrors':errors});print('FAIL',fn.__name__,str(e),flush=True)
   try:page.screenshot(path=str(OUT/(fn.__name__+'-failure.png')))
   except:pass
  finally:context.close();(OUT/'report.json').write_text(json.dumps({'harness':'memory' if args.memory else 'HTTP','camera':'synthetic in camera scenarios','rendererRequirement':args.renderer ,'results':results},indent=2))
 browser.close()
if any(r['status']=='fail' for r in results):raise SystemExit(1)
