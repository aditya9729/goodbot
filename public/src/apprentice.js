/** Small, locally trained linear softmax action ranker. No task-plan oracle, LLM,
 * pixels, imported JavaScript, or physical motor controller. All math is explicit.
 * Candidate legality is an authored guardian, independent of task success. */
const clone=x=>structuredClone(x);
export const MODEL_SCHEMA='goodbot.apprentice.v1';
export const MAX_EXAMPLES=256;
// Fitted versions retained for honest before/after comparison. A snapshot is a
// past fit, never an edited or synthesised one.
export const MAX_SNAPSHOTS=8;
const MAX_CANDIDATES=48,MAX_FEATURES=24;
const TYPES=new Set(['cup','towel','chair','book','suitcase','none']);
const CONTEXTS=new Set(['collect','tea','linen']);
const ROLES=new Set(['source','cart','desk','shelf','floor','cupboard','none']);
const safeType=x=>TYPES.has(x)?x:'none';
const safeRole=x=>ROLES.has(x)?x:'floor';
/** This is the full policy-observation boundary. No desired/plan/taskDone/score.
 * Structured object metadata is privileged game state, NOT vision understanding. */
export function observeForPolicy(game) {
 const s=game.scene,zones=s.zones.map(z=>({id:z.id,role:safeRole(z.support),accepts:z.accepts.map(safeType),capacity:z.capacity,
  occupied:s.objects.filter(o=>o.location===z.id&&!o.held).length,x:z.x,z:z.z}));
 return {context:CONTEXTS.has(s.lesson?.context)?s.lesson.context:'unknown',permission:s.permission,
  robot:{x:game.robot.x,z:game.robot.z,held:game.robot.held},cupboardOpen:!!s.cupboardOpen,
  objects:s.objects.map(o=>({id:o.id,type:safeType(o.type),movable:!!o.movable,protected:!!o.protected,owner:o.owner==='hotel'?'hotel':'guest',
   held:!!o.held,container:o.container||null,location:o.location==='source'?'source':zones.find(z=>z.id===o.location)?.role||'floor',
   x:o.x,z:o.z})), zones};
}
export function legalActions(observation) {
 const o=observation;if(o.permission!=='granted')return [];
 const held=o.objects.find(x=>x.id===o.robot.held);
 if(held)return o.zones.filter(z=>z.accepts.includes(held.type)&&z.occupied<z.capacity).map(z=>({kind:'place',id:z.id,type:held.type,role:z.role,x:z.x,z:z.z}));
 const picks=o.objects.filter(x=>x.owner==='hotel'&&x.movable&&!x.protected&&!x.held&&(!x.container||o.cupboardOpen))
  .map(x=>({kind:'pick',id:x.id,type:x.type,role:x.location,x:x.x,z:x.z}));
 if(!o.cupboardOpen)picks.push({kind:'open',id:'cupboard',type:'none',role:'cupboard',x:1.35,z:5.7});
 // Finish is always offered with empty hands. No completion predicate in the mask.
 picks.push({kind:'finish',id:'finish',type:'none',role:'none',x:o.robot.x,z:o.robot.z});
 return picks;
}
export function actionFeatures(o,a) {
 const context=CONTEXTS.has(o.context)?o.context:'unknown';
 const held=safeType(o.objects.find(x=>x.id===o.robot.held)?.type);
 const sources=Math.min(3,o.objects.filter(x=>x.owner==='hotel'&&x.movable&&!x.protected&&!x.held&&x.location==='source').length);
 return [
  `c:${context}|k:${a.kind}`,
  `c:${context}|k:${a.kind}|t:${a.type}|r:${a.role}`,
  `c:${context}|k:${a.kind}|h:${held}|r:${a.role}`,
  `c:${context}|k:${a.kind}|n:${sources}`,
  `c:${context}|k:${a.kind}|n:${sources}|h:${held}`,
  `c:${context}|k:${a.kind}|door:${o.cupboardOpen?'open':'closed'}`,
  `c:${context}|k:${a.kind}|h:${held}|door:${o.cupboardOpen?'open':'closed'}`,
 ];
}
function phase(o){return o.robot.held?'holding:'+safeType(o.objects.find(x=>x.id===o.robot.held)?.type):'empty';}
export function decisionExample(game, command, {correctionOf=null}={}) {
 const observation=observeForPolicy(game),actions=legalActions(observation),selected=actions.findIndex(a=>a.id===command);
 if(selected<0)throw new Error('This action is outside the apprentice action space');
 return {context:observation.context,phase:phase(observation),candidates:actions.map(a=>actionFeatures(observation,a)),selected,
  chosen:{kind:actions[selected].kind,type:actions[selected].type,role:actions[selected].role},
  observation,roomSeed:game.scene.seed,correctionOf,assistance:'authored_navigation_and_kinematic_grasp',
  requestedAt:game.time,completedAt:null,weight:correctionOf?2:1};
}
function groups(candidates){const found=new Map();candidates.forEach((f,i)=>{const key=f.join('\n');if(!found.has(key))found.set(key,{features:f,indices:[]});found.get(key).indices.push(i);});return [...found.values()];}
function scores(weights,gs){const raw=gs.map(g=>g.features.reduce((sum,f)=>sum+(weights[f]||0),0));const top=Math.max(...raw);const exp=raw.map(x=>Math.exp(x-top));const sum=exp.reduce((a,b)=>a+b,0);return exp.map(x=>x/sum);}
export class Apprentice {
 constructor(){this.examples=[];this.weights=Object.create(null);this.version=0;this.dirty=false;this.training=false;this.fitSummary=null;this.lastUpdate=null;this.snapshots=[];}
 add(example){if(this.training)throw new Error('Training is in progress');if(this.examples.length>=MAX_EXAMPLES)throw new Error('Teaching notebook is full. Export it before starting a new apprentice.');validateExample(example);this.examples.push(clone(example));this.dirty=true;}
 removeLast(){if(this.training)return false;const e=this.examples.pop();this.dirty=true;return !!e;}
 async train({epochs=220,onProgress=()=>{}}={}) {
  if(this.training)throw new Error('Already training');if(!this.examples.length)throw new Error('Show at least one successful decision first');
  this.training=true;const weights=Object.create(null),data=this.examples.map(e=>({groups:groups(e.candidates),chosen:e.candidates[e.selected].join('\n'),weight:e.weight||1}));
  try{
   for(let epoch=0;epoch<epochs;epoch++){
    const grad=Object.create(null);let total=0;
    for(const e of data){const p=scores(weights,e.groups);total+=e.weight;
     e.groups.forEach((g,i)=>{const d=(Number(g.features.join('\n')===e.chosen)-p[i])*e.weight;for(const f of g.features)grad[f]=(grad[f]||0)+d;});}
    for(const [f,g]of Object.entries(grad))weights[f]=(weights[f]||0)+.55*(g/total-.0015*(weights[f]||0));
    if(epoch%12===0){onProgress((epoch+1)/epochs);await new Promise(resolve=>setTimeout(resolve,0));}
   }
   this.weights=weights;this.version++;this.dirty=false;
   this.snapshots.push({version:this.version,weights:{...weights},
    coverage:[...new Set(this.examples.map(e=>e.context+'|'+e.phase))],
    examples:this.examples.length,fittedAt:new Date().toISOString()});
   if(this.snapshots.length>MAX_SNAPSHOTS)this.snapshots.shift();
   let correct=0;for(const e of this.examples){const gs=groups(e.candidates),p=scores(weights,gs),best=gs[p.indexOf(Math.max(...p))];if(best.features.join('\n')===e.candidates[e.selected].join('\n'))correct++;}
   this.fitSummary={decisions:this.examples.length,trainingMatches:correct,epochs,parameters:Object.keys(weights).length,
    note:'Agreement on teaching examples, not held-out success or calibrated confidence.'};
   this.lastUpdate=new Date().toISOString();onProgress(1);return this.fitSummary;
  }finally{this.training=false;}
 }
 predict(game){return this.rank(game,{weights:this.weights,version:this.version,dirty:this.dirty,
  covered:(context,p)=>this.examples.some(e=>e.context===context&&e.phase===p)});}
 /** Replay a retained fit exactly as it would have decided, for before/after
  * comparison. Same ranker, older weights and that version's own coverage. */
 predictAs(game,snapshot){
  if(!snapshot)throw new Error('No such fitted version');
  const seen=new Set(snapshot.coverage);
  return this.rank(game,{weights:snapshot.weights,version:snapshot.version,dirty:false,
   covered:(context,p)=>seen.has(context+'|'+p)});
 }
 rank(game,{weights,version,dirty,covered}) {
  const observation=observeForPolicy(game),actions=legalActions(observation),context=observation.context,p=phase(observation);
  const common={observation,actions,version};
  if(!actions.length)return {...common,ask:true,reason:'The built-in guardian does not permit work here.'};
  if(!version)return {...common,ask:true,reason:'I have no fitted model yet. Show me a routine, then press Learn.'};
  if(dirty)return {...common,ask:true,reason:'New examples are waiting. Press Learn before my next attempt.'};
  if(!covered(context,p))return {...common,ask:true,reason:'I have no teaching example for this request and hand state.'};
  const gs=groups(actions.map(a=>actionFeatures(observation,a))),prob=scores(weights,gs);
  const ranked=gs.map((g,i)=>({...g,preference:prob[i]})).sort((a,b)=>b.preference-a.preference);
  const gap=ranked[0].preference-(ranked[1]?.preference||0);
  if(gap<.04)return {...common,ask:true,reason:'My top choices are too similar. Please show me the next step.',gap};
  // All equivalent candidates get the same learned score. Distance resolves a tie;
  // this helper is built in, not a learned planning skill.
  const index=ranked[0].indices.slice().sort((a,b)=>{
   const d=x=>Math.hypot(actions[x].x-observation.robot.x,actions[x].z-observation.robot.z);
   return d(a)-d(b)||actions[a].id.localeCompare(actions[b].id);
  })[0],action=actions[index],features=actionFeatures(observation,action);
  const nearest=this.examples.filter(e=>e.context===context).map((e,i)=>({e,i,n:e.candidates[e.selected].filter(f=>features.includes(f)).length})).sort((a,b)=>b.n-a.n)[0];
  return {...common,ask:false,action,gap,preference:ranked[0].preference,
   evidence:nearest?{kind:nearest.e.chosen.kind,type:nearest.e.chosen.type,role:nearest.e.chosen.role,overlap:nearest.n,roomSeed:nearest.e.roomSeed}:null};
 }
 toJSON(){return {schema:MODEL_SCHEMA,model:'linear_softmax_action_ranker',version:this.version,weights:{...this.weights},examples:clone(this.examples),dirty:this.dirty,fitSummary:this.fitSummary,lastUpdate:this.lastUpdate,
  privacy:{virtual_state_only:true,webcam:false,raw_hands:false,uploads:false},limits:'Structured-state decision policy over assisted skills. Not vision or motor learning.'};}
 static fromJSON(input){
  if(typeof input==='string'){if(input.length>2_000_000)throw new Error('Apprentice file is too large');input=JSON.parse(input);}
  if(!input||input.schema!==MODEL_SCHEMA||input.model!=='linear_softmax_action_ranker')throw new Error('Not a compatible apprentice file');
  if(!Array.isArray(input.examples)||input.examples.length>MAX_EXAMPLES)throw new Error('Invalid example count');
  for(const e of input.examples)validateExample(e);
  if(!input.weights||typeof input.weights!=='object'||Array.isArray(input.weights)||Object.keys(input.weights).length>6000)throw new Error('Invalid weights');
  const allowed=new Set(input.examples.flatMap(e=>e.candidates.flat()));
  for(const [k,v]of Object.entries(input.weights))if(!allowed.has(k)||!Number.isFinite(v)||Math.abs(v)>100)throw new Error('Invalid learned parameter');
  if(!Number.isInteger(input.version)||input.version<0||input.version>100000)throw new Error('Invalid model version');
  const a=new Apprentice();a.examples=clone(input.examples);a.weights=Object.assign(Object.create(null),input.weights);a.version=input.version;a.dirty=!!input.dirty;
  a.fitSummary=null;a.lastUpdate=typeof input.lastUpdate==='string'?input.lastUpdate.slice(0,40):null;return a;
 }
}
function validateExample(e){
 if(!e||!CONTEXTS.has(e.context)||!['empty','holding:cup','holding:towel'].includes(e.phase))throw new Error('Invalid teaching context');
 if(!Array.isArray(e.candidates)||!e.candidates.length||e.candidates.length>MAX_CANDIDATES||!Number.isInteger(e.selected)||e.selected<0||e.selected>=e.candidates.length)throw new Error('Invalid teaching alternatives');
 for(const fs of e.candidates){if(!Array.isArray(fs)||!fs.length||fs.length>MAX_FEATURES)throw new Error('Invalid feature vector');for(const f of fs)if(typeof f!=='string'||f.length>180||!/^c:(collect|tea|linen)\|k:(pick|place|open|finish)(\|[a-z]+:[a-z0-9]+)*$/.test(f))throw new Error('Invalid feature name');}
 if(e.weight!==1&&e.weight!==2)throw new Error('Invalid example weight');
 if(typeof e.roomSeed!=='string'||e.roomSeed.length>64)throw new Error('Invalid room provenance');
 if(!e.chosen||!['pick','place','open','finish'].includes(e.chosen.kind)||!TYPES.has(e.chosen.type)||!ROLES.has(e.chosen.role))throw new Error('Invalid chosen action');
 validateObservation(e.observation);
 const keys=['context','phase','candidates','selected','chosen','observation','roomSeed','correctionOf','assistance','requestedAt','completedAt','weight'];
 if(Object.keys(e).some(k=>!keys.includes(k)))throw new Error('Unknown teaching data field');
 if(e.observation.context!==e.context||phase(e.observation)!==e.phase)throw new Error('Observation context mismatch');
 const actions=legalActions(e.observation),derived=actions.map(a=>actionFeatures(e.observation,a));
 if(JSON.stringify(derived)!==JSON.stringify(e.candidates))throw new Error('Features do not match the recorded observation');
 const chosen=actions[e.selected];if(!chosen||chosen.kind!==e.chosen.kind||chosen.type!==e.chosen.type||chosen.role!==e.chosen.role)throw new Error('Chosen action mismatch');
 if(e.assistance!=='authored_navigation_and_kinematic_grasp'||(e.correctionOf!==null&&(typeof e.correctionOf!=='string'||!/^attempt-[0-9]+:v[0-9]+$/.test(e.correctionOf)||e.correctionOf.length>60)))throw new Error('Invalid provenance');
 // Imported snapshots are never executed; bounded whitelisted virtual state only.
 if(JSON.stringify(e).length>60000)throw new Error('Teaching example too large');
 if(!Number.isFinite(e.requestedAt)||e.requestedAt<0||!Number.isFinite(e.completedAt)||e.completedAt<e.requestedAt)throw new Error('Incomplete teaching action');
}

function validateObservation(o){
 const own=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
 const id=x=>typeof x==='string'&&/^[a-z0-9_-]{1,64}$/.test(x);
 const pos=x=>Number.isFinite(x.x)&&Number.isFinite(x.z)&&Math.abs(x.x)<=100&&Math.abs(x.z)<=100;
 if(!own(o,['context','permission','robot','cupboardOpen','objects','zones'])||!CONTEXTS.has(o.context)||!['granted','denied'].includes(o.permission)||typeof o.cupboardOpen!=='boolean')throw new Error('Invalid policy observation');
 if(!own(o.robot,['x','z','held'])||!pos(o.robot)||(o.robot.held!==null&&!id(o.robot.held)))throw new Error('Invalid virtual robot');
 if(!Array.isArray(o.objects)||o.objects.length>20||!Array.isArray(o.zones)||o.zones.length>12)throw new Error('Invalid virtual scene size');
 for(const x of o.objects)if(!own(x,['id','type','movable','protected','owner','held','container','location','x','z'])||!id(x.id)||!TYPES.has(x.type)||!ROLES.has(x.location)||!pos(x)||!['hotel','guest'].includes(x.owner)||[x.movable,x.protected,x.held].some(v=>typeof v!=='boolean')||(x.container!==null&&!id(x.container)))throw new Error('Invalid virtual object');
 for(const z of o.zones)if(!own(z,['id','role','accepts','capacity','occupied','x','z'])||!id(z.id)||!ROLES.has(z.role)||!pos(z)||!Array.isArray(z.accepts)||z.accepts.length>6||z.accepts.some(t=>!TYPES.has(t))||!Number.isInteger(z.capacity)||z.capacity<1||z.capacity>20||!Number.isInteger(z.occupied)||z.occupied<0||z.occupied>20)throw new Error('Invalid virtual destination');
 if(new Set(o.objects.map(x=>x.id)).size!==o.objects.length||new Set(o.zones.map(x=>x.id)).size!==o.zones.length)throw new Error('Duplicate scene identity');
}
