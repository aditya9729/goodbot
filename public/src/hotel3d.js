import { INSTANCE_IDS } from './identities.js';
// Original architectural geometry. No downloaded models/textures or camera frames.
import { MeshBuilder, add, sub, scale, normalize, rotateY } from './geometry.js';
export function palette(b){return {
 plaster:b.material('#e0dbce',.97,0,3),ceiling:b.material('#e9e5db',1,0,3),wallInset:b.material('#b8b1a0',.96,0,3),
 oak:b.material('#aa8763',.63,0,1),oak2:b.material('#b69573',.67,0,1),oak3:b.material('#9e7c58',.65,0,1),walnut:b.material('#503529',.53,0,1),walnutEdge:b.material('#37291f',.4,0,1),
 linen:b.material('#ede7db',.96,0,2),linenShade:b.material('#d7cebb',1,0,2),white:b.material('#f3efe4',.78,0,2),runner:b.material('#606f61',.91,0,2),
 rug:b.material('#bcb6a6',1,0,4),rugEdge:b.material('#868479',1,0,4),upholstery:b.material('#647063',.96,0,2),chair:b.material('#a39378',.97,0,2),
 brass:b.material('#b1a078',.28,.82,5),steel:b.material('#a2abb0',.28,.85,5),darkMetal:b.material('#3c4240',.3,.7,5),black:b.material('#24292a',.69,.16),
 ceramic:b.material('#e9e4d9',.22),cupBlue:b.material('#718795',.25),cupCoral:b.material('#b69078',.27),coffee:b.material('#3b2b23',.13),
 shell:b.material('#d6d8d3',.38,.28),glass:b.material('#13212a',.06,.6),light:b.material('#f0cd8c',.9,0,0,2.2),led:b.material('#81bfd0',.12,0,0,1.2),
 leaf:b.material('#435648',.86),leaf2:b.material('#62735a',.91),pot:b.material('#a0927d',.88,0,3),soil:b.material('#38352c',1,0,3),
 book:b.material('#55534f',.89,0,2),pages:b.material('#d2c8b4',1,0,3),suitcase:b.material('#515b5e',.62,0,2),
 sky:b.material('#d1dce0',1,0,7,1.1),city:b.material('#8c9494',1,0,3,.2),city2:b.material('#b1aea7',1,0,3,.2),cityWindows:b.material('#556970',.35,.2),
 art:b.material('#c4b7a2',1,0,3),art2:b.material('#786e5b',.96,0,3),art3:b.material('#887e6a',1,0,3),marker:b.material('#ac9872',.65,.1),softShadow:b.material('#000000',1,0,9)
 };}
function lamp(b,m,x,y,z){b.cylinder(x,y+.027,z,.24,.055,m.darkMetal);b.cylinder(x,y+.39,z,.028,.71,m.brass);b.lathe(x,y+.58,z,[[.26,0],[.30,.36],[.285,.36],[.245,.015],[.26,0]],m.linen,24);b.sphere(x,y+.76,z,.16,.19,.16,m.light,10,6);}
function plant(b,m,x,z,h=1.5){b.lathe(x,0,z,[[.22,0],[.32,.45],[.27,.48],[.25,.42],[.19,.04]],m.pot,18);b.cylinder(x,.425,z,.24,.02,m.soil);for(let i=0;i<7;i++){const a=i*2.4,yy=.65+(i%3)*.27,tip=[x+Math.sin(a)*.4,yy+.45,z+Math.cos(a)*.4];b.tube([x,.4,z],tip,.013,m.leaf,6);b.surface((u,v)=>{const p=[tip[0]+Math.sin(a)*u*.42,tip[1]+Math.sin(u*Math.PI)*.12-u*.08,tip[2]+Math.cos(a)*u*.42];p[0]+=Math.cos(a)*(v-.5)*.26*Math.sin(u*Math.PI);p[2]-=Math.sin(a)*(v-.5)*.26*Math.sin(u*Math.PI);return p;},6,3,i%2?m.leaf:m.leaf2);}}
export function buildRoom(scene,{ceiling=true}={}){const b=new MeshBuilder(),m=palette(b);b.instance=1;const B=(...a)=>b.box(...a);const T=(...a)=>b.tube(...a);
 // Architectural shell, textured oak floor, full-height plaster and joinery.
 B(6,-.13,5,12.1,.24,10.1,m.walnutEdge);
 for(let x=0;x<20;x++)for(let z=0;z<6;z++){const start=z*1.85-(x%3)*.61,lo=Math.max(0,start),hi=Math.min(10,start+1.842);if(hi>lo)B(x*.6+.3,-.007,(lo+hi)/2,.592,.04,hi-lo,[m.oak,m.oak2,m.oak3][(x*7+z*3)%3]);}
 B(-.1,2.25,5,.2,4.5,10,m.plaster);B(12.1,2.25,5,.2,4.5,10,m.plaster);
 B(2.5,2.25,-.12,5,4.5,.24,m.plaster);B(10.2,2.25,-.12,3.6,4.5,.24,m.plaster);
 B(6.7,.52,-.12,3.4,1.04,.24,m.plaster);B(6.7,4.18,-.12,3.4,.64,.24,m.plaster);
 for(const x of [.04,11.96]){B(x,.11,5,.075,.22,10,m.linenShade);B(x,4.35,5,.1,.12,10,m.linenShade);}
 B(6,.11,.025,12,.22,.075,m.linenShade);B(6,4.35,.06,12,.12,.12,m.linenShade);
 if(ceiling){B(6,4.58,5,12.15,.16,10.2,m.ceiling);for(const [cx,cz]of [[5.5,3.5],[9.2,6.7],[3.2,7.5]])b.cylinder(cx,4.485,cz,.12,.025,m.light,16);}
 // Window: real aperture with depth, mullions, sill, folded drapes and exterior geometry.
 B(6.7,2.44,-3,8,5,.02,m.sky);
 for(let i=0;i<15;i++){const x=1.4+i*.68,hh=.8+(i*7%6)*.3,zz=-1.5-(i%3)*.2;B(x,hh*.5-.2,zz,.6,hh,.4,i%2?m.city:m.city2);for(let yy=.1;yy<hh-.3;yy+=.26)for(let xx=-.18;xx<=.18;xx+=.18)B(x+xx,yy,zz+.205,.085,.12,.012,m.cityWindows);}
 for(const x of [5.02,6.7,8.38])B(x,2.45,-.005,.062,2.81,.12,m.darkMetal);
 for(const y of [1.04,2.12,3.85])B(6.7,y,-.006,3.42,.055,.12,m.darkMetal);
 B(6.7,1.02,.19,3.55,.09,.55,m.walnut);T([4.78,4.09,.26],[8.64,4.09,.26],.024,m.darkMetal);
 for(const side of [0,1])b.surface((u,v)=>{const x=(side?8.04:4.84)+u*.58,y=.23+v*3.78,z=.30+Math.sin(u*8*Math.PI)*.08+.018*Math.sin(v*5);return[x,y,z];},32,10,m.linenShade);
 // Rug under bed and circulation space. No visual route paint unless explicitly hinted.
 B(4.1,.026,3.92,5.45,.035,6.15,m.rugEdge);B(4.1,.045,3.92,5.27,.013,5.98,m.rug);
 for(let i=0;i<60;i++){const x=1.5+i*.088;T([x,.04,.87],[x+.03,.04,.71],.007,m.rugEdge,4);T([x,.04,6.99],[x-.02,.04,7.12],.007,m.rugEdge,4);}
 // Bed: grounded frame, upholstered panel, mattress, creased duvet, and puffy pillows.
 const bed=scene.furniture.find(f=>f.type==='bed'),x=bed.x,z=bed.z;b.instance=INSTANCE_IDS.bed;
 for(const dx of [-1.37,1.37])for(const dz of [-1.43,1.43])B(x+dx,.17,z+dz,.18,.34,.18,m.walnutEdge,.02);
 B(x,.36,z,3.27,.38,3.53,m.walnut,.06);B(x,.64,z,3.23,.3,3.48,m.linenShade,.13);B(x,.805,z,3.25,.09,3.48,m.white,.035);
 B(x,1.28,z-1.83,3.67,2.42,.19,m.walnut,.05);B(x,1.48,z-1.71,3.4,1.85,.1,m.upholstery,.045);
 for(const dx of [-1.02,-.34,.34,1.02])B(x+dx,1.48,z-1.65,.015,1.78,.018,m.rugEdge);
 b.surface((u,v)=>{let xx=(u-.5)*3.56,zz=-.7+v*2.62,drop=Math.max(0,Math.abs(xx)-1.53)*2;return [x+xx,.985+.034*Math.sin(xx*5+v*3)+.012*Math.sin(xx*19+v*12)-drop,z+zz];},34,26,m.linen);
 b.surface((u,v)=>[x+(u-.5)*3.56,.985-.39*v+.025*Math.sin(u*24),z+1.92+.055*Math.sin(v*1.4)],30,7,m.linen);
 b.surface((u,v)=>[x+(u-.5)*3.51,1.027+.026*Math.sin(u*15)+.012*Math.sin(v*9),z+.68+v*.54],28,5,m.runner);
 for(const dx of [-.79,.79]){b.sphere(x+dx,.965,z-1.02,1.34,.32,.86,m.white,20,12,.55);b.sphere(x+dx,1.10,z-1.11,1.20,.31,.68,m.linen,20,12,.6);}
 // Framed architectural prints above headboard; geometric art, not downloaded images.
 for(const xx of [2.3,3.8]){B(xx,3.08,.035,1.06,1.12,.065,m.walnutEdge);B(xx,3.08,.075,.97,1.03,.01,m.white);B(xx,3.08,.086,.75,.81,.01,m.art);b.surface((u,v)=>[xx-.32+u*.64,2.75+v*.52+.13*Math.sin(u*3.1),.1],9,3,m.art2);}
 // Task furniture retains the original footprints and support heights.
 for(const f of scene.furniture){b.instance=INSTANCE_IDS[f.id]||1;const {x,z,w,d,h,type}=f;if(type==='bed')continue;
 if(type==='desk'||type==='nightstand'){
  for(const a of [-1,1])for(const c of [-1,1])B(x+a*(w/2-.12),(h-.12)/2,z+c*(d/2-.12),.1,h-.12,.1,m.walnutEdge,.015);
  B(x,h-.045,z,w,.14,d,m.walnut,.025);
  if(type==='nightstand'){B(x,.54,z,w-.08,.45,d-.05,m.walnut,.02);B(x,.56,z+d/2+.018,.24,.027,.035,m.brass);lamp(b,m,x,h+.04,z-.16);}
  else{B(x-.18,h+.037,z,.98,.012,.73,m.chair);lamp(b,m,11,1.11,1.18);B(10.6,1.07,1.5,.85,.025,.82,m.darkMetal,.03);}
 } else if(type==='cupboard'){
  B(x,.10,z,w,.2,d,m.walnutEdge);B(x,2.58,z,w,.07,d,m.walnut);
  B(x-w/2+.04,1.38,z,.08,2.4,d,m.walnut);B(x+w/2-.04,1.38,z,.08,2.4,d,m.walnut);B(x,1.38,z-d/2+.04,w,.08+2.32,.08,m.walnut);
  for(const yy of [.4,1.43,2.11])B(x,yy,z,w-.09,.065,d-.03,m.walnut);
  for(let i=0;i<3;i++)B(x-.44+i*.43,.65,z-.05,.39,.31,.75,m.linen,.035);
  for(let i=0;i<2;i++)B(x-.34+i*.62,2.30,z-.1,.55,.31,.69,m.linenShade,.035);
 } else if(type==='shelf'){
  for(const dx of [-1,1])for(const dz of [-1,1])T([x+dx*(w/2-.08),.08,z+dz*(d/2-.08)],[x+dx*(w/2-.08),h+.04,z+dz*(d/2-.08)],.023,m.darkMetal);
  for(const yy of [.28,h+.075])B(x,yy,z,w,.065,d,m.walnut,.022);
  for(let i=0;i<3;i++)B(x-.6+i*.55,.48,z,.46,.29,.71,m.linenShade,.033);
 } else if(type==='cart'){
  for(const dx of [-1,1])for(const dz of [-1,1]){const xx=x+dx*.77,zz=z+dz*.43;T([xx,.16,zz],[xx,1.23,zz],.028,m.steel);b.tube([xx-.06,.11,zz],[xx+.06,.11,zz],.105,m.black,14);}
  for(const yy of [.32,.975])B(x,yy,z,w,.065,d,m.walnut,.02);
  for(const zz of [z-.51,z+.51])B(x,1.057,zz,w,.13,.035,m.darkMetal,.01);
  for(const xx of [x-.88,x+.88])B(xx,1.057,z,.035,.13,d,m.darkMetal,.01);
  for(let i=0;i<3;i++)B(x-.55+i*.54,.52,z,.46,.3,.72,m.linen,.035);
  T([x+.88,1.25,z-.45],[x+.88,1.25,z+.45],.03,m.steel);
 }
 }
 b.instance=1;
 // Tall mirror over the desk and two low-key accessories.
 B(9.8,2.46,.02,2.35,1.92,.07,m.darkMetal,.06);B(9.8,2.46,.064,2.23,1.8,.015,m.cityWindows,.05);
 plant(b,m,11.2,3.0);plant(b,m,.69,8.63);plant(b,m,11.2,8.9);
 if(scene.permission==='denied'){B(6.8,1.65,8.95,2.2,3.3,.16,m.walnut,.03);B(7.45,1.42,9.06,.27,.10,.08,m.brass);B(7.45,1.14,9.09,.27,.4,.03,m.black,.03);}
 // Brass picture rail, upholstered headboard detailing and wall-light washers.
 b.instance=1;
 for(const zz of [0.10,9.90])b.box(6,4.22,zz,11.9,.025,.025,m.brass);
 for(const xx of [0.09,11.91])b.box(xx,4.22,5,.025,.025,9.8,m.brass);
 // Slatted walnut accent behind the sleeping alcove; separate slim battens.
 for(let i=0;i<29;i++){let xx=.50+i*.145;b.box(xx,2.36,.095,.026,4.1,.07,m.walnut,.005);}
 for(const xx of [1.02,4.96]){b.cylinder(xx,2.04,.29,.065,.22,m.brass,18);b.sphere(xx,2.04,.30,.14,.34,.14,m.light,16,10);}
 // Quiet sofa/bench in the foreground with real legs; not an interactable task prop.
 b.box(2.95,.48,7.95,2.62,.29,.95,m.upholstery,.115);
 for(const xx of [1.85,4.05])for(const zz of [7.60,8.30])b.tube([xx,.03,zz],[xx,.38,zz],.035,m.brass,10);
 // Task zones stay authoritative; decorative objects are labeled architecture.
 return {builder:b,m};}
export function drawCup(b,m,x,y,z,color){const mat=color===true?m.cupCoral:m.cupBlue;b.lathe(x,y,z,[[.07,0],[.12,.025],[.146,.235],[.144,.263],[.125,.265],[.121,.232],[.085,.06]],mat,22);b.cylinder(x,y+.18,z,.117,.008,m.coffee,20);for(let i=0;i<14;i++){const a=-1.4+i/14*2.8,aa=-1.4+(i+1)/14*2.8;const p=t=>[x+.142+Math.cos(t)*.103,y+.146+Math.sin(t)*.096,z];b.tube(p(a),p(aa),.022,mat,6);}}
export function drawObject(b,m,o,x=o.x,y=o.y,z=o.z){
 b.instance=INSTANCE_IDS[o.id]||0;
 if(o.type==='cup')drawCup(b,m,x,y,z,o.id==='cup-b');
 else if(o.type==='towel'){for(let i=0;i<2;i++)b.box(x,y+.045+i*.083,z,.5,.082,.44,i?m.white:m.linenShade,.035);b.box(x,y+.171,z+.12,.41,.009,.024,m.linenShade);}
 else if(o.type==='chair'){
 for(const dx of [-1,1])for(const dz of [-1,1])b.tube([x+dx*.28,y+.03,z+dz*.28],[x+dx*.255,y+.56,z+dz*.255],.027,m.walnutEdge);
 b.box(x,y+.56,z,.73,.16,.73,m.chair,.06);b.box(x,y+.94,z-.305,.75,.64,.13,m.chair,.06);for(const dx of [-1,1])b.tube([x+dx*.28,y+.5,z-.27],[x+dx*.28,y+.86,z-.27],.025,m.walnutEdge);
 }else if(o.type==='book'){b.box(x,y+.06,z,.45,.12,.35,m.book,.007);b.box(x,y+.055,z+.012,.42,.072,.347,m.pages);}
 else if(o.type==='suitcase'){b.box(x,y+.35,z,.7,.67,.42,m.suitcase,.055);for(let i=0;i<6;i++)b.box(x-.26+i*.103,y+.35,z+.216,.024,.53,.011,m.darkMetal,.004);b.tube([x-.12,y+.71,z],[x+.12,y+.71,z],.035,m.black);}
}
export function dynamicRoom(b,m,game,paint){const s=game.scene;b.instance=1;
 const contact=(x,z,rx,rz)=>{const y=x>1.4&&x<6.85&&z>.85&&z<7?.062:.025;const a=[x-rx,y,z-rz],q=[x+rx,y,z-rz],c=[x+rx,y,z+rz],d=[x-rx,y,z+rz],n=Array(3).fill([0,1,0]);b.tri(a,c,q,m.softShadow,n,[[-1,-1],[1,1],[1,-1]]);b.tri(a,d,c,m.softShadow,n,[[-1,-1],[-1,1],[1,1]]);};
 contact(game.robot.x,game.robot.z,.72,.63);for(const o of s.objects)if(o.type==='chair'&&!o.held)contact(o.x,o.z,.55,.52);
 const f=s.furniture.find(f=>f.type==='cupboard');const {x,z,w,d}=f;
 // Hinged doors animate visually; their sweep is not a new collision solver.
 b.instance=INSTANCE_IDS.cupboard;for(const side of [-1,1]){const angle=s.cupboardOpen?side*1.25:0,hinge=[x+side*w*.5,1.39,z+d*.5+.025],center=add(hinge,rotateY([-side*w*.24,0,0],angle));b.box(...center,w*.485,2.4,.065,m.walnut,.015,angle);const h=add(hinge,rotateY([-side*w*.405,0,.054],angle));b.tube([h[0],1.27,h[2]],[h[0],1.54,h[2]],.013,m.brass);}
 for(const o of s.objects)if(!o.held&&(!o.container||s.cupboardOpen))drawObject(b,m,o);
 const robotStart=b.v.length;b.instance=INSTANCE_IDS.robot;const bot=game.robot,bx=bot.x,bz=bot.z;
 // Full-size-looking mobile manipulator: low wheeled base, sensor head and two arms.
 b.box(bx,.31,bz,.88,.42,.77,m.shell,.105);b.box(bx,.145,bz,.87,.16,.77,m.black,.06);
 for(const xx of [-.435,.435])for(const zz of [-.22,.22]){b.tube([bx+xx-.065,.14,bz+zz],[bx+xx+.065,.14,bz+zz],.137,m.black,18);b.tube([bx+xx-.07,.14,bz+zz],[bx+xx+.07,.14,bz+zz],.07,m.steel,14);}
 b.box(bx,.66,bz,.30,.45,.26,m.steel,.025);b.box(bx,1.0,bz,.65,.47,.40,m.shell,.065);
 b.box(bx,1.02,bz+.207,.35,.14,.015,m.darkMetal,.015);b.cylinder(bx,1.32,bz,.095,.2,m.darkMetal,18);
 b.box(bx,1.49,bz,.58,.26,.28,m.shell,.055);b.box(bx,1.49,bz+.145,.49,.13,.025,m.darkMetal,.025);
 for(const dx of [-.16,.16])b.sphere(bx+dx,1.49,bz+.166,.070,.070,.025,m.glass,10,6);b.box(bx+.22,1.49,bz+.167,.009,.009,.008,m.led,.002);
 for(const side of [-1,1]){const shoulder=[bx+side*.365,1.12,bz],idle=[bx+side*.53,.66,bz+.20];let target=idle;
 if(bot.reachTarget&&side===1){const t=bot.reachTarget,a=bot.arm,local=rotateY([t.x-bx,t.y,t.z-bz],-bot.yaw);target=[idle[0]+(bx+local[0]-idle[0])*a,idle[1]+(t.y+.13-idle[1])*a,idle[2]+(bz+local[2]-idle[2])*a];}
 else if(bot.held)target=[bx+side*.26,.99,bz+.49];
 let delta=sub(target,shoulder);if(Math.hypot(...delta)>.98)target=add(shoulder,scale(normalize(delta),.98));
 const elbow=[(shoulder[0]+target[0])*.5+side*.11,(shoulder[1]+target[1])*.5+.035,(shoulder[2]+target[2])*.5-.12];
 b.sphere(...shoulder,.21,.21,.21,m.darkMetal,12,8);b.tube(shoulder,elbow,.067,m.shell,12);b.sphere(...elbow,.17,.17,.17,m.steel,12,8);b.tube(elbow,target,.053,m.shell,12);b.sphere(...target,.15,.15,.15,m.darkMetal,12,8);
 for(const sign of [-1,1])b.box(target[0]+sign*.069,target[1]-.06,target[2],.025,.11,.057,m.steel,.009);
 }
 if(bot.held){const o=game.entity(bot.held);drawObject(b,m,o,bx,1.01,bz+.49);}
 for(let i=robotStart;i<b.v.length;i+=9){const q=rotateY([b.v[i]-bx,b.v[i+1],b.v[i+2]-bz],bot.yaw),n=rotateY(b.v.slice(i+3,i+6),bot.yaw);b.v[i]=q[0]+bx;b.v[i+1]=q[1];b.v[i+2]=q[2]+bz;b.v[i+3]=n[0];b.v[i+4]=n[1];b.v[i+5]=n[2];}
}
