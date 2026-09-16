/** Authored teaching tasks. Goals are for the human/evaluator, never policy input. */
import { createScene } from './scene.js';
import { random } from './math.js';
export const LESSONS = Object.freeze([
 {id:'collect', name:'The cup round', number:'01', context:'collect',
  brief:'Collect the two hotel cups onto the service cart. Show Nori your routine, then let it try a rearranged room.',
  skill:'Teach a routine', accent:'#90bda5'},
 {id:'tea', name:'Tea for two', number:'02', context:'tea',
  brief:'Set both hotel cups on the desk tea tray, not the collection cart. A new request needs its own example.',
  skill:'Teach context', accent:'#d4b884'},
 {id:'linen', name:'Fresh beginnings', number:'03', context:'linen',
  brief:'Open the cupboard and put both folded towels on the fresh shelf. The cart is allowed but is not the requested final setup.',
  skill:'Teach a prerequisite', accent:'#acb1d8'}
]);
export function createLessonScene(id='collect', seed='lesson-1') {
 const lesson=LESSONS.find(l=>l.id===id);if(!lesson)throw new Error('Unknown apprentice lesson');
 const scene=createScene(id==='linen'?'checkout':'welcome',seed),r=random('apprentice:'+seed);
 scene.learningSandbox=true;scene.lesson={...lesson};scene.seed=String(seed).slice(0,64);
 scene.level={...scene.level, name:lesson.name, short:'Nori · '+lesson.skill,number:lesson.number,
  room:id==='collect'?'201':id==='tea'?'202':'203',story:lesson.brief,badge:'You taught a little independence',theme:id==='tea'?'peach':id==='linen'?'lavender':'sage'};
 scene.objects=scene.objects.filter(o=>o.type===(id==='linen'?'towel':'cup'));
 // Move the actual cart and its attached destination together. These remain authored
 // feasible layout variations, not a claim of arbitrary unseen-room generalization.
 const cart=scene.furniture.find(f=>f.id==='cart');cart.x=7.6+r()*1.2;cart.z=7.2+r()*.6;
 Object.assign(scene.zones.find(z=>z.id==='cart-tray'),{x:cart.x,z:cart.z});
 const tea=scene.zones.find(z=>z.id==='tea-tray');tea.x=10.15;tea.w=1.55;tea.capacity=2;
 scene.zones.push({id:'linen-cart',label:'Linen staging · cart',x:cart.x,z:cart.z,w:1.55,d:.9,y:1.02,accepts:['towel'],capacity:2,support:'cart'});
 const sourceXs=[8.40+r()*.25,9.20+r()*.3];if(r()>.5)sourceXs.reverse();
 scene.objects.forEach((o,i)=>{o.desired=id==='collect'?'cart-tray':id==='tea'?'tea-tray':'fresh-shelf';
  if(o.type==='cup'){o.x=sourceXs[i];o.z=1.40+r()*.16;o.y=1.07;o.support='desk';}
 });
 // A protected distractor exists in every lesson; guardian protection is built in,
 // not a learned moral decision or a model-success claim.
 scene.objects.push({id:'keepsake',type:'book',label:'Guest notebook · leave alone',x:7.95,z:1.5,y:1.08,w:.36,d:.36,h:.28,
  owner:'guest',movable:false,protected:true,held:false,settled:0,location:'source',color:'#796782'});
 scene.initialProtected=scene.objects.filter(o=>o.protected).map(o=>({id:o.id,x:o.x,z:o.z,y:o.y}));
 return scene;
}
