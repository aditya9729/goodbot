import { clamp, lerp } from './math.js';
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class HandPointer {
 constructor(){this.reset();}
 reset(){this.center=null;this.samples=[];this.x=.5;this.y=.5;this.pinched=false;this.since=0;this.last=0;this.lastClick=-Infinity;this.calibrated=false;this.fresh=false;}
 feed(landmarks,now){
  const l=landmarks?.[0];this.fresh=false;
  if(!l||l.length!==21||l.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))){this.pinched=false;this.since=0;return {valid:false,click:false};}
  const p={x:1-l[9].x,y:l[9].y};this.last=now;this.fresh=true;
  if(!this.calibrated){this.samples.push(p);if(this.samples.length>24)this.samples.shift();if(this.samples.length>=20){const avg={x:this.samples.reduce((a,p)=>a+p.x,0)/this.samples.length,y:this.samples.reduce((a,p)=>a+p.y,0)/this.samples.length};if(this.samples.every(p=>Math.hypot(p.x-avg.x,p.y-avg.y)<.045)){this.center=avg;this.calibrated=true;}}return {valid:true,click:false,progress:Math.min(this.samples.length/20,1),calibrated:this.calibrated};}
  this.x=lerp(this.x,clamp(.5+(p.x-this.center.x)*2.6,.03,.97),.32);
  this.y=lerp(this.y,clamp(.52+(p.y-this.center.y)*2.8,.04,.96),.32);
  const scale=length(l[0],l[9]);if(scale<.025)return {valid:false,click:false};
  const ratio=length(l[4],l[8])/scale;
  let click=false;
  if(ratio<.34&&!this.pinched){if(!this.since)this.since=now;if(now-this.since>130&&now-this.lastClick>650){this.pinched=true;this.lastClick=now;click=true;}}
  else if(ratio>.5){this.pinched=false;this.since=0;}
  return {valid:true,click,x:this.x,y:this.y,calibrated:true,pinched:this.pinched};
 }
 stale(now){return !this.fresh||now-this.last>350;}
}
