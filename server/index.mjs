import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { generateProposal } from './ai.mjs';
import { LEVELS } from '../public/src/scene.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
export function createServer({env=process.env,fetcher=fetch}={}){
 const csrf=crypto.randomBytes(32).toString('hex');let busy=false,calls=0,lastCall=0;
 const maxCalls=Math.max(1,Math.min(100,Number(env.GOODBOT_AI_MAX_CALLS)||10));
 const aiEnabled=env.GOODBOT_AI_ENABLED==='1'&&!!env.OPENAI_API_KEY&&!!env.OPENAI_MODEL;
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','microphone=(), camera=(self)');
  const port=server.address()?.port;const allowedHosts=new Set([`localhost:${port}`,`127.0.0.1:${port}`]);
  if(!allowedHosts.has(req.headers.host))return json(res,403,{error:'Loopback host required.'});
  let name;try{name=decodeURIComponent(new URL(req.url,'http://'+req.headers.host).pathname);}catch{return json(res,400,{error:'Invalid path.'});}
  if(name.startsWith('/goodbot/'))name=name.slice('/goodbot'.length);
  if(name==='/api/config'&&req.method==='GET')return json(res,200,{aiEnabled,csrf:aiEnabled?csrf:null,maxCalls});
  if(name==='/api/tasks'){
   if(req.method!=='POST')return json(res,405,{error:'POST required.'});
   if(!aiEnabled)return json(res,503,{error:'AI disabled. Local scene director works without API keys.'});
   if(req.headers.origin!==`http://${req.headers.host}`||req.headers['x-goodbot-csrf']!==csrf)return json(res,403,{error:'Same-origin session consent required.'});
   if(req.headers['content-type']!=='application/json')return json(res,415,{error:'JSON required.'});
   if(busy||Date.now()-lastCall<10000)return json(res,429,{error:'One request at a time, at least ten seconds apart.'});
   if(calls>=maxCalls)return json(res,429,{error:'This local session reached its API call cap.'});
   let body='';try{for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>2048)throw new Error('oversized');}}catch{return json(res,413,{error:'Request too large.'});}
   let data;try{data=JSON.parse(body);}catch{return json(res,400,{error:'Invalid JSON.'});}
   if(!data||data.consent!==true||Object.keys(data).some(k=>!['levelId','seed','consent'].includes(k))||!LEVELS.some(l=>l.id===data.levelId)||typeof data.seed!=='string'||data.seed.length>64||!/^[\w .:-]*$/.test(data.seed))return json(res,400,{error:'Explicit consent and a valid authored scene are required.'});
   if(busy||Date.now()-lastCall<10000||calls>=maxCalls)return json(res,429,{error:'API request budget or concurrency limit reached.'});
   busy=true;calls++;lastCall=Date.now();
   try{const proposal=await generateProposal({...data,key:env.OPENAI_API_KEY,model:env.OPENAI_MODEL,fetcher});return json(res,200,{proposal,source:'OpenAI; verified against authored scene'});}
   catch{return json(res,422,{error:'No valid AI task plan was returned. The local director is still available. Check configuration or try another supported model.'});}
   finally{busy=false;}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
  if(name==='/'||name==='/goodbot')name='/index.html';
  if(name.includes('\0')||name.split('/').some(p=>p==='..'||p.startsWith('.')))return json(res,404,{error:'Not found.'});
  try{const file=path.join(ROOT,name);const real=await fs.realpath(file);if(!real.startsWith(ROOT+path.sep))throw new Error('outside');const data=await fs.readFile(real);
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'}[path.extname(real)]||'text/plain; charset=utf-8';
   res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch{return json(res,404,{error:'Not found.'});}
 });return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT)||4174;if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be 1024–65535.');
 const server=createServer();server.listen(port,'127.0.0.1',()=>console.log(`GOODBOT running at http://127.0.0.1:${port}/goodbot/\nAPI keys stay server-side. AI is disabled unless explicitly configured.`));
}
