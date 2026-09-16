import { THEMES } from './scene.js';
import { lerp } from './math.js';
const C={wood:'#bf9874',woodLight:'#d9b78e',cream:'#f6edda',ink:'#38423e',gold:'#d9ad50',robot:'#e7e6cf'};
function shade(hex,n){const a=hex.replace('#','');const v=parseInt(a,16);return '#'+[v>>16,(v>>8)&255,v&255].map(c=>Math.max(0,Math.min(255,c+n)).toString(16).padStart(2,'0')).join('');}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.w=0;this.h=0;this.s=30;this.ox=0;this.oy=0;this.hotspots=[];this.hover=null;this.hint=null;this.particles=[];this.reduced=false;this.time=0;}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(this.w!==r.width||this.h!==r.height||this.canvas.width!==Math.round(r.width*d)){this.w=r.width;this.h=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);}this.ctx.setTransform(d,0,0,d,0,0);this.s=Math.min((this.w-35)/21,(this.h-70)/12.8);this.ox=this.w/2-this.s;this.oy=this.h/2-3.6*this.s;}
 project(x,z,y=0){return {x:this.ox+(x-z)*this.s*.88,y:this.oy+(x+z)*this.s*.43-y*this.s*.88};}
 unproject(x,y){const a=(x-this.ox)/(this.s*.88),b=(y-this.oy)/(this.s*.43);return {x:(a+b)/2,z:(b-a)/2};}
 poly(points,fill,stroke=null,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 plane(x,z,y,w,d,color,stroke=null){this.poly([[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]].map(([a,b])=>this.project(a,b,y)),color,stroke);}
 box(x,z,y,w,d,h,color){const p=(a,b,c)=>this.project(a,b,c);const x1=x-w/2,x2=x+w/2,z1=z-d/2,z2=z+d/2;
 this.poly([p(x1,z2,y),p(x2,z2,y),p(x2,z2,y+h),p(x1,z2,y+h)],shade(color,-21));
 this.poly([p(x2,z1,y),p(x2,z2,y),p(x2,z2,y+h),p(x2,z1,y+h)],shade(color,-38));
 this.plane(x,z,y+h,w,d,color,shade(color,-5));}
 line(points,color,width=2){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
 ellipse(x,z,y,rx,ry,color){const p=this.project(x,z,y),c=this.ctx;c.beginPath();c.ellipse(p.x,p.y,rx*this.s,ry*this.s,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 cylinder(x,z,y,r,h,color){const p=this.project(x,z,y+h),q=this.project(x,z,y);const c=this.ctx;c.fillStyle=shade(color,-15);c.beginPath();c.moveTo(p.x-r*this.s,p.y);c.lineTo(q.x-r*this.s,q.y);c.ellipse(q.x,q.y,r*this.s,r*this.s*.44,0,Math.PI,0,true);c.lineTo(p.x+r*this.s,p.y);c.fill();this.ellipse(x,z,y+h,r,r*.44,color);}
 label(x,z,y,title,sub=null,color=C.ink){const c=this.ctx,p=this.project(x,z,y);c.save();c.font='600 11px system-ui';const width=c.measureText(title).width+20;
 c.shadowColor='#24352b18';c.shadowBlur=10;c.fillStyle='#fffcf2';c.beginPath();c.roundRect(p.x-width/2,p.y-17,width,25,10);c.fill();c.shadowBlur=0;c.fillStyle=color;c.textAlign='center';c.fillText(title,p.x,p.y);c.restore();}
 ring(x,z,y,color,scale=1){const c=this.ctx,p=this.project(x,z,y);c.save();c.strokeStyle=color;c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.ellipse(p.x,p.y,.72*this.s*scale,.34*this.s*scale,0,0,Math.PI*2);c.stroke();c.restore();}
 spark(x,z){if(this.reduced)return;for(let i=0;i<15;i++)this.particles.push({x,z,y:.7,dx:(Math.random()-.5)*1.8,dz:(Math.random()-.5)*1.8,dy:1.3+Math.random()*1.5,life:1.2});}
 addHot(id,x,z,y,r=23){const p=this.project(x,z,y);this.hotspots.push({id,x:p.x,y:p.y,r:Math.max(r,this.s*.4)});}
 hit(x,y){let best=null,score=Infinity;for(const p of this.hotspots){const d=Math.hypot(p.x-x,p.y-y);if(d<p.r&&d<score){best=p.id;score=d;}}return best;}
 furniture(f,scene){const {x,z,w,d,h,type}=f;const theme=THEMES[scene.level.theme];
 if(type==='bed'){
  this.ellipse(x,z,.02,w*.55,d*.22,'#57412c15');this.box(x,z,.15,w,d,.42,C.wood);this.box(x,z,.57,w+.04,d,.28,'#fff5df');this.box(x,z+.6,.85,w+.05,d*.62,.16,theme.accent);
  this.box(x,z-d/2+.08,.25,w+.12,.23,1.4,theme.trim);
  for(const a of [-.76,.76]){this.box(x+a,z-1,.86,1.15,.7,.19,C.cream);this.box(x+a,z-1,.99,.9,.5,.09,'#fffaf0');}
  this.plane(x,z+1.1,1.02,w+.04,.2,shade(theme.accent,22));
 }else if(type==='desk'||type==='nightstand'){
  for(const a of [-1,1])for(const b of [-1,1])this.box(x+a*(w/2-.1),z+b*(d/2-.1),0,.12,.12,h-.1,C.wood);
  this.box(x,z,h-.13,w,d,.15,C.woodLight);
  if(type==='nightstand'){this.box(x,z,.3,w*.9,d*.9,.4,shade(C.wood,10));this.lamp(x,z-.22,h+.05);}
  else{this.plane(x-.38,z,h+.026,.8,.65,'#d5d5ba');this.box(x+.75,z-.21,h+.04,.35,.08,.4,'#ac886d');this.box(x+.75,z-.16,h+.1,.28,.03,.27,'#e8d9bc');}
 }else if(type==='cupboard'){
  this.box(x,z,0,w,d,h,theme.trim);this.box(x,z+.01,.22,w-.15,d+.025,h-.35,shade(theme.trim,-15));
  for(const y of [.55,1.02,1.43])this.box(x,z+.03,y,w-.15,d+.06,.06,C.woodLight);
  if(!scene.cupboardOpen){this.box(x,z+d/2+.03,.17,w-.08,.07,h-.14,shade(theme.trim,13));this.cylinder(x+.47,z+d/2+.1,.75,.045,.07,C.gold);}
  else{this.box(x+w/2+.42,z+d/2-.2,.17,.8,.09,h-.14,shade(theme.trim,13));this.plane(x,z,h+.01,w-.16,d-.12,'#98aa87');}
  this.addHot('cupboard',x,z,h+.2,32);
 }else if(type==='shelf'){
  for(const a of [-1,1])this.box(x+a*(w/2-.1),z,0,.12,d,h,theme.trim);
  for(const y of [.2,.65,.94])this.box(x,z,y,w,d,.08,C.woodLight);
  for(let i=0;i<3;i++)this.box(x-.6+i*.53,z,.28,.43,.6,.23,'#d2bca0');
 }else if(type==='cart'){
  for(const a of [-1,1])for(const b of [-1,1]){this.cylinder(x+a*.7,z+b*.42,.05,.11,.14,'#515953');this.box(x+a*.75,z+b*.46,.12,.07,.07,1.15,'#967e54');}
  this.box(x,z,.33,w,d,.09,C.wood);this.box(x,z,h,w,d,.08,C.woodLight);
  this.box(x,z-.46,h+.08,w,.06,.15,'#af9261');this.box(x,z+.46,h+.08,w,.06,.1,'#af9261');
  for(let i=0;i<3;i++)this.box(x-.55+i*.52,z,.45,.43,.7,.27,'#f2e8cf');
  this.line([this.project(x-w/2-.08,z-.45,1.3),this.project(x-w/2-.08,z+.45,1.3)],'#8e794d',3);
 }
 }
 lamp(x,z,y){this.cylinder(x,z,y,.24,.04,'#96754c');this.cylinder(x,z,y+.04,.035,.7,'#957951');this.cylinder(x,z,y+.6,.34,.36,'#f0d69b');const p=this.project(x,z,y+.8),c=this.ctx;const g=c.createRadialGradient(p.x,p.y,2,p.x,p.y,this.s*1.2);g.addColorStop(0,'#ffe4a924');g.addColorStop(1,'#ffe4a900');c.fillStyle=g;c.fillRect(p.x-this.s*1.2,p.y-this.s*1.2,this.s*2.4,this.s*2.4);}
 plant(x,z,y=0){this.cylinder(x,z,y,.3,.4,'#c58f71');for(let i=0;i<6;i++){const a=i*1.05;this.line([this.project(x,z,y+.3),this.project(x+Math.cos(a)*.35,z+Math.sin(a)*.3,y+.9)],'#638466',2);this.ellipse(x+Math.cos(a)*.35,z+Math.sin(a)*.3,y+.8,.21,.095,i%2?'#839d6d':'#688668');}}
 object(o,scene){if(o.held)return;if(o.container&&!scene.cupboardOpen)return;
 const {x,z,y,type}=o;
 if(type==='cup'){this.ellipse(x,z,y,.16,.08,'#302d2120');this.cylinder(x,z,y,.16,.27,o.color);this.ellipse(x,z,y+.272,.125,.056,'#e8ded0');this.ellipse(x,z,y+.274,.092,.041,'#886847');const p=this.project(x+.18,z,y+.16);const c=this.ctx;c.strokeStyle=o.color;c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y,.085*this.s,.08*this.s,0,0,Math.PI*2);c.stroke();}
 else if(type==='towel'){for(let i=0;i<2;i++){this.box(x,z,y+i*.085,.48,.4,.08,i?'#faf2df':'#e0d6bf');this.plane(x,z+.06,y+.17,.45,.045,'#c5b292');}}
 else if(type==='chair'){for(const a of [-1,1])for(const b of [-1,1])this.box(x+a*.27,z+b*.27,0,.08,.08,.5,C.wood);this.box(x,z,.48,.72,.72,.12,o.color);this.box(x,z-.3,.57,.72,.1,.52,o.color);this.box(x,z,.6,.59,.57,.08,'#dcc7aa');}
 else if(type==='book'){this.box(x,z,y,.45,.36,.09,o.color);this.box(x,z,y+.04,.39,.34,.025,C.cream);this.box(x,z,y+.085,.46,.36,.035,o.color);}
 else if(type==='suitcase'){this.box(x,z,0,.7,.42,.68,o.color);this.line([this.project(x-.13,z,.7),this.project(x-.13,z,.82),this.project(x+.13,z,.82),this.project(x+.13,z,.7)],'#4e5f64',2);}
 if(o.flagged){this.label(x,z,y+.8,'⚑ STAFF NOTIFIED',null,'#79647f');}
 this.addHot(o.id,x,z,y+(type==='chair'?.8:.22),type==='chair'?27:23);
 }
 robot(bot,scene){const {x,z}=bot,c=this.ctx;
 this.ellipse(x,z,0,.58,.25,'#363c4025');
 for(const a of [-1,1]){this.box(x+a*.42,z,.14,.19,.65,.3,'#424f4c');this.box(x+a*.43,z+.15,.16,.21,.2,.2,'#6d7870');}
 this.box(x,z,.26,.89,.73,.35,this.paint||C.robot);this.box(x,z,.61,.53,.42,.58,'#dedcc6');this.box(x,z,1.17,.97,.65,.55,this.paint||'#ecebdb');if(this.cap){this.box(x,z,1.72,1.05,.7,.08,'#616e59');this.box(x,z,1.8,.72,.5,.15,'#728268');}
 // The readable face is screen-facing, a deliberate toy design.
 const p=this.project(x,z,1.44);c.fillStyle='#3d5c53';c.beginPath();c.roundRect(p.x-this.s*.39,p.y-this.s*.13,this.s*.78,this.s*.29,this.s*.1);c.fill();
 const blink=!this.reduced&&Math.sin(this.time*.7)> .996; c.fillStyle='#a9e3b7';
 for(const a of [-1,1]){c.beginPath();c.roundRect(p.x+a*this.s*.19-this.s*.055,p.y-this.s*.067,this.s*.11,this.s*(blink?.025:.145),this.s*.04);c.fill();}
 this.line([this.project(x,z,1.7),this.project(x,z,1.96)],'#858c78',2);this.ellipse(x,z,1.99,this.rescueAntenna?.11:.07,.06,this.rescueAntenna?'#dc9574':'#d9ac63');
 for(const a of [-1,1]){const shoulder={x:x+a*.39,z,y:1.03},idle={x:x+a*.62,z:z+.24,y:.65};
 let target=idle;if(bot.reachTarget&&a===1){target={x:lerp(idle.x,bot.reachTarget.x,bot.arm),z:lerp(idle.z,bot.reachTarget.z,bot.arm),y:lerp(idle.y,bot.reachTarget.y+.15,bot.arm)};}else if(bot.held){target={x:x+a*.3,z:z+.45,y:1.02};}
 const elbow={x:(shoulder.x+target.x)/2+a*.12,z:(shoulder.z+target.z)/2-.13,y:(shoulder.y+target.y)/2+.04};
 this.line([this.project(shoulder.x,shoulder.z,shoulder.y),this.project(elbow.x,elbow.z,elbow.y),this.project(target.x,target.z,target.y)],'#929c8d',this.s*.12);
 this.ellipse(elbow.x,elbow.z,elbow.y,.09,.07,'#d5d9c3');this.line([this.project(target.x-.08,target.z,target.y+.06),this.project(target.x-.08,target.z,target.y-.08),this.project(target.x+.08,target.z,target.y-.08)],'#53695d',2);
 }
 if(bot.held){const o=scene.objects.find(o=>o.id===bot.held);if(o){this.object({...o,held:false,x:x,z:z+.52,y:1.04},scene);this.hotspots.pop();}}
 }
 draw(game,dt=.016){this.resize();const c=this.ctx,s=game.scene,theme=THEMES[s.level.theme];this.time+=dt;this.hotspots=[];
 c.clearRect(0,0,this.w,this.h);const bg=c.createLinearGradient(0,0,0,this.h);bg.addColorStop(0,'#efeade');bg.addColorStop(1,'#dedbce');c.fillStyle=bg;c.fillRect(0,0,this.w,this.h);
 // A soft, floating miniature set: floor slab and two cutaway walls.
 this.ellipse(6,5,-.6,10,3.7,'#29392a0e');this.box(6,5,-.3,12.15,10.15,.29,'#bfb6a2');
 for(let x=0;x<12;x++)for(let z=0;z<10;z++)this.plane(x+.5,z+.5,0,1,1,(x+z)%2?'#d8c3a7':'#ddc9ae','#c8b69930');
 this.box(6,-.09,0,12.2,.18,2.65,theme.wall);this.box(-.09,5,0,.18,10.2,2.65,shade(theme.wall,-6));
 this.box(6,-.19,0,12.2,.12,.19,theme.trim);this.box(-.18,5,0,.13,10.2,.19,theme.trim);
 this.box(6,-.1,2.65,12.2,.26,.1,shade(theme.wall,12));this.box(-.1,5,2.65,.26,10.2,.1,shade(theme.wall,12));
 // Window and curtains on the rear wall.
 this.box(6.55,.015,.65,2.8,.09,1.75,theme.trim);this.box(6.55,.072,.74,2.58,.02,1.54,theme.sky);
 for(const xx of [5.88,7.05])this.box(xx,.09,.75,.035,.035,1.55,'#f5ebd6');this.box(6.55,.09,1.52,2.6,.04,.035,'#f5ebd6');
 for(const xx of [4.98,8.1])this.box(xx,.2,.37,.45,.22,2.24,shade(theme.accent,45));
 this.box(6.55,.3,.58,3.12,.6,.13,C.woodLight);this.plant(7.65,.36,.72);
 // Quiet artwork on the left wall.
 this.box(.025,6.9,1.05,.09,1.32,1.07,'#f1e6cf');this.box(.083,6.9,1.14,.01,1.13,.86,theme.rug);
 this.plane(5.55,5.15,.008,4.05,3.9,theme.rug);this.plane(5.55,5.15,.011,3.74,3.62,shade(theme.rug,8));
 const r=s.route;const routeC=s.objects.some(o=>o.id==='chair'&&o.location==='source')?'#f3d79e52':'#dce5cb36';
 this.plane(r.x,r.z,.015,r.w,r.d,routeC);
 if(game.path.length&&!this.reduced){c.save();c.setLineDash([4,8]);this.line([this.project(game.robot.x,game.robot.z,.03),...game.path.map(p=>this.project(p.x,p.z,.03))],'#638c75aa',2);c.restore();}
 const bay=s.zones.find(z=>z.id==='chair-bay');if(s.objects.some(o=>o.type==='chair')){this.plane(bay.x,bay.z,.025,bay.w,bay.d,'#ebd59765','#bca363');}
 this.plant(.7,8.55);this.plant(11.2,8.8);this.plant(11.1,3.1);
 // Attach props to supporting furniture, so they render above their surfaces.
 const support=o=>{if(o.held)return null;if(o.container)return o.container;const z=s.zones.find(z=>z.id===o.location);if(z?.support)return z.support;if(o.location==='source'&&o.y>.6)return o.x<2?'nightstand':'desk';return null;};
 const list=[...s.furniture.map(f=>({order:f.x+f.z,draw:()=>{this.furniture(f,s);for(const o of s.objects)if(support(o)===f.id)this.object(o,s);}})),
 ...s.objects.filter(o=>!support(o)&&!o.held).map(o=>({order:o.x+o.z,draw:()=>this.object(o,s)})),
 {order:game.robot.x+game.robot.z+.1,draw:()=>this.robot(game.robot,s)}];
 list.sort((a,b)=>a.order-b.order);for(const x of list)x.draw();
 for(const z of s.zones){if(s.objects.some(o=>o.desired===z.id)){this.addHot(z.id,z.x,z.z,z.y+.1,34);if(game.robot.held&&s.objects.find(o=>o.id===game.robot.held)?.desired===z.id)this.ring(z.x,z.z,z.y+.05,C.gold,1.05+(!this.reduced?Math.sin(this.time*4)*.07:0));}}
 if(s.permission==='denied'){
  this.box(6.8,8.95,0,2.2,.16,1.65,theme.trim);this.label(6.8,8.95,2.06,'☾ DO NOT DISTURB');this.addHot('defer-room',6.8,8.95,1.85,70);
 }
 if(!s.rescueTaken)this.label(game.robot.x,game.robot.z,2.55,'Oops. My route is blocked.');
 if(this.hint||this.hover){const id=this.hover||this.hint;const o=game.entity(id);if(o){this.ring(o.x,o.z,(o.y||0)+.03,o.protected?'#a285b4':'#e3b65c',.8);this.label(o.x,o.z,(o.y||o.h||.5)+.9,o.label||id,null,o.protected?'#826b96':C.ink);}}
 for(const p of this.particles){p.life-=dt;p.x+=p.dx*dt;p.z+=p.dz*dt;p.y+=p.dy*dt;p.dy-=dt*3;const q=this.project(p.x,p.z,p.y);c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.life>.6?'#e0b258':'#fcf0ce';c.fillRect(q.x,q.y,3,3);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
 // World caption is decoration; all mission information also exists in the DOM.
 c.fillStyle='#788172';c.font='500 10px system-ui';c.textAlign='left';c.fillText('LITTLE LANTERN HOTEL  /  '+s.level.room,20,this.h-18);
 c.textAlign='right';c.fillText('ASSISTED ROBOT PUZZLE',this.w-20,this.h-18);
 }
}
