// Optional server-only provider adapter. Never import this file into the browser.
import { createScene, sceneSnapshot } from '../public/src/scene.js';
import { readScene, compilePlan } from '../public/src/director.js';
export function buildRequest(scene,model){const ids=readScene(scene).map(t=>t.id);return {
 model,store:false,max_output_tokens:1200,
 instructions:'You are the story designer for a cozy, fictional hotel robot puzzle. You have no tools. Return a friendly short title, a short mission briefing, and a permutation of ALL authorized task IDs exactly once. The compiler, not you, owns permissions and prerequisites. Never invent objects, destinations, new goals, hotel permissions or instructions to move guest belongings. Do not mention cameras, APIs or keys. This is a game, not professional hotel training. The scene is authored symbolic data, not real guest data.',
 input:JSON.stringify({scene:sceneSnapshot(scene),authorizedTasks:readScene(scene)}),
 text:{format:{type:'json_schema',name:'goodbot_scene_mission',strict:true,schema:{type:'object',additionalProperties:false,properties:{title:{type:'string'},brief:{type:'string'},taskIds:{type:'array',items:{type:'string',enum:ids}}},required:['title','brief','taskIds']}}}
};}
export async function generateProposal({levelId,seed,key,model,fetcher=fetch}){
 if(!key||!model)throw new Error('Server AI configuration is incomplete.');
 const scene=createScene(levelId,seed);
 const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(buildRequest(scene,model)),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error('AI provider rejected the request. Check the server model, permissions or budget.');
 const data=await response.json();if(data.status!=='completed')throw new Error('The provider did not finish a valid proposal.');
 const content=(data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]);
 if(content.some(x=>x.type==='refusal'))throw new Error('The provider declined to generate a task proposal.');
 const raw=content.filter(x=>x.type==='output_text').map(x=>x.text).join('');
 if(raw.length>8000)throw new Error('Oversized AI proposal rejected.');
 let proposal;try{proposal=JSON.parse(raw);}catch{throw new Error('The provider returned invalid JSON.');}
 compilePlan(scene,proposal);
 return proposal;
}
