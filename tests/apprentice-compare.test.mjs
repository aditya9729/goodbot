import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/src/game.js';
import { createLessonScene } from '../public/src/lessons.js';
import { Apprentice, decisionExample, MAX_SNAPSHOTS, observeForPolicy } from '../public/src/apprentice.js';
import { compareVersions, replayVersion } from '../public/src/apprentice-compare.js';

const settle=g=>{for(let i=0;i<2400;i++){g.update(.05);if(!g.pending&&!g.path.length){for(let k=0;k<15;k++)g.update(.05);return;}}throw new Error('no settle');};
function teach(model,context,seq,seed){
 const g=new Game(createLessonScene(context,seed));
 for(const id of seq){const e=decisionExample(g,id);
  assert.ok(id==='finish'?g.finish():g.command(id),g.lastMessage);
  settle(g);e.completedAt=g.time;model.add(e);}
}
const CUPS=['cup-a','cart-tray','cup-b','cart-tray','finish'];
const TEA=['cup-a','tea-tray','cup-b','tea-tray','finish'];
async function taughtBoth(){
 const m=new Apprentice();
 teach(m,'collect',CUPS,'teach-cups');await m.train();
 teach(m,'tea',TEA,'teach-tea');await m.train();
 return m;
}

test('each fit is retained as a snapshot, bounded and in order',async()=>{
 const m=new Apprentice();
 teach(m,'collect',CUPS,'s1');await m.train();
 assert.deepEqual(m.snapshots.map(s=>s.version),[1]);
 teach(m,'tea',TEA,'s2');await m.train();
 assert.deepEqual(m.snapshots.map(s=>s.version),[1,2]);
 // A snapshot records the coverage that version actually had.
 assert.ok(m.snapshots[0].coverage.every(c=>c.startsWith('collect|')));
 assert.ok(m.snapshots[1].coverage.some(c=>c.startsWith('tea|')));
 assert.ok(m.snapshots.length<=MAX_SNAPSHOTS);
});

test('teaching a second routine visibly changes an unseen room of that kind',async()=>{
 // The product claim: the learner does something different BECAUSE of teaching.
 const m=await taughtBoth();
 const r=compareVersions(m,{context:'tea',seed:'unseen-tea'});
 assert.equal(r.changed,true,'a real decision changed');
 assert.equal(r.before.decisions[0].ask,true,'the earlier fit asked for help');
 assert.equal(r.after.decisions[0].ask,false,'the later fit acted');
 assert.equal(r.completedBefore,false);
 assert.equal(r.completedAfter,true,'and finished the room');
 assert.equal(r.firstChange.step,0);
 assert.ok(r.firstChange.after.evidence,'the change is linked to a demonstration');
});

test('an unchanged routine reports no change rather than inventing one',async()=>{
 // Teaching tea must not silently rewrite the cup round, and the comparison
 // must be willing to say "nothing changed".
 const m=await taughtBoth();
 const r=compareVersions(m,{context:'collect',seed:'unseen-collect'});
 assert.equal(r.changed,false);
 assert.equal(r.firstChange,null);
 assert.equal(r.completedBefore,true);
 assert.equal(r.completedAfter,true,'the earlier routine still works');
});

test('a replay never touches the live game and is reproducible',async()=>{
 const m=await taughtBoth();
 const live=new Game(createLessonScene('tea','live-scene'));
 const before=JSON.stringify(live.scene.objects.map(o=>[o.id,o.x,o.z,o.location]));
 const a=replayVersion(m,m.snapshots[1],{context:'tea',seed:'unseen-tea'});
 const b=replayVersion(m,m.snapshots[1],{context:'tea',seed:'unseen-tea'});
 assert.deepEqual(a.decisions.map(d=>d.id),b.decisions.map(d=>d.id),'same seed, same decisions');
 assert.equal(JSON.stringify(live.scene.objects.map(o=>[o.id,o.x,o.z,o.location])),before,
  'the player’s own room is untouched');
});

test('replaying an old version reads no goal, plan or completion information',async()=>{
 // The firewall must hold on the comparison path too, not only live play.
 const m=await taughtBoth();
 const g=new Game(createLessonScene('tea','leak-check'));
 for(const o of g.scene.objects)Object.defineProperty(o,'desired',{get(){throw new Error('goal leak');}});
 Object.defineProperty(g,'plan',{get(){throw new Error('plan leak');}});
 const p=m.predictAs(g,m.snapshots[0]);
 assert.ok('ask' in p);
 const text=JSON.stringify(observeForPolicy(g));
 for(const term of ['desired','taskDone','plan','score','completed'])assert.ok(!text.includes('"'+term+'"'));
});

test('predictAs on the newest snapshot agrees with ordinary predict',async()=>{
 // The snapshot path must be the same ranker, not a second implementation.
 const m=await taughtBoth();
 const g=new Game(createLessonScene('tea','agree-check'));
 const live=m.predict(g),snap=m.predictAs(g,m.snapshots[m.snapshots.length-1]);
 assert.equal(live.ask,snap.ask);
 assert.deepEqual(live.action,snap.action);
 assert.equal(live.preference,snap.preference);
});

test('comparison refuses without two fits, and refuses a backwards pair',async()=>{
 const m=new Apprentice();
 assert.throws(()=>compareVersions(m,{context:'tea',seed:'x'}),/two fitted versions/i);
 teach(m,'collect',CUPS,'only');await m.train();
 assert.throws(()=>compareVersions(m,{context:'collect',seed:'x'}),/two fitted versions/i);
 const both=await taughtBoth();
 assert.throws(()=>compareVersions(both,{context:'tea',seed:'x',from:2,to:1}),/older fit/i);
});
