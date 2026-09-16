import { Apprentice } from './apprentice.js';
import { ApprenticeSession } from './apprentice-session.js';
import { LESSONS, createLessonScene } from './lessons.js';
import { compareVersions } from './apprentice-compare.js';
const $=id=>document.getElementById(id);
const STORAGE='goodbot-apprentice-v1';
export function createApprenticeUI({getGame,reset,open,close,notify,getRenderer}){
 let active=false,seedCount=1,session,saveEnabled=false,startedAt=Date.now().toString(36),cooldown=0;
 const panel=document.createElement('section');panel.id='apprentice-panel';panel.hidden=true;
 panel.innerHTML=`<div class="mentor-heading"><span class="nori-avatar" aria-hidden="true">◉‿◉</span><div><small>YOUR APPRENTICE</small><strong>Nori</strong></div><span id="nori-state">New arrival</span></div>
 <p id="nori-message" role="status" aria-live="polite">Show me a little of your world.</p>
 <div class="mentor-metrics"><span><b id="nori-count">0</b> decisions taught</span><span><b id="nori-version">0</b> model version</span></div>
 <div class="mentor-grid"><button id="teach-btn">① Teach</button><button id="learn-btn">② Learn</button><button id="shuffle-btn">③ New layout</button><button id="your-turn-btn">④ Your turn</button></div>
 <button id="takeover-btn" class="mentor-takeover" hidden>Take over · stop immediately</button>
 <div id="mentor-intent" hidden><small>NEXT INTENTION · NOT A SUCCESS PROBABILITY</small><strong id="intent-action"></strong><span id="intent-evidence"></span></div>
 <div id="mentor-destinations" hidden><small>CHOOSE A COMPATIBLE DESTINATION</small><div id="destination-options"></div></div>
 <div class="mentor-inline"><button id="step-btn">One choice</button><button id="lesson-switch-btn">Change lesson</button></div>
 <div id="mentor-changed" hidden><small>WHAT CHANGED · SAME ROOM, BOTH VERSIONS</small><div id="changed-body"></div><button id="changed-dismiss" class="mentor-dismiss">Got it</button></div>
 <div id="mentor-result" hidden><strong id="mentor-result-title"></strong><p id="mentor-result-text"></p></div>
 <details class="mentor-notebook"><summary>Teaching notebook & honest limits</summary><p>Local model of <b>which assisted skill to choose</b>. Navigation, grasp animations and guest protection are built in. It reads structured scene state, not images.</p><p id="mentor-fit">No fitted model yet.</p><p>Teaching records virtual pre-decision states and completed choices. No webcam images, raw hands, audio, account or uploads. The episode recorder is separate.</p><label><input id="save-nori" type="checkbox"> Keep this apprentice on this browser</label><div class="mentor-inline"><button id="export-nori">Export notebook</button><button id="import-nori">Import notebook</button></div><input id="import-nori-file" type="file" accept="application/json,.json" hidden><button id="forget-nori">Forget apprentice & local save</button></details>`;
 document.querySelector('aside').prepend(panel);
 const nav=document.createElement('button');nav.id='apprentice-btn';nav.textContent='✦ Apprentice';document.querySelector('header nav').prepend(nav);
 const welcome=document.createElement('button');welcome.id='meet-nori';welcome.className='secondary';welcome.textContent='✦ Meet Nori · teach an apprentice';$('begin-btn').after(welcome);
 const hub=document.createElement('dialog');hub.id='mentor-hub';hub.innerHTML=`<div class="dialog-top"><div><p class="kicker">MAKE ROOM / APPRENTICE SCHOOL</p><h2>A little robot.<br>A little more independent.</h2></div><button id="mentor-close" aria-label="Close apprentice school">×</button></div><p>You demonstrate. Nori fits a small local model. Rearrange the room, watch its next intention, and take over whenever it needs you.</p><div id="mentor-lessons"></div><div class="privacy-box">The learning is real but narrow: choosing existing assisted skills from structured game state. No API key. No visual or tactile learning. No physical robot.</div>`;
 document.body.append(hub);
 const consent=document.createElement('dialog');consent.id='teaching-consent';consent.innerHTML=`<p class="kicker">YOUR DEMONSTRATION / YOUR DEVICE</p><h2>Show Nori how.</h2><p>The teaching notebook stores the virtual state before a decision, your selected skill, its completed result and any correction link. Unfinished and rejected actions are not successful demonstrations.</p><div class="privacy-box">No webcam frames, raw hand landmarks, microphone, research uploads or external API. Your notebook stays in this tab unless you explicitly save or export it. Starting a new take requires this choice again.</div><label class="check"><input type="checkbox" id="teach-agree"> Use this demonstration to teach my apprentice locally.</label><button id="start-teaching" class="primary" disabled>Start teaching</button><button id="cancel-teaching" class="secondary">Not now</button>`;
 document.body.append(consent);
 for(const l of LESSONS){const b=document.createElement('button');b.className='mentor-lesson';b.dataset.lesson=l.id;b.innerHTML=`<small>LESSON ${l.number}</small><strong>${l.name}</strong><span>${l.brief}</span>`;b.onclick=()=>{close('mentor-hub');startLesson(l.id);};$('mentor-lessons').append(b);}
 session=new ApprenticeSession({onChange:()=>render()});
 try{const saved=localStorage.getItem(STORAGE);if(saved){session.model=Apprentice.fromJSON(saved);saveEnabled=true;$('save-nori').checked=true;}}catch{notify('The previous apprentice could not be loaded. Starting empty; campaign progress is unchanged.');}
 function persist(){if(!saveEnabled)return;try{localStorage.setItem(STORAGE,JSON.stringify(session.model.toJSON()));}catch{saveEnabled=false;$('save-nori').checked=false;notify('Local save unavailable. Export the notebook to keep it.');}}
 function hubOpen(){if($('welcome').open)close('welcome');open('mentor-hub');}
 nav.onclick=welcome.onclick=hubOpen;$('mentor-close').onclick=()=>close('mentor-hub');$('lesson-switch-btn').onclick=hubOpen;
 hub.addEventListener('cancel',e=>{e.preventDefault();close('mentor-hub');});
 function startLesson(id){const seed=`${startedAt}-${seedCount++}`;reset(createLessonScene(id,seed));$('mentor-result').hidden=true;session.message='Practice, or press Teach to start a consented demonstration.';render();}
 $('teach-btn').onclick=()=>{if(session.mode==='teaching'){session.endTeaching();persist();return;}open('teaching-consent');$('teach-agree').checked=false;$('start-teaching').disabled=true;};
 $('teach-agree').onchange=e=>$('start-teaching').disabled=!e.target.checked;
 $('start-teaching').onclick=()=>{if(!$('teach-agree').checked)return;close('teaching-consent');session.beginTeaching(true);$('teach-agree').checked=false;$('start-teaching').disabled=true;};
 function cancelTeaching(){close('teaching-consent');$('teach-agree').checked=false;$('start-teaching').disabled=true;}
 $('cancel-teaching').onclick=cancelTeaching;consent.addEventListener('cancel',e=>{e.preventDefault();cancelTeaching();});
 $('learn-btn').onclick=async()=>{try{await session.fit();persist();showWhatChanged();}catch(e){session.message=e.message;render();}};
$('changed-dismiss').onclick=()=>{$('mentor-changed').hidden=true;};
const describe=d=>!d?'—':d.ask?`asked for help — “${d.reason}”`:`${d.kind} · ${d.label||d.id}`;
function showWhatChanged(){
 const box=$('mentor-changed'),body=$('changed-body');
 const snaps=session.model.snapshots||[];
 if(snaps.length<2){box.hidden=true;return;}
 let r;
 // A comparison failure must never block teaching.
 try{r=compareVersions(session.model,{context:getGame().scene.lesson.id,seed:'compare-'+startedAt+'-'+session.model.version});}
 catch{box.hidden=true;return;}
 const older=`v${r.before.version}`,newer=`v${r.after.version}`;
 if(!r.changed){
  // Saying "nothing changed" is a real answer. Do not invent a difference.
  body.innerHTML=`<p>On this room <b>${older}</b> and <b>${newer}</b> still choose the same steps${r.completedAfter?' — and both finish it':''}. Your new lesson did not disturb what Nori already knew. Try <b>New layout</b>, or teach a different routine to see a change.</p>`;
 }else{
  const c=r.firstChange,ev=c.after&&c.after.evidence;
  body.innerHTML=`<p class="changed-line"><span class="changed-tag old">${older}</span> ${describe(c.before)}</p>`+
   `<p class="changed-line"><span class="changed-tag new">${newer}</span> ${describe(c.after)}</p>`+
   (ev?`<p class="changed-why">It handled that differently because you showed it a <b>${ev.kind}</b> of a <b>${ev.type}</b> in the room you taught.</p>`:'')+
   (r.completedAfter&&!r.completedBefore?`<p class="changed-why">${newer} finished this room on its own; ${older} could not.</p>`:'');
 }
 box.hidden=false;
}
 $('shuffle-btn').onclick=()=>{if(session.model.training)return;startLesson(getGame().scene.lesson.id);};
 $('your-turn-btn').onclick=()=>{session.startRun();render();};$('step-btn').onclick=()=>{session.startRun({single:true});render();};
 $('takeover-btn').onclick=()=>session.takeOver();
 $('save-nori').onchange=e=>{saveEnabled=e.target.checked;if(saveEnabled)persist();else{try{localStorage.removeItem(STORAGE);}catch{}}};
 $('export-nori').onclick=()=>{const blob=new Blob([JSON.stringify({...session.model.toJSON(),attempts:session.attempts},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`GOODBOT-Nori-v${session.model.version}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 $('import-nori').onclick=()=>$('import-nori-file').click();$('import-nori-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2_000_000)throw new Error('Notebook is over the 2 MB limit');const model=Apprentice.fromJSON(await file.text());if(session.model.training)throw new Error('Finish the current fit before importing');session.stop('Imported a notebook. No teaching consent was imported.');session.model=model;persist();render();}catch(error){notify('Import rejected: '+error.message);}};
 $('forget-nori').onclick=()=>{if(session.model.training)return;if(!confirm('Forget Nori’s teaching examples and learned weights? Campaign progress and episode exports are not deleted.'))return;session.stop('A fresh start. Show me something useful.');session.model=new Apprentice();session.attempts=[];try{localStorage.removeItem(STORAGE);}catch{}saveEnabled=false;$('save-nori').checked=false;render();};
 let destSignature='';
 function render(){if(!session)return;const g=getGame();active=!!g.scene.learningSandbox;panel.hidden=!active;document.body.classList.toggle('mentor-mode',active);if(!active)return;
  const s=session.summary(),busy=!!g.pending||!!g.path.length,auto=['preview','running'].includes(s.mode),fitting=s.mode==='training';
  $('nori-state').textContent=s.mode==='training'?`Fitting ${Math.round((session.progress||0)*100)}%`:s.mode==='preview'?'Thinking ahead':s.mode==='running'?'Your turn, Nori':s.mode==='help'?'Needs a hand':s.mode==='teaching'?'Learning from you':s.mode==='done'?'A little independence':s.modelVersion?'Ready to try':'New arrival';
  $('nori-message').textContent=s.message;$('nori-count').textContent=s.examples;$('nori-version').textContent=s.modelVersion;
  $('teach-btn').textContent=s.mode==='teaching'?'■ Stop teaching':'① Teach';$('teach-btn').disabled=fitting||g.status!=='playing';
  $('learn-btn').disabled=!s.examples||busy||fitting||auto;$('shuffle-btn').disabled=fitting;
  $('your-turn-btn').disabled=busy||fitting||auto||g.status!=='playing';$('step-btn').disabled=$('your-turn-btn').disabled;
  $('lesson-switch-btn').disabled=fitting;$('apprentice-btn').disabled=fitting;$('import-nori').disabled=fitting;$('forget-nori').disabled=fitting;
  $('takeover-btn').hidden=!auto&&s.mode!=='help';
  $('mentor-intent').hidden=!s.prediction||!auto;
  if(s.prediction){$('intent-action').textContent=session.describe(s.prediction);const ev=session.prediction?.evidence;$('intent-evidence').textContent=ev?`Similar taught choice: ${ev.kind} ${ev.type==='none'?'':ev.type} ${ev.role==='none'?'':'→ '+ev.role}.`:'No comparable demonstration.';}
  const renderer=getRenderer();if(auto)renderer.hint=s.prediction?.id||null;else if(renderer.apprenticeTarget)renderer.hint=null;renderer.apprenticeTarget=auto?s.prediction?.id:null;
  const held=g.entity(g.robot.held);$('mentor-destinations').hidden=!held;
  const signature=JSON.stringify([g.scene.seed,g.robot.held,g.scene.zones.map(z=>g.scene.objects.filter(o=>o.location===z.id&&!o.held).length),auto,fitting]);
  if(signature!==destSignature){destSignature=signature;$('destination-options').replaceChildren();if(held)for(const z of g.scene.zones.filter(z=>z.accepts.includes(held.type))){const b=document.createElement('button');b.textContent=z.label;b.dataset.mentorDestination=z.id;b.disabled=fitting||g.scene.objects.filter(o=>o.location===z.id&&!o.held).length>=z.capacity;b.onclick=()=>g.command(z.id);$('destination-options').append(b);}}
  $('mentor-fit').textContent=s.fit?`${s.fit.parameters} learned parameters. ${s.fit.trainingMatches}/${s.fit.decisions} teaching matches. This is training agreement, not a held-out test.`:'A blank model asks for help; it does not pretend to know the routine.';
 }
 return {session,
  bindGame(game){session.attach(game);destSignature='';render();},
  pause(){if(active&&session.mode!=='training'){session.stop('Paused. Autonomy and teaching stopped; held cargo stays safe.');persist();}},
  frame(dt){session.tick(dt);cooldown+=dt;if(cooldown>.15){cooldown=0;render();}},
  onWin(){
   const automatic=session.mode==='done';session.endTeaching();session.mode=automatic?'done':'idle';
   $('mentor-result').hidden=false;$('mentor-result-title').textContent=automatic?'Nori finished this room.':'Your demonstration is complete.';
   $('mentor-result-text').textContent=automatic?'Try a fresh layout, or teach another request. This is one assisted virtual-room attempt, not general robot competence.':'Press Learn, then New layout and Your turn. Nori will have to choose again—not replay your coordinates.';
   session.message=automatic?'That felt like teamwork. Shall we try somewhere different?':'Your routine is in the notebook only if Teach was active. Fit it with Learn.';persist();render();
  },
  summary:()=>session.summary(),
 };
}
