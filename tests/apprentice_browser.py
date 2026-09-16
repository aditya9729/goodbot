"""Apprentice tests through ordinary UI. Exact standalone, own CSP retained.
Not a file/HTTP navigation, real webcam or GPU claim. No setters or forced wins.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil,json,time,traceback,argparse
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--only');p.add_argument('--out',default='evidence/apprentice-browser');args=p.parse_args();OUT=R/args.out;OUT.mkdir(parents=True,exist_ok=True)
results=[]
def wait(p,expr,timeout=150):
 t=time.monotonic()+timeout
 while time.monotonic()<t:
  if p.evaluate(expr):return
  p.wait_for_timeout(100)
  if p.evaluate('!!window.goodbotDebug'):(OUT/'latest-state.json').write_text(json.dumps(state(p),indent=2))
 raise AssertionError('Timed out: '+expr+'\n'+str(p.evaluate('goodbotDebug()')))
def state(p):return p.evaluate('goodbotDebug()')
def idle(p):wait(p,'!goodbotDebug().pending && !goodbotDebug().pathLength');p.wait_for_timeout(700)
def load(p):
 p.set_viewport_size({'width':1440,'height':940});p.set_content((R/'GOODBOT-Real-Look.html').read_text(),wait_until='load');wait(p,'!!window.goodbotDebug',20)
 p.locator('#meet-nori').click();p.locator('[data-lesson="collect"]').click();wait(p,"goodbotDebug().apprentice.context==='collect'")
def consent(p):
 p.locator('#teach-btn').click();assert p.locator('#start-teaching').is_disabled();assert not state(p)['apprentice']['consent'];p.locator('#teach-agree').check();p.locator('#start-teaching').click();assert state(p)['apprentice']['consent']
def demonstrate(p,context='collect'):
 if context=='linen':
  p.locator('[data-task="open-cupboard"]').click();idle(p)
  pairs=[('towel-0','fresh-shelf'),('towel-1','fresh-shelf')]
 else:pairs=[('cup-a','tea-tray' if context=='tea' else 'cart-tray'),('cup-b','tea-tray' if context=='tea' else 'cart-tray')]
 for obj,dest in pairs:
  p.locator('[data-task="place-'+obj+'"]').click();idle(p);assert state(p)['robot']['held']==obj
  p.locator('[data-mentor-destination="'+dest+'"]').click();idle(p);assert state(p)['robot']['held'] is None
 p.locator('#finish-btn').click();wait(p,"goodbotDebug().status==='won'")
def fit(p):
 p.locator('#learn-btn').click();wait(p,"goodbotDebug().apprentice.modelVersion>0 && !goodbotDebug().apprentice.dirty")
def cold_and_consent(p):
 load(p);assert state(p)['apprentice']['examples']==0;p.locator('#your-turn-btn').click();wait(p,"goodbotDebug().apprentice.mode==='help'");assert not state(p)['pending'];assert state(p)['apprentice']['attempts'][-1]['outcome']=='asked_for_help'
 p.locator('#teach-btn').click();assert not p.locator('#teach-agree').is_checked();p.locator('#cancel-teaching').click();assert not state(p)['apprentice']['consent']
 p.locator('[data-task="place-cup-a"]').click();idle(p);assert state(p)['apprentice']['examples']==0
 p.screenshot(path=str(OUT/'new-apprentice.png'))
def teach_and_autonomy(p):
 load(p);consent(p);demonstrate(p);print('  demonstration done',flush=True);assert state(p)['apprentice']['examples']==5;assert not state(p)['apprentice']['consent'];fit(p)
 seed=state(p)['apprentice']['seed'];p.locator('#shuffle-btn').click();assert state(p)['apprentice']['seed']!=seed;assert state(p)['apprentice']['examples']==5
 p.locator('#your-turn-btn').click();wait(p,"goodbotDebug().apprentice.mode==='preview'");p.locator('#apprentice-panel').scroll_into_view_if_needed();p.screenshot(path=str(OUT/'nori-thinking.png'))
 wait(p,"goodbotDebug().status==='won' || goodbotDebug().apprentice.mode==='help'",300);s=state(p);assert s['status']=='won',s['apprentice'];assert s['apprentice']['examples']==5
 attempt=s['apprentice']['attempts'][-1];assert attempt['completed'];assert not attempt['trainedOnThisLayout'];assert len(attempt['decisions'])==5
 p.locator('#apprentice-panel summary').click()
 with p.expect_download() as d:p.locator('#export-nori').click()
 path=OUT/'browser-trained-nori.json';d.value.save_as(str(path));data=json.loads(path.read_text());assert len(data['examples'])==5;assert data['weights'];assert data['privacy']['webcam'] is False
 p.locator('#apprentice-panel').scroll_into_view_if_needed();p.screenshot(path=str(OUT/'nori-finished.png'));(OUT/'autonomy-state.json').write_text(json.dumps(s,indent=2))
 # Untaught context should not run the cup routine accidentally.
 p.locator('#lesson-switch-btn').click();p.locator('[data-lesson="tea"]').click();p.locator('#your-turn-btn').click();wait(p,"goodbotDebug().apprentice.mode==='help'");assert not state(p)['pending']
def takeover_and_pause(p):
 load(p);consent(p);demonstrate(p);fit(p);p.locator('#shuffle-btn').click();p.locator('#your-turn-btn').click();wait(p,"goodbotDebug().apprentice.mode==='preview'");p.locator('#takeover-btn').click();assert not state(p)['pending'];assert state(p)['apprentice']['mode']=='idle';assert not state(p)['apprentice']['consent']
 p.locator('#your-turn-btn').click();wait(p,"goodbotDebug().apprentice.mode==='running'");p.locator('#pause-btn').click();s=state(p);assert s['paused'];assert not s['pending'];assert not s['apprentice']['consent'];assert s['apprentice']['mode']=='idle';p.locator('#resume-btn').click();assert not state(p)['apprentice']['consent']
def import_reject_and_forget(p):
 load(p);p.locator('#apprentice-panel details').evaluate('(e)=>e.open=true');p.locator('#import-nori-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"schema":"evil"}'})
 wait(p,"document.getElementById('status').textContent.includes('Import rejected')");assert state(p)['apprentice']['examples']==0
 p.screenshot(path=str(OUT/'notebook-privacy.png'))
def mobile(p):
 load(p);p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(300);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');p.locator('#teach-btn').tap();p.locator('#teach-agree').check();p.locator('#start-teaching').tap();assert state(p)['apprentice']['consent'];p.locator('#apprentice-panel').scroll_into_view_if_needed();p.screenshot(path=str(OUT/'mobile-apprentice.png'),full_page=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 funcs=[cold_and_consent,teach_and_autonomy,takeover_and_pause,import_reject_and_forget,mobile]
 if args.only:funcs=[f for f in funcs if f.__name__ in args.only.split(',')]
 for fn in funcs:
  context=browser.new_context(accept_downloads=True,has_touch=fn==mobile);page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));start=time.monotonic()
  try:
   fn(page);assert not errors,errors;assert not any(r.startswith(('http:','https:'))for r in requests),requests
   results.append({'test':fn.__name__,'status':'pass','seconds':round(time.monotonic()-start,2),'renderer':state(page)['renderer'],'requests':requests});print('PASS',fn.__name__,flush=True)
  except Exception as e:
   results.append({'test':fn.__name__,'status':'fail','error':str(e),'trace':traceback.format_exc(),'pageErrors':errors});print('FAIL',fn.__name__,str(e),flush=True)
   try:page.screenshot(path=str(OUT/(fn.__name__+'-failure.png')))
   except:pass
  finally:
   context.close();(OUT/'report.json').write_text(json.dumps({'harness':'exact standalone set_content with own CSP; not HTTP/file navigation','results':results},indent=2))
 browser.close()
if any(r['status']=='fail'for r in results):raise SystemExit(1)
