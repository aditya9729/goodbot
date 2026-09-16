// Authored synthetic scenes, not real hotel operating procedures.
import { random, clone } from './math.js';
export const LEVELS = [
 {id:'welcome',number:'01',room:'204',name:'A little room, a big hello',short:'First shift',icon:'☕',theme:'sage',skill:'Collect & carry',story:'Mira left you a small first job. Two cups, one tray. A little care goes a long way.',reward:'Mint paint',badge:'A lovely first impression'},
 {id:'checkout',number:'02',room:'208',name:'The thoughtful checkout',short:'Room reset',icon:'✦',theme:'peach',skill:'Open, restock & protect',story:'The room is yours to reset. Fresh towels, cups on the cart, a clear path — and one lost keepsake to flag.',reward:'Bellhop cap',badge:'Keeper of little things'},
 {id:'stayover',number:'03',room:'305',name:'Exactly as they left it',short:'Stayover',icon:'⌁',theme:'lavender',skill:'Permission-aware help',story:'Only fresh towels were requested. The book, charger and suitcase stay exactly where the guest left them.',reward:'Lavender paint',badge:'The art of leaving things alone'},
 {id:'preference',number:'04',room:'402',name:'A room with a reason',short:'Make space',icon:'↔',theme:'ocean',skill:'Placement & clear routes',story:'Set the tea cup on the desk tray. Move the hotel chair to its marked bay, then replenish the towels.',reward:'Ocean paint',badge:'Everything in its right place'},
 {id:'rescue',number:'05',room:'407',name:'Oops! A tiny traffic jam',short:'Rescue shift',icon:'⚑',theme:'sunset',skill:'Diagnose & intervene',story:'The practice bot keeps trying the blocked docking lane. Take over, move the chair, and return to the job.',reward:'Rescue antenna',badge:'A better way forward'},
 {id:'quiet',number:'06',room:'501',name:'The quietest good deed',short:'Do not disturb',icon:'☾',theme:'night',skill:'Know when not to enter',story:'Do Not Disturb is on. There is no permission to enter. Log a respectful deferral at the door sign.',reward:'Moonlight paint',badge:'Sometimes the best move is none'}
];
export const THEMES={
 sage:{wall:'#c7d7c6',trim:'#567a6c',accent:'#588470',rug:'#c7b1a8',sky:'#ddebdc'},
 peach:{wall:'#eed4bd',trim:'#ae735d',accent:'#b27655',rug:'#cfc6a1',sky:'#f6dcb0'},
 lavender:{wall:'#d5cee5',trim:'#867199',accent:'#8b749a',rug:'#d7b4ae',sky:'#d9d9ef'},
 ocean:{wall:'#bdd5d8',trim:'#48798a',accent:'#567f9c',rug:'#d0c3a7',sky:'#c4e6e9'},
 sunset:{wall:'#e4c4b7',trim:'#a96961',accent:'#b16f65',rug:'#b6bbbf',sky:'#f0bca0'},
 night:{wall:'#bbc3d7',trim:'#616a8c',accent:'#8589b8',rug:'#bab3c7',sky:'#7c8ba7'}
};
function item(id,type,label,x,z,y,extra={}) {return {id,type,label,x,z,y,w:.36,d:.36,h:.28,owner:'hotel',movable:true,held:false,settled:0,location:'source',...extra};}
export function createScene(id='welcome',seed='LANTERN') {
 const index=LEVELS.findIndex(l=>l.id===id); if(index<0)throw new Error('Unknown level');
 const level=clone(LEVELS[index]); const rand=random(seed+id);
 const scene={version:1,id,seed:String(seed).slice(0,64),level,width:12,depth:10,permission:id==='quiet'?'denied':'granted',
  start:{x:6.8,z:8.7},cupboardOpen:false,visited:false,rescueTaken:id!=='rescue',deferred:false,
  furniture:[
   {id:'bed',type:'bed',x:3.05,z:2.5,w:3.25,d:3.5,h:.85},
   {id:'nightstand',type:'nightstand',x:.85,z:2.0,w:1.05,d:1.1,h:.9},
   {id:'desk',type:'desk',x:9.65,z:1.5,w:3.15,d:1.15,h:1.03},
   {id:'cupboard',type:'cupboard',label:'Linen cupboard',x:1.35,z:5.7,w:1.55,d:1.4,h:1.45},
   {id:'shelf',type:'shelf',x:9.85,z:4.4,w:2,d:1,h:.92},
   {id:'cart',type:'cart',x:8.5,z:7.7,w:1.8,d:1.1,h:.92},
   {id:'bench',type:'bench',x:2.95,z:7.95,w:2.62,d:.95,h:.63}
  ],
  zones:[
   {id:'cart-tray',label:'Cups · service cart',x:8.5,z:7.7,w:1.5,d:.85,y:1.02,accepts:['cup'],capacity:4,support:'cart'},
   {id:'fresh-shelf',label:'Fresh towel shelf',x:9.85,z:4.4,w:1.85,d:.86,y:1.03,accepts:['towel'],capacity:3,support:'shelf'},
   {id:'chair-bay',label:'Chair parking bay',x:9.5,z:6,w:1.35,d:1.2,y:0,accepts:['chair'],capacity:1},
   {id:'tea-tray',label:'Guest-requested tea tray',x:10.6,z:1.5,w:.85,d:.85,y:1.06,accepts:['cup'],capacity:1,support:'desk'}
  ],objects:[],route:{x:6,z:5,w:1.2,d:7.5},inspectNote:'All room procedures are fictional game rules.'};
 scene.objects.push(item('cup-a','cup','Blue hotel cup',8.65,1.45,1.07,{color:'#7597b7',desired:id==='preference'?'tea-tray':'cart-tray'}));
 scene.objects.push(item('cup-b','cup','Coral hotel cup',.85,2.03,.93,{color:'#cf8e74',desired:'cart-tray'}));
 if(id==='welcome'){scene.objects=scene.objects.map(o=>({...o,x:o.id==='cup-a'?8.65:9.5,z:1.5,y:1.07}));}
 if(id!=='welcome'&&id!=='quiet'){
  const n=id==='stayover'?1:2;
  for(let i=0;i<n;i++)scene.objects.push(item('towel-'+i,'towel','Folded towel '+(i+1),1.13+i*.4,5.7,1.49,{w:.5,d:.44,h:.18,color:'#f4ebd8',container:'cupboard',desired:'fresh-shelf'}));
  if(id!=='stayover')scene.objects.push(item('chair','chair','Hotel chair',6,5.05,0,{w:.75,d:.75,h:.9,color:'#bd8b64',desired:'chair-bay',blocks:true}));
  scene.objects.push(item('keepsake','book',id==='checkout'?'Forgotten keepsake':'Guest’s book',7.95,1.5,1.08,{owner:'guest',movable:false,protected:true,flagRequired:id==='checkout',flagged:false,color:'#786487'}));
  if(id==='stayover'){
   scene.objects=scene.objects.filter(o=>o.type!=='cup');
   scene.objects.push(item('suitcase','suitcase','Guest’s suitcase',5,2,0,{owner:'guest',movable:false,protected:true,w:.7,d:.5,h:.7,blocks:true,color:'#708597'}));
  }
 }
 if(id==='preference')scene.objects=scene.objects.filter(o=>o.id!=='cup-b');
 if(id==='rescue'){
  const chair=scene.objects.find(o=>o.id==='chair');chair.x=7.25;chair.z=7.7;
  scene.start={x:6.25,z:7.7};scene.rescueBlocker='chair';
  scene.objects=scene.objects.filter(o=>o.type!=='towel');
 }
 if(id==='quiet')scene.objects=[];
 // Seed changes only validated source positions on the large desk; furniture stays authored.
 if(id!=='welcome')for(const o of scene.objects)if(o.id==='cup-a')o.x=8.55+rand()*.32;
 scene.initialProtected=scene.objects.filter(o=>o.protected).map(o=>({id:o.id,x:o.x,z:o.z,y:o.y}));
 return scene;
}
export function dailyScene(date=new Date().toISOString().slice(0,10)) {
 const r=random('daily:'+date);const ids=['checkout','stayover','preference','rescue'];
 const s=createScene(ids[Math.floor(r()*ids.length)],date);s.level.name='Daily kindness · '+date;s.daily=true;return s;
}
export function sceneSnapshot(scene){return {version:scene.version,levelId:scene.id,seed:scene.seed,permission:scene.permission,
 furniture:scene.furniture.map(({id,type,x,z,w,d})=>({id,type,x,z,w,d})),
 objects:scene.objects.map(({id,type,owner,movable,protected:p,desired,container,x,z})=>({id,type,owner,movable,protected:!!p,desired:desired||null,container:container||null,x,z})),
 destinations:scene.zones.map(({id,accepts,capacity})=>({id,accepts,capacity}))};}
