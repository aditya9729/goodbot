import { GPUCore } from './gpu.js';
// Perspective hotel renderer. CPU/WASM, not a fake screenshot or a WebGL fallback.
// Static architectural light/shadows are cached. Dynamic game meshes share its
// depth buffer. No third-party textures, CDN library or image generation is used.
import { WASM } from './raster-data.js';
import { buildRoom, dynamicRoom } from './hotel3d.js';
import { MeshBuilder, sub, add, scale, dot, cross, normalize } from './geometry.js';
import { Renderer as FlatRenderer } from './render-flat.js';
export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.w=0;this.h=0;this.hotspots=[];this.hover=null;this.hint=null;this.particles=[];this.reduced=false;this.paint=null;
  this.gpu=null;this.gpuUnavailable=null;try{this.gpu=new GPUCore();}catch(e){this.gpuUnavailable=String(e.message||e);}
  this.viewSettings=new Map();this.shadowDirty=true;this.staticUploadDirty=true;this.renderFrames=0;this.cameraMotionUntil=0;this.lastMotionPose=null;this.mode='room';this.yaw=0;this.pitch=0;this.fov=64;this.time=0;this.lastDraw=-Infinity;this.dirty=true;this.scene=null;this.dragging=false;this.lastPointer=null;this.backend=this.gpu?'Studio 3D · WebGL2':'Studio 3D · CPU/WASM';this.lastRenderMs=0;this.image=null;
  try{const bytes=Uint8Array.from(atob(WASM),c=>c.charCodeAt(0));this.engine=new WebAssembly.Instance(new WebAssembly.Module(bytes)).exports;this.vertices=new Float32Array(this.engine.memory.buffer,this.engine.vertices(),this.engine.maxVertices()*9);this.materials=new Float32Array(this.engine.memory.buffer,this.engine.materials(),512);this.config=new Float32Array(this.engine.memory.buffer,this.engine.config(),32);}
  catch(error){console.warn('3D renderer unavailable; explicit 2D compatibility mode.',error);const fallback=new FlatRenderer(canvas);fallback.backend='2D compatibility · 3D unavailable';document.getElementById('renderer-notice')?.removeAttribute('hidden');return fallback;}
  this.surface=document.createElement('canvas');this.surfaceCtx=this.surface.getContext('2d',{alpha:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(e.button!==2)return;this.dragging=true;this.lastPointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;const [x,y]=this.lastPointer;if(this.mode==='robot'){
   this.yaw=Math.max(-1.35,Math.min(1.35,this.yaw-(e.clientX-x)*.005));
   this.pitch=Math.max(-.48,Math.min(.45,this.pitch-(e.clientY-y)*.004));
  }else{this.yaw+=(e.clientX-x)*.005;this.pitch=Math.max(-.48,Math.min(.62,this.pitch+(e.clientY-y)*.004));}this.lastPointer=[e.clientX,e.clientY];this.dirty=true;});
  const up=()=>{if(!this.dragging)return;this.dragging=false;this.lastPointer=null;this.dirty=true;};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.fov=Math.max(38,Math.min(78,this.fov+Math.sign(e.deltaY)*3));this.dirty=true;},{passive:false});
 }
 sampleDepth(x,y){if(this.gpu){const p=this.gpu.readPoint(x,y);return p.depth>0?1/p.depth:0;}return this.engine.sampleDepth(x,y);}
 capture(game,width=480){
  // Force one coherent state render. Capture excludes UI/highlight overlays.
  this.draw(game,0,true);let raw;
  if(this.gpu)raw=this.gpu.read();else{
   const n=this.rw*this.rh,iz=new Float32Array(this.engine.memory.buffer,this.engine.depthBuffer(),n);
   raw={width:this.rw,height:this.rh,rgba:new Uint8ClampedArray(this.engine.memory.buffer,this.engine.image(),n*4),depth:Float32Array.from(iz,d=>d>0?1/d:NaN),labels:new Uint16Array(this.engine.memory.buffer,this.engine.labelBuffer(),n),depthQuantizationM:0};
  }
  const w=Math.min(raw.width,Math.max(80,Math.round(width))),h=Math.max(1,Math.round(raw.height*w/raw.width)),rgba=new Uint8ClampedArray(w*h*4),depth=new Float32Array(w*h),labels=new Uint16Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(raw.width-1,Math.floor((x+.5)*raw.width/w)),sy=Math.min(raw.height-1,Math.floor((y+.5)*raw.height/h)),a=y*w+x,b=sy*raw.width+sx;rgba.set(raw.rgba.subarray(b*4,b*4+4),a*4);depth[a]=raw.depth[b];labels[a]=raw.labels[b];}
  return {width:w,height:h,sourceWidth:raw.width,sourceHeight:raw.height,rgba,depth,labels,depthQuantizationM:raw.depthQuantizationM};
 }
 setView(mode){
  if(!['room','robot','overview'].includes(mode)||mode===this.mode)return;
  this.viewSettings.set(this.mode,{yaw:this.yaw,pitch:this.pitch,fov:this.fov});
  const changedCeiling=(this.mode==='overview')!==(mode==='overview');
  this.mode=mode;Object.assign(this,this.viewSettings.get(mode)||{yaw:0,pitch:0,fov:mode==='overview'?58:64});
  if(changedCeiling)this.scene=null;
  this.dirty=true;
 }
 resetLook(){this.yaw=0;this.pitch=0;this.fov=this.mode==='overview'?58:64;this.dirty=true;}
 camera(game){
  const b=game.robot;let eye,target;
  if(this.mode==='robot'){const a=b.yaw+this.yaw;eye=[b.x+Math.sin(b.yaw)*.24,1.50,b.z+Math.cos(b.yaw)*.24];target=[eye[0]+Math.sin(a)*5,1.18+this.pitch*4,eye[2]+Math.cos(a)*5];}
  else if(this.mode==='overview'){target=[6,.7,4.9];let a=.50+this.yaw;eye=[6+Math.sin(a)*11,12+this.pitch*6,4.9+Math.cos(a)*11];}
  else {target=[5.1,1.0,4.3];let a=.60+this.yaw;eye=[5.1+Math.sin(a)*7.5,3.6+this.pitch*4,4.3+Math.cos(a)*7.5];}
  this.eye=eye;this.target=target;this.F=normalize(sub(target,eye));this.R=normalize(cross(this.F,[0,1,0]));this.U=normalize(cross(this.R,this.F));this.focal=this.h*.5/Math.tan(this.fov*Math.PI/360);this.config.set([...eye,...target,.5/Math.tan(this.fov*Math.PI/360),1.25]);
 }
 resize(){const r=this.canvas.getBoundingClientRect();let w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(w!==this.w||h!==this.h){this.w=w;this.h=h;this.canvas.width=w;this.canvas.height=h;this.dirty=true;}
  // The CPU path cannot shade a high-resolution moving room every frame.
  // Use a lower live raster while moving, then restore detail after 250 ms idle.
  // Capture metadata always exposes this actual source raster; no invented frames.
  const moving=performance.now()<this.cameraMotionUntil;
  const cap=this.gpu?1180:this.mode==='robot'?(moving?384:640):this.dragging?480:1180;const factor=Math.min(1,cap/w,900/h);const rw=Math.max(1,Math.round(w*factor)),rh=Math.max(1,Math.round(h*factor));
  if(rw!==this.rw||rh!==this.rh){this.rw=rw;this.rh=rh;this.surface.width=rw;this.surface.height=rh;this.pixels=new Uint8ClampedArray(this.engine.memory.buffer,this.engine.image(),rw*rh*4);this.image=new ImageData(this.pixels,rw,rh);this.dirty=true;}
 }
 project(x,z,y=0){const p=sub([x,y,z],this.eye||[10,3,11]);const d=dot(p,this.F||[0,0,-1]);return{x:this.w/2+dot(p,this.R||[1,0,0])*this.focal/d,y:this.h/2-dot(p,this.U||[0,1,0])*this.focal/d,z:d};}
 unproject(x,y){const direction=add(this.F,add(scale(this.R,(x-this.w/2)/this.focal),scale(this.U,-(y-this.h/2)/this.focal)));if(direction[1]>-.01)return{x:-1,z:-1};const t=-this.eye[1]/direction[1];const p=add(this.eye,scale(direction,t));return{x:p[0],z:p[2]};}
 addHot(id,x,z,y,r=22){const p=this.project(x,z,y);if(p.z<=.1||p.x<0||p.x>this.w||p.y<0||p.y>this.h)return;const depth=this.sampleDepth(Math.floor(p.x/this.w*this.rw),Math.floor(p.y/this.h*this.rh));
 // Approximate center visibility: do not select an object through an opaque wall.
 if(depth>0&&p.z>1/depth+.45)return;this.hotspots.push({id,x:p.x,y:p.y,r,z:p.z});}
 hit(x,y){let best=null,score=Infinity;for(const p of this.hotspots){const d=Math.hypot(p.x-x,p.y-y);if(d<p.r&&d<score){best=p.id;score=d;}}return best;}
 spark(){/* restrained highlight; no toy confetti in the architectural view */}
 overlay(game){const c=this.ctx;const selected=this.hover||this.hint;const held=game.robot.held&&game.entity(game.robot.held);const mark=(id,text)=>{const e=game.entity(id);if(!e)return;let y=e.y??e.h??.1;if(id==='cupboard')y=2.6;const p=this.project(e.x,e.z,y+.3);if(p.z<=.1||p.x<0||p.x>this.w)return;c.save();c.strokeStyle='#dec398';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,13,0,Math.PI*2);c.stroke();c.font='500 11px system-ui';let width=c.measureText(text).width+22;let xx=Math.max(8,Math.min(this.w-width-8,p.x-width/2));let yy=Math.max(17,p.y-30);c.fillStyle='#202924eb';c.beginPath();c.roundRect(xx,yy-16,width,24,4);c.fill();c.fillStyle='#efe9dd';c.fillText(text,xx+11,yy);c.restore();};
 if(selected){const e=game.entity(selected);mark(selected,e?.label||'Inspect');}else if(held)mark(held.desired,'Place · '+game.entity(held.desired).label);
 if(!game.scene.rescueTaken){const p=this.project(game.robot.x,game.robot.z,1.9);c.font='500 11px system-ui';c.fillStyle='#f1d9ac';c.fillText('PRACTICE BOT · PATH BLOCKED',p.x-85,p.y);}
 }
 draw(game,dt,force=false){this.time+=dt;const now=performance.now();
  const pose=[game.robot.x,game.robot.z,game.robot.yaw,this.yaw,this.pitch,this.fov];
  if(this.mode==='robot'&&(!this.lastMotionPose||pose.some((v,i)=>Math.abs(v-this.lastMotionPose[i])>1e-7)))this.cameraMotionUntil=now+250;
  this.lastMotionPose=pose;this.resize();if(this.scene!==game.scene){this.scene=game.scene;const data=buildRoom(game.scene,{ceiling:this.mode!=='overview'});this.static=data.builder;this.m=data.m;this.materials.fill(0);this.materials.set(this.static.materials);this.dirty=true;this.shadowDirty=true;this.staticUploadDirty=true;}
  this.camera(game);const camKey=[...this.eye,...this.target,this.rw,this.rh,this.fov].map(x=>x.toFixed(3)).join();if(camKey!==this.lastCamera)this.dirty=true;
  const b=game.robot;const signature=[b.x.toFixed(3),b.z.toFixed(3),b.yaw.toFixed(3),b.arm?.toFixed(3),b.held,game.scene.cupboardOpen,game.scene.objects.map(o=>[o.x,o.z,o.y,o.held,o.location].join(',')).join(';'),this.paint,this.cap].join('|');
  const changed=signature!==this.lastSignature;
  if(!this.dirty&&!changed&&!force){this.ctx.drawImage(this.surface,0,0,this.w,this.h);this.overlay(game);return;}
  if(now-this.lastDraw<(this.gpu?12:55)&&!this.dirty&&!force)return;
  const start=performance.now();
  if(this.paint){const n=parseInt(this.paint.slice(1),16),offset=this.m.shell*8;this.materials[offset]=(n>>16)/255;this.materials[offset+1]=((n>>8)&255)/255;this.materials[offset+2]=(n&255)/255;}
  if(this.dirty&&!this.gpu){if(this.static.v.length>this.vertices.length)throw new Error('Room exceeds renderer vertex capacity');this.vertices.set(this.static.v);this.engine.bake(this.static.v.length/27,this.rw,this.rh,this.shadowDirty?1:2,1);this.shadowDirty=false;this.lastCamera=camKey;}
  const dynamic=new MeshBuilder();dynamicRoom(dynamic,this.m,game,this.paint);if(dynamic.v.length>this.vertices.length)throw new Error('Dynamic geometry exceeds capacity');if(this.gpu){try{this.gpu.render(this,this.static,dynamic,this.staticUploadDirty);this.staticUploadDirty=false;this.surfaceCtx.drawImage(this.gpu.canvas,0,0);}catch(error){this.gpuUnavailable=String(error.message||error);this.gpu.dispose();this.gpu=null;this.backend='Studio 3D · CPU/WASM';this.shadowDirty=true;this.dirty=true;return this.draw(game,0,true);}}
  else{this.vertices.set(dynamic.v);this.engine.dynamic(dynamic.v.length/27);this.surfaceCtx.putImageData(this.image,0,0);}
  this.ctx.drawImage(this.surface,0,0,this.w,this.h);this.hotspots=[];
  for(const o of game.scene.objects)if(!o.held&&(!o.container||game.scene.cupboardOpen))this.addHot(o.id,o.x,o.z,o.y+(o.type==='chair'?.70:o.type==='suitcase'?.45:.14),o.type==='chair'?30:24);
  const f=game.scene.furniture.find(f=>f.type==='cupboard');this.addHot('cupboard',f.x,f.z+f.d*.5,1.9,38);
  for(const z of game.scene.zones)if(game.scene.objects.some(o=>o.desired===z.id))this.addHot(z.id,z.x,z.z,z.y+.12,33);
  if(game.scene.permission==='denied')this.addHot('defer-room',7.45,9.12,1.13,45);
  this.lastCamera=camKey;this.lastSignature=signature;this.lastDraw=now;this.dirty=false;this.lastRenderMs=performance.now()-start;this.renderFrames++;this.overlay(game);
 }
}
