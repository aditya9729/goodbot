// Local-only virtual episode recording. No raw camera, hand landmarks or keys.
import { INSTANCE_IDS, INSTANCE_LABELS } from './identities.js';
import { zipFiles } from './zip.js';
export const RECORDING_LIMITS=Object.freeze({frames:120,bytes:96*1024*1024,activeSeconds:60,events:12000,fps:2,width:480});
export function cameraCalibration({eye,R,U,F,fov,width,height,view,backend,sourceWidth=width,sourceHeight=height}){
 const focal=height*.5/Math.tan(fov*Math.PI/360),sourceFocal=sourceHeight*.5/Math.tan(fov*Math.PI/360);
 return {model:'ideal_pinhole',view,observation_scope:view==='robot'?'virtual_robot_head':'privileged_player_camera',width,height,pixel_convention:'origin at top-left pixel edge; centers at (x+0.5,y+0.5)',
 K_row_major:[focal,0,width/2,0,focal,height/2,0,0,1],source_raster:{width:sourceWidth,height:sourceHeight,K_row_major:[sourceFocal,0,sourceWidth/2,0,sourceFocal,sourceHeight/2,0,0,1]},resampling:'nearest-neighbor; source pixel sx=floor((x+0.5)*source_width/width), sy=floor((y+0.5)*source_height/height); use source pixel centers and source K for exact raster rays',distortion:[0,0,0,0,0],
 T_world_camera_optical_row_major:[R[0],-U[0],F[0],eye[0],R[1],-U[1],F[1],eye[1],R[2],-U[2],F[2],eye[2],0,0,0,1],
 world_axes:'right-handed; x right, y up, z forward in authored scene',optical_axes:'x right, y down, z forward',backend};
}
export function renderedPose(game,o){const b=game.robot,held=o.held;return {position_m:held?[b.x+Math.sin(b.yaw)*.49,1.01,b.z+Math.cos(b.yaw)*.49]:[o.x,o.y,o.z],quaternion_xyzw:held?[0,Math.sin(b.yaw/2),0,Math.cos(b.yaw/2)]:[0,0,0,1]};}
export function semanticContacts(game){
 // These are task-state relations, NOT narrow-phase contacts or force estimates.
 return game.scene.objects.filter(o=>o.held||o.location!=='source'||o.y>0||o.type==='chair'||o.type==='suitcase').map(o=>{
  let other=o.held?'robot':o.container||game.scene.zones.find(z=>z.id===o.location)?.support;
  if(!other){if(o.y===0)other='architecture';else other=o.x<2?'nightstand':'desk';}
  return {id:`${o.id}:${other}`,object_a:o.id,object_b:other,kind:o.held?'assisted_grasp_relation':'authored_support_relation',source:'task_state_not_collision_solver',normal_force_N:null,impulse_Ns:null,contact_point_world_m:null,contact_normal_world:null,tactile:null};
 });
}
export function virtualState(game){
 return {scene_id:game.scene.id,seed:game.scene.seed,status:game.status,permission:game.scene.permission,assistance:game.assistance,
 robot:{base_position_m:[game.robot.x,0,game.robot.z],base_quaternion_xyzw:[0,Math.sin(game.robot.yaw/2),0,Math.cos(game.robot.yaw/2)],held_object:game.robot.held,reach_target_world_m:game.robot.reachTarget?[game.robot.reachTarget.x,game.robot.reachTarget.y,game.robot.reachTarget.z]:null,joint_positions_rad:null,joint_torques_Nm:null,arm_animation:game.robot.arm},
 objects:game.scene.objects.map(o=>({id:o.id,instance_id:INSTANCE_IDS[o.id],type:o.type,owner:o.owner,protected:!!o.protected,location:o.location,held:o.held,task_anchor_m:[o.x,o.y,o.z],rendered_pose:renderedPose(game,o)})),
 relations:semanticContacts(game),tactile:{available:false,reason:'Hotel grasps are assisted kinematics; no tactile sensor or contact-force solver.'}};
}
function littleEndian(array,type){const bytes=new Uint8Array(array.length*(type==='f32'?4:2)),v=new DataView(bytes.buffer);for(let i=0;i<array.length;i++){if(type==='f32')v.setFloat32(i*4,array[i],true);else v.setUint16(i*2,array[i],true);}return bytes;}
export class EpisodeRecorder {
 constructor({now=()=>performance.now(),limits=RECORDING_LIMITS}={}){this.now=now;this.limits={...RECORDING_LIMITS,...limits};this.discard();}
 discard(){this.token=(this.token||0)+1;this.active=false;this.busy=false;this.frames=[];this.files=[];this.actions=[];this.executions=[];this.historyCursor=0;this.transitions=[];this.lastRelations=new Map();this.bytes=0;this.skipped=0;this.stopReason=null;this.manifest=null;this.failure=null;}
 start(game,consent){if(consent!==true)throw new Error('Explicit local recording consent is required');if(this.frames.length||this.active||this.busy)throw new Error('Export or discard the current recording first');this.discard();this.active=true;this.wallStart=this.now();this.simStart=game.time;this.historyCursor=game.history.length;this.lastTime=-Infinity;this.lastRelations=new Map(semanticContacts(game).map(c=>[c.id,c]));
  this.manifest={schema:'goodbot.virtual_episode.v1',game_version:'0.4.0',created_at_utc:new Date().toISOString(),simulation_units:'1 authored scene unit is treated as 1 metre; not a calibrated physical hotel',source:'synthetic_game',physics:'assisted_kinematics_no_contact_solver',privacy:{local_only:true,webcam_frames:false,hand_landmarks:false,microphone:false,automatic_upload:false},requested_fps:this.limits.fps,instance_labels:INSTANCE_LABELS,initial_state:virtualState(game),authored_scene:structuredClone(game.scene),
 limitations:['Privileged state is not a policy observation.','Hotel relations are symbolic, not detected physical contacts.','Null forces/tactile/joints mean unavailable, not measured zero.','Images and object poses follow the visual model, not a calibrated robot.','RGB is a rendered game camera, not the webcam.'],streams:{rgb:'rgb/*.png, RGBA8 display-referred sRGB, no interface overlay',depth:'depth/*.f32, little-endian float32 axial optical z in simulated metres; NaN=no hit',instances:'instances/*.u16, little-endian uint16, 0=no hit',samples:'samples.jsonl: aligned state, camera, paths and timestamps',actions:'actions.jsonl: normalized requests, outcomes and assistance; no raw hands',executions:'executions.jsonl: completed assisted game actions, not motor commands',relations:'relations.jsonl: task-state relation transitions, not physics events'}};
 }
 stop(reason='user',game=null){if(this.active){this.active=false;this.stopReason=reason;if(game&&this.manifest)this.manifest.final_state=virtualState(game);}}
 logAction(kind,args,result,game,modality='interface'){if(!this.active)return;if(this.actions.length>=this.limits.events){this.stop('event_limit');return;}this.actions.push({simulation_time_s:game.time,wall_elapsed_s:(this.now()-this.wallStart)/1000,kind,args:structuredClone(args),accepted:typeof result==='boolean'?result:null,modality,assistance:game.assistance});}
 observe(game){if(!this.active)return;
  while(this.historyCursor<game.history.length){if(this.executions.length>=this.limits.events){this.stop('event_limit');return;}this.executions.push({...game.history[this.historyCursor++],source:'assisted_game_action',observed_simulation_time_s:game.time,wall_elapsed_s:(this.now()-this.wallStart)/1000});}
  const next=new Map(semanticContacts(game).map(c=>[c.id,c]));for(const [id,c]of next){const old=this.lastRelations.get(id);if(!old||old.kind!==c.kind)this.transitions.push({...c,phase:'begin',simulation_time_s:game.time});}for(const [id,c]of this.lastRelations)if(!next.has(id)||next.get(id).kind!==c.kind)this.transitions.push({...c,phase:'end',simulation_time_s:game.time});this.lastRelations=next;
  if(game.time-this.simStart>=this.limits.activeSeconds)this.stop('duration_limit');if(this.transitions.length>this.limits.events)this.stop('event_limit');
 }
 async sample(game,renderer){if(!this.active||game.time-this.lastTime<1/this.limits.fps)return;if(this.busy){this.skipped++;return;}if(this.frames.length>=this.limits.frames){this.stop('frame_limit');return;}
  this.busy=true;this.lastTime=game.time;const token=this.token;
  try{const state=virtualState(game),time=game.time,wall=(this.now()-this.wallStart)/1000,raw=renderer.capture(game,this.limits.width);
   if(!raw||!raw.rgba||!raw.depth||!raw.labels)throw new Error('This renderer does not support aligned recording');
   const cam=cameraCalibration({...renderer,width:raw.width,height:raw.height,sourceWidth:raw.sourceWidth,sourceHeight:raw.sourceHeight,view:renderer.mode});
   const canvas=document.createElement('canvas');canvas.width=raw.width;canvas.height=raw.height;canvas.getContext('2d').putImageData(new ImageData(raw.rgba,raw.width,raw.height),0,0);
   const png=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encoding failed')),'image/png'));
   if(token!==this.token)return;
   const n=String(this.frames.length).padStart(6,'0'),d=littleEndian(raw.depth,'f32'),labels=littleEndian(raw.labels,'u16'),size=png.size+d.length+labels.length;
   if(this.bytes+size>this.limits.bytes){this.stop('memory_limit');return;}
   this.bytes+=size;this.files.push({name:`rgb/${n}.png`,data:png},{name:`depth/${n}.f32`,data:d},{name:`instances/${n}.u16`,data:labels});
   this.frames.push({frame_id:this.frames.length,simulation_time_s:time,wall_elapsed_s:wall,camera:cam,depth_quantization_m:raw.depthQuantizationM||0,files:{rgb:`rgb/${n}.png`,depth:`depth/${n}.f32`,instances:`instances/${n}.u16`},state});
  }catch(error){this.failure=String(error.message||error);this.stop('capture_error');}finally{if(token===this.token)this.busy=false;}
 }
 async export(){if(this.active||this.busy)throw new Error('Stop recording and wait for the current frame before exporting');if(!this.manifest||!this.frames.length)throw new Error('No recorded frames');
  const manifest={...this.manifest,frame_count:this.frames.length,action_count:this.actions.length,execution_count:this.executions.length,stop_reason:this.stopReason,skipped_due_to_encoding:this.skipped,capture_error:this.failure};
  return zipFiles([{name:'manifest.json',data:JSON.stringify(manifest,null,2)},{name:'samples.jsonl',data:this.frames.map(v=>JSON.stringify(v)).join('\n')+'\n'},{name:'actions.jsonl',data:this.actions.map(v=>JSON.stringify(v)).join('\n')+'\n'},{name:'executions.jsonl',data:this.executions.map(v=>JSON.stringify(v)).join('\n')+'\n'},{name:'relations.jsonl',data:this.transitions.map(v=>JSON.stringify(v)).join('\n')+'\n'},...this.files]);
 }
 summary(){return {active:this.active,busy:this.busy,frames:this.frames.length,bytes:this.bytes,actions:this.actions.length,stopReason:this.stopReason,failure:this.failure};}
}
export function instrumentGame(game,recorder){for(const method of ['command','travel','direct','directRobot','undo','finish']){const original=game[method].bind(game);game[method]=(...args)=>{const result=original(...args);recorder.logAction(method,args,result,game,game.actionActor||((method==='direct'||method==='directRobot')?'keyboard':'pointer_or_task_or_hand_pointer'));return result;};}return game;}
