/** Reproducible narrow authored-layout evaluation, not human playtesting. */
import fs from 'node:fs';
import { Game } from '../public/src/game.js';
import { createLessonScene } from '../public/src/lessons.js';
import { Apprentice, decisionExample } from '../public/src/apprentice.js';
const settle=g=>{for(let i=0;i<2500;i++){g.update(.05);if(!g.pending&&!g.path.length){for(let k=0;k<15;k++)g.update(.05);return;}}throw new Error('Controller did not settle');};
function run(model,context,seed){
 const game=new Game(createLessonScene(context,seed)),trace=[];let stop='step_limit';
 for(let i=0;i<32&&game.status==='playing';i++){
  const p=model.predict(game);if(p.ask){stop='asked_for_help';break;}
  const accepted=p.action.kind==='finish'?game.finish():game.command(p.action.id);
  trace.push({kind:p.action.kind,id:p.action.id,accepted});if(!accepted){stop='execution_rejected';break;}settle(game);
 }
 return {context,seed,success:game.status==='won',stop:game.status==='won'?'completed':stop,trace,simulationSeconds:game.time};
}
function teach(model,context){
 const g=new Game(createLessonScene(context,'reference-teach-'+context)),dst=context==='tea'?'tea-tray':'cart-tray';
 const sequence=context==='linen'?['cupboard','towel-0','fresh-shelf','towel-1','fresh-shelf','finish']:['cup-a',dst,'cup-b',dst,'finish'];
 for(const id of sequence){const e=decisionExample(g,id);if(!(id==='finish'?g.finish():g.command(id)))throw new Error('Reference teaching failed');settle(g);e.completedAt=g.time;model.add(e);}
}
const model=new Apprentice(),contexts=['collect','tea','linen'],out=process.argv[2]||'evidence/learner-benchmark.json';
const cases=contexts.flatMap(context=>Array.from({length:20},(_,i)=>({context,seed:'evaluation-only-'+i})));
const before=cases.map(c=>run(model,c.context,c.seed));for(const c of contexts)teach(model,c);await model.train();const after=cases.map(c=>run(model,c.context,c.seed));
const data={scope:'60 authored layout variants. Built-in navigation/grasp and structured state. No real robot or human enjoyment evaluation.',
 teacher:'Explicit reference-script high-level demonstrations through ordinary Game commands, NOT human-recorded episodes.',
 fit:model.fitSummary,before:{completed:before.filter(x=>x.success).length,asked:before.filter(x=>x.stop==='asked_for_help').length,cases:before},
 after:{completed:after.filter(x=>x.success).length,asked:after.filter(x=>x.stop==='asked_for_help').length,cases:after},
 caveat:'The empty model deliberately abstains. The before/after comparison is not a comparison against a capable baseline. Layouts vary cart/cup positions within the same authored geometry; semantic tasks were taught.'};
fs.mkdirSync(out.slice(0,out.lastIndexOf('/'))||'.',{recursive:true});fs.writeFileSync(out,JSON.stringify(data,null,2));console.log(JSON.stringify({teacher:data.teacher,fit:data.fit,before:data.before.completed,after:data.after.completed,cases:cases.length}));
