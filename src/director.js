// Four deterministic "director roles", not four LLMs. No API is called here.
import { clone, fullyInside, overlap, text } from './math.js';
import { findPath, visibleReach } from './navigation.js';
export function readScene(scene){
 const tasks=[];
 if(scene.permission!=='granted')return [{id:'defer-room',kind:'defer',label:'Respect the sign. Defer this room.',entity:'door-sign',required:true}];
 if(!scene.rescueTaken)tasks.push({id:'takeover',kind:'takeover',entity:'practice-bot',label:'Take over from the practice bot',required:true});
 for(const o of scene.objects){
  if(o.flagRequired)tasks.push({id:'flag-'+o.id,kind:'flag',entity:o.id,label:'Flag the forgotten keepsake',required:true});
  if(o.movable&&o.desired){
   if(o.container==='cupboard'&&!scene.cupboardOpen&&!tasks.some(t=>t.id==='open-cupboard'))tasks.push({id:'open-cupboard',kind:'open',entity:'cupboard',label:'Open the linen cupboard',required:true});
   const zone=scene.zones.find(z=>z.id===o.desired);
   tasks.push({id:'place-'+o.id,kind:'place',entity:o.id,destination:o.desired,label:o.type==='chair'?'Park the chair outside the route':`${o.label} → ${zone.label}`,required:true});
  }
 }
 return tasks;
}
export function guardTask(scene,t){
 if(!t||typeof t!=='object')return 'Malformed task';
 const legal=readScene(scene).find(x=>x.id===t.id);
 if(!legal||JSON.stringify(legal)!==JSON.stringify(t))return 'Not a scene-authorized task';
 if(t.kind==='place'){
  const o=scene.objects.find(o=>o.id===t.entity),z=scene.zones.find(z=>z.id===t.destination);
  if(!o||o.protected||o.owner!=='hotel'||!o.movable)return 'Protected or unauthorized object';
  if(!z||!z.accepts.includes(o.type))return 'Invalid destination';
 }
 return null;
}
export function compilePlan(scene,proposal=null){
 const legal=readScene(scene);let tasks=clone(legal),title=scene.level.name,brief=scene.level.story,source='Local scene director';
 if(proposal){
  if(!Array.isArray(proposal.taskIds)||proposal.taskIds.length!==legal.length||new Set(proposal.taskIds).size!==legal.length)throw new Error('Task coverage or duplicate failure');
  if(proposal.taskIds.some(id=>typeof id!=='string'||!legal.some(t=>t.id===id)))throw new Error('Unknown task ID');
  tasks=proposal.taskIds.map(id=>clone(legal.find(t=>t.id===id)));
  if(typeof proposal.title!=='string'||!proposal.title.trim()||proposal.title.length>70||typeof proposal.brief!=='string'||proposal.brief.length>240)throw new Error('Invalid story text');
  title=text(proposal.title,70);brief=text(proposal.brief,240);source='AI proposal · locally checked';
 }
 for(const t of tasks){const e=guardTask(scene,t);if(e)throw new Error(e);}
 // Dependencies are compiler-owned, not a language model's decision.
 const rank=t=>t.kind==='takeover'?0:t.kind==='open'?1:t.entity==='chair'?2:3;
 tasks.sort((a,b)=>rank(a)-rank(b));
 const proof=checkFeasibility(scene,tasks);
 if(!proof.ok)throw new Error('Plan has no supported route: '+proof.reason);
 return {title,brief,source,tasks,trace:[
  {role:'SCOUT',message:`Read ${scene.objects.length} objects, ${scene.zones.length} destinations and room permission.`},
  {role:'STEWARD',message:scene.permission==='granted'?'Guest belongings protected. Only authorized objects selected.':'Entry denied. A respectful deferral is the only legal task.'},
  {role:'PLANNER',message:`Compiled ${tasks.length} scene-grounded steps with cupboard / takeover prerequisites.`},
  {role:'CHECKER',message:`Verified ${proof.routes} navigation legs, destination capacities and task coverage in the simplified model.`}
 ],proof};
}
export function checkFeasibility(scene,tasks){
 const sim=clone(scene);let p={...sim.start},routes=0;
 for(const t of tasks){
  if(t.kind==='defer'||t.kind==='flag'||t.kind==='takeover')continue;
  const target=t.kind==='open'?sim.furniture.find(f=>f.id==='cupboard'):sim.objects.find(o=>o.id===t.entity);
  if(!target)return {ok:false,reason:'Missing entity',routes};
  if(t.kind==='place'&&target.container&&!sim.cupboardOpen)return {ok:false,reason:'Closed cupboard',routes};
  let dest=target;if(t.kind==='place'&&target.container)dest={...target,support:target.container};
  if(t.kind==='place'&&!target.container&&target.y>.5)dest={...target,support:target.type==='cup'?(target.x<2?'nightstand':'desk'):null};
  let path=findPath(sim,p,dest,{approach:true});
  if(path===null)return {ok:false,reason:t.id+' source unreachable',routes};
  if(path.length)p=path.at(-1);routes++;
  if(t.kind==='open'){sim.cupboardOpen=true;continue;}
  target.held=true;
  const z=sim.zones.find(z=>z.id===t.destination);
  const count=sim.objects.filter(o=>o.location===z.id&&!o.held).length;
  if(count>=z.capacity)return {ok:false,reason:'Destination full',routes};
  path=findPath(sim,p,z,{approach:true});if(path===null)return {ok:false,reason:t.id+' destination unreachable',routes};
  if(path.length)p=path.at(-1);routes++;
  target.held=false;target.x=z.x;target.z=z.z;target.y=z.y;target.location=z.id;delete target.container;
 }
 return {ok:true,routes,reason:null};
}
export function taskDone(scene,t){
 if(t.kind==='defer')return scene.deferred;
 if(t.kind==='open')return scene.cupboardOpen;
 if(t.kind==='takeover')return scene.rescueTaken;
 const o=scene.objects.find(o=>o.id===t.entity);if(!o)return false;
 if(t.kind==='flag')return o.flagged;
 const z=scene.zones.find(z=>z.id===t.destination);
 return !!z&&!o.held&&!o.container&&o.location===z.id&&fullyInside(o,z)&&Math.abs(o.y-z.y)<.025&&o.settled>=.45&&(!o.blocks||!overlap(o,scene.route));
}
export function protectedIntact(scene){return scene.initialProtected.every(p=>{const o=scene.objects.find(o=>o.id===p.id);return o&&!o.held&&o.x===p.x&&o.z===p.z&&o.y===p.y;});}
