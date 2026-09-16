// Robot-view control regressions. These use the real simulation and render cache,
// not screenshots in place of game state. Hardware performance is a separate gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../public/src/game.js';
import {createScene} from '../public/src/scene.js';
import {wrapAngle,turnToward,dist} from '../public/src/math.js';
import {walkable} from '../public/src/navigation.js';
import {Renderer} from '../public/src/render.js';
import {buildRoom} from '../public/src/hotel3d.js';
import {WASM} from '../public/src/raster-data.js';
import {instrumentGame,EpisodeRecorder} from '../public/src/recording.js';

function fixture(){const g=new Game();g.robot.x=7;g.robot.z=7;g.robot.yaw=.2;return g;}
test('robot reverse remains backward over successive frames; heading never flips',()=>{
 const g=fixture(),yaw=g.robot.yaw,f=[Math.sin(yaw),Math.cos(yaw)];
 for(let i=0;i<8;i++){const prev={...g.robot};g.directRobot(-1,0,0,1/60);g.update(1/60);
  assert.equal(g.robot.yaw,yaw);assert.ok((g.robot.x-prev.x)*f[0]+(g.robot.z-prev.z)*f[1]<0);
 }
});
test('robot strafing translates without rotating its camera heading',()=>{
 const g=fixture(),p={...g.robot};for(let i=0;i<8;i++)g.directRobot(0,0,1,1/60);
 assert.equal(g.robot.yaw,p.yaw);assert.ok(dist(g.robot,p)>.3);
 assert.ok(Math.abs((g.robot.x-p.x)*Math.sin(p.yaw)+(g.robot.z-p.z)*Math.cos(p.yaw))<1e-10);
});
test('robot left/right turn in place with a bounded, reversible rate',()=>{
 const g=fixture(),p={...g.robot};g.directRobot(0,1,0,.05);
 assert.ok(Math.abs(wrapAngle(g.robot.yaw-p.yaw)+.09)<1e-10);assert.equal(g.robot.x,p.x);assert.equal(g.robot.z,p.z);
 g.directRobot(0,-1,0,.05);assert.ok(Math.abs(wrapAngle(g.robot.yaw-p.yaw))<1e-10);
});
test('robot diagonal movement is normalized and elapsed time is bounded',()=>{
 const g=fixture(),p={...g.robot};g.directRobot(1,0,1,10);
 assert.ok(Math.abs(dist(g.robot,p)-2.7*.05)<1e-10);
});
test('robot controls reject non-finite inputs and cannot cross permission gates',()=>{
 const g=fixture(),p={...g.robot};for(const bad of [NaN,Infinity,-Infinity])assert.equal(g.directRobot(bad,0,0,.02),false);
 assert.deepEqual(g.robot,p);const denied=new Game(createScene('quiet')),before={...denied.robot};
 assert.equal(denied.directRobot(1,1,1,.05),false);assert.deepEqual(denied.robot,before);
 const rescue=new Game(createScene('rescue'));assert.equal(rescue.directRobot(1,1,0,.05),false);
});
test('robot driving preserves collision checks at walls',()=>{
 const g=new Game();for(let i=0;i<150;i++)g.directRobot(-1,0,0,.05);
 assert.ok(walkable(g.scene,g.robot));assert.ok(g.robot.z<=g.scene.depth-.35);
});
test('angle steering follows shortest arc through plus/minus PI',()=>{
 const a=Math.PI-.02,b=-Math.PI+.02;const next=turnToward(a,b,.01);
 assert.ok(Math.abs(wrapAngle(next-a)-.01)<1e-12);
 assert.ok(Math.abs(wrapAngle(b-turnToward(a,b,.1)))<1e-12);
});
test('automatic approach and reach have bounded heading steps and still pick up normally',()=>{
 const g=new Game();assert.ok(g.command('cup-a'));let steps=0;
 while(!g.robot.held&&steps++<1800){const yaw=g.robot.yaw;g.update(1/60);assert.ok(Math.abs(wrapAngle(g.robot.yaw-yaw))<=2.4/60+1e-10);}
 assert.equal(g.robot.held,'cup-a');assert.ok(g.command(g.entity('cup-a').desired));
 while(g.robot.held&&steps++<3600){const yaw=g.robot.yaw;g.update(1/60);assert.ok(Math.abs(wrapAngle(g.robot.yaw-yaw))<=2.4/60+1e-10);}
 assert.equal(g.robot.held,null);assert.equal(g.history.at(-1).kind,'place');
});
test('manual robot control cancels an automatic route without discarding held cargo',()=>{
 const g=new Game();g.command('cup-a');for(let i=0;i<1200&&!g.robot.held;i++)g.update(1/60);
 assert.equal(g.robot.held,'cup-a');g.command('cart-tray');g.directRobot(0,1,0,.02);
 assert.equal(g.path.length,0);assert.equal(g.pending,null);assert.equal(g.robot.held,'cup-a');
});
test('view settings survive switching and selecting an already-active view',()=>{
 const r={mode:'room',yaw:.3,pitch:.1,fov:70,viewSettings:new Map(),scene:{id:'test'},dirty:false};
 const scene=r.scene;Renderer.prototype.setView.call(r,'robot');assert.equal(r.scene,scene);
 Object.assign(r,{yaw:-.4,pitch:-.2,fov:51});Renderer.prototype.setView.call(r,'room');assert.equal(r.yaw,.3);
 Renderer.prototype.setView.call(r,'robot');assert.equal(r.yaw,-.4);assert.equal(r.fov,51);
 Renderer.prototype.setView.call(r,'robot');assert.equal(r.yaw,-.4);
 Renderer.prototype.resetLook.call(r);assert.equal(r.yaw,0);assert.equal(r.fov,64);
 Renderer.prototype.setView.call(r,'overview');assert.equal(r.scene,null);
});
test('camera pose does not mutate the robot and looking cannot feed back into robot drive',()=>{
 const g=fixture(),p={...g.robot};const r={mode:'robot',yaw:1.2,pitch:.3,h:800,fov:64,config:new Float32Array(32)};
 Renderer.prototype.camera.call(r,g);assert.deepEqual(g.robot,p);
 g.directRobot(1,0,0,.02);
 assert.equal(g.robot.yaw,p.yaw);assert.ok(Math.abs((g.robot.x-p.x)*Math.cos(p.yaw)-(g.robot.z-p.z)*Math.sin(p.yaw))<1e-10);
});
test('new body-frame keyboard controls appear in local episode action logs',()=>{
 const rec=new EpisodeRecorder(),g=instrumentGame(fixture(),rec);
 // The test only exercises normalized-action instrumentation; image consent/lifecycle
 // is separately tested by the recorder suite and browser tests.
 rec.active=true;rec.wallStart=0;g.directRobot(-1,0,0,.02);
 assert.equal(rec.actions.at(-1).kind,'directRobot');assert.equal(rec.actions.at(-1).modality,'keyboard');
 assert.equal(rec.actions.at(-1).accepted,true);
});
test('cached static shadows match full rebuild pixel-for-pixel after moving the camera',()=>{
 const e=new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(WASM,'base64'))).exports;
 const {builder:b}=buildRoom(createScene());new Float32Array(e.memory.buffer,e.vertices(),e.maxVertices()*9).set(b.v);
 new Float32Array(e.memory.buffer,e.materials(),512).set(b.materials);const cfg=new Float32Array(e.memory.buffer,e.config(),32);
 cfg.set([6.8,1.5,8.7,6.8,1.18,3.7,.5/Math.tan(64*Math.PI/360),1.25]);e.bake(b.v.length/27,240,160,1,1);
 assert.equal(e.shadowBuildCount(),1);cfg[0]+=.2;cfg[3]+=.2;
 e.bake(b.v.length/27,240,160,2,1);assert.equal(e.shadowBuildCount(),1);
 const hash=()=>createHash('sha256').update(new Uint8Array(e.memory.buffer,e.image(),240*160*4)).digest('hex');
 const reused=hash();e.bake(b.v.length/27,240,160,1,1);assert.equal(hash(),reused);assert.equal(e.shadowBuildCount(),2);
});
