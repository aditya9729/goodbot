/** Runtime owner for teaching drafts and interruptible policy rollouts. */
import { Apprentice, decisionExample } from './apprentice.js';
export class ApprenticeSession {
 constructor({model=new Apprentice(),onChange=()=>{}}={}){
  this.model=model;this.onChange=onChange;this.game=null;this.mode='idle';this.consent=false;
  this.draft=null;this.prediction=null;this.timer=0;this.stepOnly=false;this.executing=false;this.correction=null;
  this.attempt=null;this.attempts=[];this.attemptSerial=0;this.message='A little experience goes a long way.';this.lastTaught=null;
 }
 attach(game){
  this.stop('Room changed');this.game=game;this.correction=null;this.lastTaught=null;
  for(const method of ['command','finish','travel','direct','directRobot','undo']){
   const original=game[method].bind(game);
   game[method]=(...args)=>{
    if(!game.scene.learningSandbox)return original(...args);
    if(this.executing)return original(...args);
    if(this.mode==='training')return false;
    if(['preview','running','help'].includes(this.mode))this.takeOver();
    if(method==='undo'){
     const undoTarget=game.lastSnapshot;const result=original(...args);this.draft=null;
     // Only remove the example associated with the exact execution being undone.
     if(result&&this.lastTaught&&this.lastTaught.scene===game.scene.seed&&this.lastTaught.undoSnapshot===undoTarget&&this.model.examples.at(-1)===this.lastTaught.example){this.model.removeLast();this.lastTaught=null;}
     this.changed();return result;
    }
    if(['travel','direct','directRobot'].includes(method)){this.draft=null;return original(...args);}
    // A new command cancels the previous teaching draft, even when rejected. It
    // cannot retroactively label a different eventual execution.
    let draft=null;
    if(this.mode==='teaching'&&this.consent){try{draft=decisionExample(game,method==='finish'?'finish':args[0],{correctionOf:this.correction});}catch{/* outside the narrow learning action space */}}
    const result=original(...args);
    if(result&&draft){
     if(method==='finish'){draft.completedAt=game.time;this.commit(draft);this.draft=null;this.consent=false;this.mode='idle';}else this.draft={example:draft,id:args[0],historyStart:game.history.length};
    }else if(!result&&draft){this.message='That action did not execute. It was not added as a successful demonstration.';}
    this.changed();return result;
   };
  }
  return game;
 }
 changed(){this.onChange(this);}
 beginTeaching(consent){
  if(!consent)throw new Error('Fresh local-teaching consent is required');if(this.model.training)throw new Error('Wait for the current fit to finish');
  if(!this.game?.scene.learningSandbox||this.game.status!=='playing')throw new Error('Open a live apprentice lesson first');
  this.takeOver(false);this.mode='teaching';this.consent=true;this.message='Show me a routine. Only completed decisions enter my notebook.';this.changed();
 }
 endTeaching(){this.draft=null;this.consent=false;if(this.mode==='teaching')this.mode='idle';this.message='Teaching stopped. Your notebook stays in this tab.';this.changed();}
 commit(e){
  try{this.model.add(e);this.lastTaught={scene:this.game.scene.seed,example:this.model.examples.at(-1),undoSnapshot:this.game.lastSnapshot};this.correction=null;this.message=`Noted: ${e.chosen.kind} ${e.chosen.type==='none'?'':e.chosen.type}. ${this.model.examples.length} completed decisions.`;}
  catch(error){this.message=error.message;this.consent=false;this.mode='idle';}this.changed();
 }
 async fit(){
  if(this.game?.pending||this.game?.path.length)throw new Error('Let this interaction finish before fitting');
  this.endTeaching();this.mode='training';this.message='Fitting a small local action model…';this.changed();
  try{const result=await this.model.train({onProgress:p=>{this.progress=p;this.changed();}});this.mode='idle';this.message=`Model ${this.model.version} ready. ${result.trainingMatches}/${result.decisions} teaching choices matched — not a test score.`;return result;}
  finally{if(this.mode==='training')this.mode='idle';this.changed();}
 }
 startRun({single=false}={}){
  const game=this.game;if(['preview','running','training'].includes(this.mode))return false;if(!game?.scene.learningSandbox||game.status!=='playing'||game.pending||game.path.length)return false;
  this.endTeaching();this.stepOnly=single;this.mode='preview';this.timer=.9;
  this.attempt={id:'attempt-'+(++this.attemptSerial),modelVersion:this.model.version,context:game.scene.lesson.context,seed:game.scene.seed,
   trainedOnThisLayout:this.model.examples.some(e=>e.roomSeed===game.scene.seed),decisions:[],outcome:null,interventions:0,completed:false};
  this.next();return true;
 }
 next(){
  this.prediction=this.model.predict(this.game);this.timer=.95;
  if(this.prediction.ask){this.mode='help';this.message=this.prediction.reason;this.completeAttempt('asked_for_help');}
  else{this.mode='preview';this.message='My next choice: '+this.describe(this.prediction.action)+'. Take over to change it.';}
  this.changed();
 }
 describe(a){if(!a)return 'ask for help';if(a.kind==='finish')return 'check whether the room is ready';const label=this.game.entity(a.id)?.label||a.id;return a.kind+' · '+label;}
 execute(){
  const p=this.prediction;if(!p||p.ask)return;
  if(this.attempt.decisions.length>=32){this.mode='help';this.message='I stopped after 32 choices. Please help me avoid a loop.';this.completeAttempt('action_limit');this.changed();return;}
  // Re-evaluate legality and score against current state before issuing intent.
  const fresh=this.model.predict(this.game);
  if(fresh.ask||fresh.action.id!==p.action.id){this.next();return;}
  this.executing=true;this.game.actionActor='apprentice:v'+this.model.version;
  let ok=false;try{ok=p.action.kind==='finish'?this.game.finish():this.game.command(p.action.id);}finally{this.executing=false;this.game.actionActor=null;}
  this.attempt.decisions.push({kind:p.action.kind,id:p.action.id,accepted:!!ok,time:this.game.time,preference:p.preference,preferenceIsNotSuccessProbability:true});
  if(!ok){this.mode='help';this.message='The action could not execute or the room was not ready. Please show me what to change.';this.completeAttempt('execution_rejected');}
  else if(this.game.status==='won'){this.mode='done';this.message='We did it. I chose the routine; the built-in controller handled the motions.';this.completeAttempt('completed');}
  else{this.mode='running';this.timer=0;this.message='Trying: '+this.describe(p.action);}
  this.changed();
 }
 completeAttempt(outcome){if(!this.attempt)return;this.attempt.outcome ||= outcome;this.attempt.completed=this.attempt.outcome==='completed';const index=this.attempts.findIndex(a=>a.id===this.attempt.id);if(index<0)this.attempts.push(structuredClone(this.attempt));else this.attempts[index]=structuredClone(this.attempt);if(this.attempts.length>50)this.attempts.shift();}
 takeOver(notify=true){
  if(['preview','running','help'].includes(this.mode)){
   this.correction=this.attempt?`${this.attempt.id}:v${this.attempt.modelVersion}`:null;
   if(this.attempt)this.attempt.interventions++;
   this.completeAttempt('interrupted');this.game?.cancel();this.mode='idle';this.prediction=null;
   if(notify)this.message='Your controls now. Start Teach to save a correction; taking over alone does not record it.';
  }
  this.changed();
 }
 stop(reason='Stopped'){
  if(['preview','running','help'].includes(this.mode))this.takeOver(false);
  this.draft=null;this.consent=false;this.prediction=null;if(this.mode!=='training')this.mode='idle';this.message=reason;this.changed();
 }
 tick(dt){
  const game=this.game;if(!game?.scene.learningSandbox)return;
  if(this.draft){
   const d=this.draft,execution=game.history.slice(d.historyStart).find(h=>h.entity===d.id&&h.kind===d.example.chosen.kind);
   if(execution&&this.mode==='teaching'&&this.consent){d.example.completedAt=game.time;this.commit(d.example);this.draft=null;}
   else if(!game.pending&&!game.path.length){this.draft=null;}
  }
  if(this.mode==='preview'){this.timer-=dt;if(this.timer<=0)this.execute();}
  else if(this.mode==='running'&&!game.pending&&!game.path.length){
   this.timer+=dt;if(this.timer>.65){
    if(this.stepOnly){this.mode='idle';this.message='One learned choice completed. Keep going, or show me a correction.';this.completeAttempt('single_step');this.changed();}
    else this.next();
   }
  }
 }
 summary(){return {mode:this.mode,consent:this.consent,modelVersion:this.model.version,examples:this.model.examples.length,dirty:this.model.dirty,
  message:this.message,context:this.game?.scene.lesson?.context||null,seed:this.game?.scene.seed||null,prediction:this.prediction?.action||null,
  attempts:this.attempts.map(a=>({...a})),fit:this.model.fitSummary};}
}
