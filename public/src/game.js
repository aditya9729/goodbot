import { dist, clamp, clone, wrapAngle, turnToward } from './math.js';
import { createScene } from './scene.js';
import { compilePlan, taskDone, protectedIntact } from './director.js';
import { findPath, walkable, visibleReach } from './navigation.js';
export class Game {
 constructor(scene=createScene()){this.reset(scene);}
 reset(scene){this.scene=clone(scene);this.plan=compilePlan(this.scene);this.robot={...scene.start,yaw:scene.start.yaw??Math.PI,held:null,arm:0,reachTarget:null};this.path=[];this.pending=null;this.status='playing';this.time=0;this.steps=0;this.deliveries=0;this.events=[];this.history=[];this.lastMessage='Click an object, then its glowing destination.';this.completed=new Set();this.assistance='Auto-route + reach-and-place assistance';this.dwell=0;this.lastSnapshot=null;}
 emit(type,message,extra={}){this.events.push({type,message,...extra});this.lastMessage=message;}
 entity(id){return this.scene.objects.find(o=>o.id===id)||this.scene.zones.find(o=>o.id===id)||this.scene.furniture.find(o=>o.id===id);}
 targetFor(o){if(o.container)return {...o,support:o.container};if(o.location!=='source'){const z=this.scene.zones.find(z=>z.id===o.location);if(z)return {...o,support:z.support};}if(o.y>.5&&!o.support&&this.scene.objects.includes(o))return {...o,support:o.x<2?'nightstand':'desk'};return o;}
 snapshot(){return {scene:clone(this.scene),robot:clone(this.robot),deliveries:this.deliveries,completed:[...this.completed]};}
 saveUndo(){this.lastSnapshot=this.snapshot();}
 undo(){if(!this.lastSnapshot||this.status!=='playing')return false;const s=this.lastSnapshot;this.scene=s.scene;this.robot=s.robot;this.deliveries=s.deliveries;this.completed=new Set(s.completed);this.path=[];this.pending=null;this.lastSnapshot=null;this.emit('undo','Rewound one action. A little room to try again.');return true;}
 cancel(){this.path=[];this.pending=null;this.robot.reachTarget=null;this.robot.arm=0;}
 command(id){
 if(this.status!=='playing')return false;
 if(id==='defer-room'){
  if(this.scene.permission!=='denied')return false;this.saveUndo();this.scene.deferred=true;this.emit('good','Room deferred. Quiet is a kind of care.');return true;
 }
 if(this.scene.permission!=='granted'){this.emit('notice','Do Not Disturb. Select “Defer room” — no entry is authorized.');return false;}
 if(id==='takeover'){this.saveUndo();this.scene.rescueTaken=true;this.emit('good','Your turn! Park the blocking chair, then collect the cups.');return true;}
 if(!this.scene.rescueTaken){this.emit('notice','The practice bot is stuck. Press Take over first.');return false;}
 const o=this.entity(id);if(!o)return false;
 let kind;
 if(this.scene.objects.includes(o)){
  if(o.protected){if(o.flagRequired&&!o.flagged){kind='flag';}else{this.emit('notice','Guest belonging — leave it exactly where it is.');return false;}}
  else if(this.robot.held){this.emit('notice','Hands full. Choose the glowing destination before collecting another item.');return false;}
  else if(o.container&&!this.scene.cupboardOpen){this.emit('notice','Those towels are inside. Open the linen cupboard first.');return false;}
  else if(o.held||!o.movable)return false;
  else kind='pick';
 }else if(this.scene.zones.includes(o)){
  if(!this.robot.held){this.emit('notice',o.label+' — pick up a matching object first.');return false;}
  const held=this.entity(this.robot.held);
  if(!o.accepts.includes(held.type)||(!this.scene.learningSandbox&&held.desired!==o.id)){this.emit('notice','That is not the requested destination. Look for the gold ring.');return false;}
  if(this.scene.objects.filter(x=>x.location===o.id&&!x.held).length>=o.capacity){this.emit('notice','That destination is full.');return false;}kind='place';
 }else if(id==='cupboard'){if(this.robot.held){this.emit('notice','Place your object before opening the cupboard.');return false;}kind='open';}
 else{this.emit('notice','Room furniture. Click an outlined task object instead.');return false;}
 const target=this.targetFor(o),path=findPath(this.scene,this.robot,target,{approach:true});
 if(path===null){this.emit('notice','No safe approach. Try moving the blocking chair first.');return false;}
 this.path=path;this.pending={kind,id,actor:this.actionActor||'human'};this.dwell=0;this.robot.reachTarget={x:o.x,z:o.z,y:o.y||1.2};this.emit('move',kind==='place'?'Careful now. Heading to '+o.label+'.':'On my way to '+o.label+'.');return true;
 }
 travel(p){if(this.status!=='playing'||this.scene.permission!=='granted'||!this.scene.rescueTaken)return false;const path=findPath(this.scene,this.robot,p);if(path===null){this.emit('notice','That spot is blocked. Choose an open patch of floor.');return false;}this.cancel();this.path=path;return true;}
 direct(dx,dz,dt){dt=clamp(dt,0,.05);if(this.status!=='playing'||!this.scene.rescueTaken||this.scene.permission!=='granted')return;this.cancel();const mag=Math.hypot(dx,dz)||1;const p={x:this.robot.x+dx/mag*2.7*dt,z:this.robot.z+dz/mag*2.7*dt};if(walkable(this.scene,p)){this.steps+=dist(this.robot,p);Object.assign(this.robot,p);this.robot.yaw=turnToward(this.robot.yaw,Math.atan2(dx,dz),2.4*dt);}}
 /** Robot camera: W/S drive, A/D turn, Q/E strafe. Looking never steers. */
 directRobot(forward, turn, strafe, dt) {
  if (![forward, turn, strafe, dt].every(Number.isFinite)) return false;
  dt = clamp(dt, 0, .05);
  if (dt === 0 || this.status !== 'playing' || !this.scene.rescueTaken || this.scene.permission !== 'granted') return false;
  this.cancel();
  // +yaw faces screen-left in this coordinate system. +turn means right.
  if (turn) this.robot.yaw = wrapAngle(this.robot.yaw - clamp(turn, -1, 1) * 1.8 * dt);
  forward = clamp(forward, -1, 1); strafe = clamp(strafe, -1, 1);
  const magnitude = Math.max(1, Math.hypot(forward, strafe));
  const a = this.robot.yaw, distance = 2.7 * dt / magnitude;
  const p = {
   x: this.robot.x + (Math.sin(a) * forward - Math.cos(a) * strafe) * distance,
   z: this.robot.z + (Math.cos(a) * forward + Math.sin(a) * strafe) * distance,
  };
  // Translation still uses the existing navigation collision and permission checks.
  if ((forward || strafe) && walkable(this.scene, p)) {
   this.steps += dist(this.robot, p); Object.assign(this.robot, p);
  }
  return true;
 }
 finish(){
  if(this.status!=='playing')return false;
  if(!protectedIntact(this.scene)){this.emit('notice','A protected item was moved. Reset the room.');return false;}
  if(!this.plan.tasks.every(t=>taskDone(this.scene,t))||this.robot.held){this.emit('notice','A little more care: finish the remaining jobs before checking out.');return false;}
  this.status='won';this.cancel();this.emit('win',this.scene.level.badge);return true;
 }
 apply(){const a=this.pending;if(!a)return;const o=this.entity(a.id);if(!o){this.cancel();return;}
  if(!visibleReach(this.scene,this.robot,this.targetFor(o))){this.emit('notice','Just outside reach. Choose a closer approach.');this.cancel();return;}
  this.saveUndo();
  if(a.kind==='pick'){this.robot.held=o.id;o.held=true;o.settled=0;this.emit('pick',this.scene.learningSandbox?'Got it. Choose a compatible destination.':'Got it! Now choose '+this.entity(o.desired).label+'.');}
  if(a.kind==='place'){
   const held=this.entity(this.robot.held);if(!held){this.cancel();return;}
   const n=this.scene.objects.filter(x=>x.location===o.id&&!x.held).length;
   held.x=o.x+(n%2===0?-.18:.18);held.z=o.z+(n>1?.18:0);held.y=o.y;held.location=o.id;held.held=false;held.settled=0;delete held.container;
   if(held.type==='chair'){held.x=o.x;held.z=o.z;}this.robot.held=null;this.deliveries++;this.emit('place',this.scene.learningSandbox?'Placed '+held.label+' on '+o.label+'.':'A lovely landing. '+held.label+' is where it belongs.',{x:held.x,z:held.z});
  }
  if(a.kind==='open'){this.scene.cupboardOpen=true;this.emit('open','Fresh towels, ready for a new story.');}
  if(a.kind==='flag'){o.flagged=true;this.emit('good','Flagged for staff. The keepsake stays safe right here.');}
  this.history.push({kind:a.kind,entity:a.id,time:Math.round(this.time*100)/100,assisted:true,actor:a.actor||'human'});
  this.pending=null;this.robot.reachTarget=null;this.dwell=0;
 }
 update(dt){
  dt=clamp(dt,0,.05);if(this.status!=='playing')return;this.time+=dt;
  if(!this.scene.rescueTaken){
   // Deliberately poor, explicitly scripted straight-line skill: approach, stop,
   // back off. No policy learning and no obstacle teleportation.
   const cycle=this.time%3,advance=cycle<1.1?Math.min(.3,cycle*.3):cycle<2?.3:Math.max(0,.3-(cycle-2)*.3);
   const target={x:this.scene.start.x+advance,z:this.scene.start.z};
   if(walkable(this.scene,target))Object.assign(this.robot,target);
   this.robot.yaw=Math.PI/2;return;
  }

  if(this.path.length){const next=this.path[0],d=dist(this.robot,next),move=2.8*dt;
   if(d>1e-8)this.robot.yaw=turnToward(this.robot.yaw,Math.atan2(next.x-this.robot.x,next.z-this.robot.z),2.4*dt);
   if(d<=move){this.steps+=d;this.robot.x=next.x;this.robot.z=next.z;this.path.shift();}
   else{const p={x:this.robot.x+(next.x-this.robot.x)/d*move,z:this.robot.z+(next.z-this.robot.z)/d*move};
    if(walkable(this.scene,p)){this.steps+=move;Object.assign(this.robot,p);}else this.cancel();}
  }else if(this.pending){
   const target=this.robot.reachTarget;
   if(target&&dist(this.robot,target)>1e-8)this.robot.yaw=turnToward(this.robot.yaw,Math.atan2(target.x-this.robot.x,target.z-this.robot.z),2.4*dt);
   this.dwell+=dt;this.robot.arm=Math.min(1,this.dwell/.3);if(this.dwell>.48)this.apply();}
  else this.robot.arm=Math.max(0,this.robot.arm-dt*3);
  if(this.robot.held){const o=this.entity(this.robot.held);o.x=this.robot.x;o.z=this.robot.z;o.y=1.1;o.settled=0;}
  for(const o of this.scene.objects)if(!o.held)o.settled+=dt;
  for(const t of this.plan.tasks){const done=taskDone(this.scene,t);if(done&&!this.completed.has(t.id)){this.completed.add(t.id);this.emit('task','✓ '+t.label);}else if(!done)this.completed.delete(t.id);}
 }
 nextHint(){const t=this.plan.tasks.find(t=>!taskDone(this.scene,t));if(!t)return {id:null,message:'Everything is ready. Press Finish room.'};const id=t.kind==='place'?(this.robot.held?t.destination:t.entity):t.kind==='defer'?'defer-room':t.kind==='takeover'?'takeover':t.entity;return {id,message:t.label};}
}
