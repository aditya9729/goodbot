import { createApprenticeUI } from './apprentice-ui.js';
import { EpisodeRecorder, instrumentGame } from './recording.js';
import { createDataStudio } from './data-ui.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { LEVELS, createScene, dailyScene, THEMES } from './scene.js';
import { taskDone, compilePlan } from './director.js';
import { CameraSession, cameraMessage } from './camera.js';
import { HandPointer } from './hands.js';
import { HotelAudio } from './audio.js';
const $=id=>document.getElementById(id);
const readSave=()=>{try{const a=JSON.parse(localStorage.getItem('goodbot-progress-v1')||'{}');return {completed:Array.isArray(a.completed)?[...new Set(a.completed.filter(id=>LEVELS.some(l=>l.id===id)))]:[],paint:typeof a.paint==='string'?a.paint:'default'};}catch{return {completed:[]};}};
const recorder=new EpisodeRecorder();
let progress=readSave(),game=instrumentGame(new Game(),recorder),renderer=new Renderer($('world')),audio=new HotelAudio(),hand=new HandPointer();
let last=performance.now(),taskSignature='',paused=false,selected=null,uiTick=0,handLost=false,started=false;
const keys=new Set();let aiGeneration=0;let mentor=null;
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{keys.clear();renderer.setView?.(b.dataset.view);updateViewHelp();for(const q of document.querySelectorAll('[data-view]'))q.setAttribute('aria-pressed',String(q===b));};
function updateViewHelp(){
 const robot=renderer.mode==='robot';
 document.querySelector('.footer-controls').textContent=robot?'W/S drive · A/D turn · Q/E strafe · C center · U undo':'WASD / arrows move · U undo · P pause';
 document.querySelector('.view-help').textContent=robot?'W/S drive · A/D turn · Q/E strafe · Right-drag look':'Right-drag to look · Scroll to zoom';
 $('center-view').hidden=!robot;
}
$('center-view').onclick=()=>renderer.resetLook?.();
const anyDialog=()=>!!document.querySelector('dialog[open]');
function notify(message){$('status').textContent=message;$('bot-bubble').textContent=message.replace(/^✓ /,'');}
function setPause(value){if(paused!==value)recorder.logAction(value?'pause':'resume',[],true,game,'game_interface');paused=value;keys.clear();if(value){audio.pause();mentor?.pause();game.cancel();}else if(!document.hidden)audio.resume().catch(()=>{});}
function open(id){setPause(true);$(id).showModal();}
function close(id){$(id).close();if(!anyDialog())setPause(false);}
function shutdownCamera(){camera.stop();hand.reset();$('hand-cursor').hidden=true;$('camera-agree').checked=false;$('enable-camera').disabled=true;}
const camera=new CameraSession({video:$('camera-video'),onStatus(status){$('camera-status').textContent=status==='permission'?'Approve the browser’s camera prompt, or cancel.':status==='loading'?'Loading the optional hand model…':status==='ready'?'Hold one open hand still for calibration.':'Camera off';if(status==='ready'){$('stop-camera').hidden=false;$('stop-camera-paused').hidden=false;}},
 onStopped(){ $('stop-camera-paused').hidden=true;$('stop-camera').hidden=true;$('hand-cursor').hidden=true;},
 onError(e){notify(cameraMessage(e));$('camera-status').textContent=cameraMessage(e);if(started&&!anyDialog()&&game.status==='playing')open('pause');},
 onResult(result,now){const h=hand.feed(result.landmarks,now);if(!h.valid)return;if(!h.calibrated){$('camera-status').textContent='Hold an open palm still. Calibrating…';return;}
 if($('camera-consent').open){$('camera-consent').close();setPause(false);notify('Palm moves the pointer. Pinch once to choose. Stop camera is always available.');}
 if(handLost){notify('Hand found. Resume when you are comfortable.');handLost=false;}
 const cursor=$('hand-cursor'),x=h.x*innerWidth,y=h.y*innerHeight;cursor.hidden=false;cursor.style.left=x+'px';cursor.style.top=y+'px';cursor.classList.toggle('pinched',h.pinched);
 if(h.click&&!document.hidden){const el=document.elementFromPoint(x,y);if(el?.closest('button'))el.closest('button').click();else if(el===$('world')&&!paused){const r=el.getBoundingClientRect();chooseAt(x-r.left,y-r.top);}}
 }});
function reset(scene){started=true;recorder.stop('scene_change',game);shutdownCamera();aiGeneration++;game=instrumentGame(new Game(scene),recorder);mentor?.bindGame(game);renderer.hint=null;renderer.hover=null;renderer.particles=[];selected=null;taskSignature='';paused=false;uiTick=0;refresh(true);notify(scene.level.story);}
function switchLevel(id){for(const d of document.querySelectorAll('dialog[open]'))d.close();reset(createScene(id));audio.resume().catch(()=>{});}
function chooseAt(x,y){if(paused||game.status!=='playing')return;const id=renderer.hit(x,y);if(id){selected=id;game.command(id);}else game.travel(renderer.unproject(x,y));}
function taskAction(t){if(paused||taskDone(game.scene,t))return;selected=t.entity;if(t.kind==='place')game.command(game.robot.held===t.entity?t.destination:t.entity);else game.command(t.kind==='takeover'?'takeover':t.kind==='defer'?'defer-room':t.entity);refresh();}
function refresh(force=false){const scene=game.scene,done=game.plan.tasks.filter(t=>taskDone(scene,t)).length,total=game.plan.tasks.length;
 $('shift-number').textContent='SHIFT '+scene.level.number;$('world-tag').textContent='ROOM '+scene.level.room+' · '+scene.level.short.toUpperCase();$('room-num').textContent=scene.level.room;
 $('room-permission').textContent=scene.permission==='granted'?'Entry authorized':'No entry · defer only';$('mission-title').textContent=game.plan.title;$('mission-story').textContent=game.plan.brief;
 $('readiness-text').textContent=done+' / '+total;$('progress-fill').style.width=(done/Math.max(total,1)*100)+'%';$('stars-total').textContent=progress.completed.length+' keepsakes';
 const signature=JSON.stringify([scene.id,game.plan.tasks.map(t=>[t.id,taskDone(scene,t)]),game.robot.held]);
 if(force||signature!==taskSignature){taskSignature=signature;$('task-list').replaceChildren();
 for(const t of game.plan.tasks){const b=document.createElement('button');const isDone=taskDone(scene,t);b.className='task'+(isDone?' done':'');b.dataset.task=t.id;b.dataset.kind=t.kind;b.setAttribute('aria-label',(isDone?'Completed: ':'')+t.label);
  const icon=document.createElement('span');icon.className='task-icon';icon.textContent=isDone?'✓':t.kind==='flag'?'⚑':t.kind==='open'?'▤':t.entity==='chair'?'↔':t.kind==='defer'?'☾':t.entity.includes('towel')?'▰':'☕';
  const title=document.createElement('span');title.className='task-text';title.textContent=t.label;
  const arrow=document.createElement('span');arrow.className='task-arrow';arrow.textContent=isDone?'':'↗';b.append(icon,title,arrow);b.addEventListener('click',()=>taskAction(t));b.addEventListener('mouseenter',()=>renderer.hint=t.kind==='place'&&game.robot.held?t.destination:t.entity);b.addEventListener('mouseleave',()=>renderer.hint=null);$('task-list').append(b);
 }
 }
 const held=game.robot.held?game.entity(game.robot.held):null;$('carry-label').textContent=held?held.label:'Ready to help';$('carry-help').textContent=held?'Place it at '+game.entity(held.desired).label+'.':'Pick up one item at a time.';
 $('deliver-btn').hidden=!held;if(held)$('deliver-btn').textContent='Place on '+game.entity(held.desired).label+' ↗';
 $('finish-btn').disabled=done!==total||!!held||game.status!=='playing';
 const special=scene.permission!=='granted'&&!scene.deferred?'defer-room':!scene.rescueTaken?'takeover':null;$('special-btn').hidden=!special;$('special-btn').textContent=special==='defer-room'?'☾ Respect the sign · defer room':'⚑ Take over from practice bot';$('special-btn').dataset.action=special||'';
 $('undo-btn').disabled=!game.lastSnapshot;
 audio.progress=done/Math.max(total,1);
 if(force){$('director-trace').replaceChildren();for(const t of game.plan.trace){const d=document.createElement('div'),b=document.createElement('b');b.textContent=t.role;d.append(b,document.createTextNode(t.message));$('director-trace').append(d);}document.documentElement.style.setProperty('--green',THEMES[scene.level.theme].trim);}
}

const PAINTS=[{id:'default',name:'Linen',color:'#e7e6cf',level:null},{id:'mint',name:'Mint',color:'#b5d2b2',level:'welcome'},{id:'lavender',name:'Lavender',color:'#c8b7de',level:'stayover'},{id:'ocean',name:'Ocean',color:'#a6cad9',level:'preference'},{id:'moon',name:'Moonlight',color:'#aeb3d5',level:'quiet'}];
function applyPaint(){const choice=PAINTS.find(p=>p.id===progress.paint&&(!p.level||progress.completed.includes(p.level)))||PAINTS[0];renderer.paint=choice.color;renderer.cap=progress.completed.includes('checkout');renderer.rescueAntenna=progress.completed.includes('rescue');}
function showPaints(){$('paint-options').replaceChildren();for(const p of PAINTS){const b=document.createElement('button');b.textContent=p.name;b.disabled=!!p.level&&!progress.completed.includes(p.level);b.setAttribute('aria-pressed',String(progress.paint===p.id));b.style.borderBottom='4px solid '+p.color;b.onclick=()=>{progress.paint=p.id;applyPaint();showPaints();try{localStorage.setItem('goodbot-progress-v1',JSON.stringify(progress));}catch{}};$('paint-options').append(b);}}

function showLevels(){const grid=$('level-grid');grid.replaceChildren();let unlocked=0;while(unlocked<LEVELS.length-1&&progress.completed.includes(LEVELS[unlocked].id))unlocked++;
 LEVELS.forEach((l,i)=>{const b=document.createElement('button');b.className='level-card'+(i>unlocked?' locked':'');b.disabled=i>unlocked;b.dataset.level=l.id;
 const ico=document.createElement('span');ico.className='level-icon';ico.textContent=l.icon;const id=document.createElement('span');id.className='level-id';id.textContent=progress.completed.includes(l.id)?'✓ COMPLETE':i>unlocked?'LOCKED':'ROOM '+l.room;
 const title=document.createElement('strong');title.textContent=l.short;const small=document.createElement('small');small.textContent=l.skill;b.append(ico,id,title,small);b.onclick=()=>switchLevel(l.id);grid.append(b);});showPaints();open('levels');}
function win(){recorder.stop('mission_completed',game);if(!game.scene.daily&&!progress.completed.includes(game.scene.id)){progress.completed.push(game.scene.id);try{localStorage.setItem('goodbot-progress-v1',JSON.stringify(progress));}catch{}}
 applyPaint();const l=game.scene.level;$('win-title').textContent=l.badge;$('win-story').textContent='Readiness complete. Guest belongings respected. A little more welcoming.';
 $('thank-you').textContent=l.id==='quiet'?'Thank you for knowing when to leave things be. That is care, too.':l.id==='stayover'?'The room still feels like theirs. That is exactly what they asked for.':'You didn’t just put things away. You made a little room for someone’s next story.';
 $('reward').textContent='KEEPSAKE UNLOCKED · '+l.reward;open('win');audio.resume().then(()=>audio.chime('win')).catch(()=>{});}
$('begin-btn').onclick=()=>{started=true;close('welcome');$('world').focus();notify('Select a cup in the room or task panel. Then choose Place. Right-drag changes the camera.');};
$('levels-btn').onclick=showLevels;document.querySelector('.brand').onclick=e=>{e.preventDefault();showLevels();};
$('pause-btn').onclick=()=>{if($('pause').open)close('pause');else open('pause');};$('resume-btn').onclick=()=>close('pause');
$('reset-btn').onclick=()=>{const scene=createScene(game.scene.id,game.scene.seed);close('pause');reset(scene);};
$('undo-btn').onclick=()=>{game.undo();refresh();};$('hint-btn').onclick=()=>{const h=game.nextHint();renderer.hint=h.id;notify(h.message);};
$('deliver-btn').onclick=()=>{const held=game.entity(game.robot.held);if(held)game.command(held.desired);};
$('special-btn').onclick=()=>game.command($('special-btn').dataset.action);$('finish-btn').onclick=()=>game.finish();
$('next-btn').onclick=()=>{const i=LEVELS.findIndex(l=>l.id===game.scene.id);if(i<LEVELS.length-1)switchLevel(LEVELS[i+1].id);else {close('win');showLevels();}};
$('replay-btn').onclick=()=>switchLevel(game.scene.id);$('daily-btn').onclick=()=>{close('levels');reset(dailyScene());};
$('audio-btn').onclick=async()=>{try{await audio.toggle();$('audio-btn').textContent=audio.enabled?'♫ Sound on':'♫ Sound off';$('audio-btn').setAttribute('aria-pressed',String(audio.enabled));}catch{notify('Audio could not start in this browser. The game still works silently.');}};
$('music-volume').oninput=e=>{audio.music=Number(e.target.value)/100;audio.setVolume();};$('effects-volume').oninput=e=>{audio.effects=Number(e.target.value)/100;audio.setVolume();};
$('reduced-motion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;renderer.reduced=$('reduced-motion').checked;$('reduced-motion').onchange=e=>renderer.reduced=e.target.checked;
$('hands-btn').onclick=()=>{shutdownCamera();hand.reset();open('camera-consent');};$('camera-agree').onchange=e=>$('enable-camera').disabled=!e.target.checked;
$('enable-camera').onclick=async()=>{if(!$('camera-agree').checked)return;$('enable-camera').disabled=true;hand.reset();await camera.start({consent:true});if(!camera.active)$('enable-camera').disabled=!$('camera-agree').checked;};
$('stop-camera').onclick=$('stop-camera-paused').onclick=()=>{shutdownCamera();notify('Camera stopped. Mouse, touch and keyboard are ready.');};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>{const id=b.dataset.close;if(id==='camera-consent')shutdownCamera();if(id==='ai-dialog')aiGeneration++;close(id);};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='welcome')return;if(d.id==='camera-consent')shutdownCamera();if(d.id==='ai-dialog')aiGeneration++;close(d.id);});
$('world').addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=e.currentTarget.getBoundingClientRect();chooseAt(e.clientX-r.left,e.clientY-r.top);e.currentTarget.focus();});
$('world').addEventListener('pointermove',e=>{const r=e.currentTarget.getBoundingClientRect();renderer.hover=renderer.hit(e.clientX-r.left,e.clientY-r.top);});$('world').addEventListener('pointerleave',()=>renderer.hover=null);
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(anyDialog())return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.repeat)return;
 if(e.key.toLowerCase()==='c')renderer.resetLook?.();if(e.key.toLowerCase()==='p'||e.key==='Escape')open('pause');if(e.key.toLowerCase()==='u')game.undo();if(e.key.toLowerCase()==='h')$('hint-btn').click();if(e.key.toLowerCase()==='m')$('audio-btn').click();if(e.key.toLowerCase()==='r'&&camera.active){hand.reset();open('camera-consent');}
});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden){shutdownCamera();audio.pause();keys.clear();if(!anyDialog()&&started&&game.status==='playing')open('pause');}});addEventListener('pagehide',()=>{shutdownCamera();audio.pause();});
$('ai-open-btn').onclick=()=>{$('ai-agree').checked=false;$('generate-ai').disabled=true;open('ai-dialog');};$('ai-agree').onchange=e=>$('generate-ai').disabled=!e.target.checked;
$('local-remix').onclick=()=>{close('ai-dialog');reset(dailyScene());notify('Local scene director: a free seeded room, with all rules checked.');};
$('generate-ai').onclick=async()=>{
 if(!$('ai-agree').checked)return;const gen=++aiGeneration;$('generate-ai').disabled=true;$('ai-status').textContent='Requesting one scene-grounded proposal…';
 try{const config=await fetch('./api/config',{cache:'no-store'});if(!config.ok)throw new Error('AI is unavailable on this static host. Use the local Node server and server-side environment variables.');const cfg=await config.json();if(!cfg.aiEnabled)throw new Error('AI is disabled. Set GOODBOT_AI_ENABLED, OPENAI_API_KEY and OPENAI_MODEL on the local server.');
 const res=await fetch('./api/tasks',{method:'POST',headers:{'Content-Type':'application/json','X-Goodbot-CSRF':cfg.csrf},body:JSON.stringify({levelId:game.scene.id,seed:game.scene.seed,consent:true}),signal:AbortSignal.timeout(35000)});
 const data=await res.json();if(!res.ok)throw new Error(data.error||'The director request failed.');if(gen!==aiGeneration)return;
 const scene=createScene(game.scene.id,game.scene.seed),plan=compilePlan(scene,data.proposal);close('ai-dialog');reset(scene);game.plan=plan;taskSignature='';refresh(true);notify('AI remix accepted after local permission, coverage and route checks.');
 }catch(e){if(gen===aiGeneration)$('ai-status').textContent=e.message||'AI unavailable. Local levels still work.';}finally{if(gen===aiGeneration)$('generate-ai').disabled=!$('ai-agree').checked;}
};
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused&&!anyDialog()&&!document.hidden){const sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);const strafe=(keys.has('e')?1:0)-(keys.has('q')?1:0);
 if(renderer.mode==='robot'){
  if(sx||sy||strafe)game.directRobot(-sy,sx,strafe,dt);
 }else if(sx||sy){if(renderer.R&&renderer.F){const fx=renderer.F[0],fz=renderer.F[2],n=Math.hypot(fx,fz)||1;game.direct(renderer.R[0]*sx-fx/n*sy,renderer.R[2]*sx-fz/n*sy,dt);}else game.direct(sx+sy,sy-sx,dt);}game.update(dt);}
 if(camera.ready&&hand.calibrated&&hand.stale(now)&&!paused){setPause(true);handLost=true;open('pause');notify('Tracking lost. The robot is holding still; nothing was dropped.');$('hand-cursor').hidden=true;}
 if(!paused&&!anyDialog()&&!document.hidden)mentor?.frame(dt);
 const events=game.events.splice(0);for(const e of events){notify(e.message);if(e.type==='place'){renderer.spark(e.x,e.z);audio.chime();}if(e.type==='pick')audio.chime('pick');if(e.type==='win'){if(game.scene.learningSandbox){recorder.stop('mission_completed',game);mentor.onWin();}else win();}}
 renderer.draw(game,dt);if(!paused&&!anyDialog()&&!document.hidden){recorder.observe(game);void recorder.sample(game,renderer);}studio.frame(dt);uiTick+=dt;if(uiTick>.1){uiTick=0;refresh();}requestAnimationFrame(frame);
}
const studio=createDataStudio({recorder,getGame:()=>game,getRenderer:()=>renderer,open,close,notify,isStarted:()=>started});
mentor=createApprenticeUI({getGame:()=>game,reset,open,close,notify,getRenderer:()=>renderer});mentor.bindGame(game);
applyPaint();refresh(true);open('welcome');requestAnimationFrame(frame);
// Read-only diagnostic snapshot; no setters, teleport, completion or health bypass.
Object.defineProperty(window,'goodbotDebug',{value:()=>({version:'0.4.0',apprentice:mentor.summary(),recording:recorder.summary(),bench:studio.summary(),renderer:renderer.backend||'legacy',view:renderer.mode||'flat',renderMs:renderer.lastRenderMs||0,renderFrames:renderer.renderFrames||0,shadowBuilds:renderer.engine?.shadowBuildCount?.()||0,
 raster:{width:renderer.rw,height:renderer.rh},viewPose:{eye:renderer.eye?.slice(),target:renderer.target?.slice(),lookYaw:renderer.yaw,lookPitch:renderer.pitch,fov:renderer.fov},simulationTime:game.time,scene:game.scene.id,status:game.status,paused,robot:{x:game.robot.x,z:game.robot.z,held:game.robot.held},pending:game.pending?.id||null,pathLength:game.path.length,robotYaw:game.robot.yaw,tasks:game.plan.tasks.map(t=>({id:t.id,done:taskDone(game.scene,t)})),cameraActive:camera.active,cameraReady:camera.ready,handCalibrated:hand.calibrated,audioState:audio.ctx?.state||'none',history:game.history.slice(),hotspots:renderer.hotspots.map(p=>({...p}))}),writable:false});
