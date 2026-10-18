// GrooveGrove's living world. Node 20+, no audio hardware.
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {Grove} from '../grove-core.js';

const port=Number(process.env.PORT||3000);
const root=process.env.DATA_DIR||'/data';
const file=join(root,'groovegrove-world.json');
const secret=process.env.GROVE_WRITE_TOKEN||'';
const allowedOrigins=new Set([
  'https://wrkman-crypto.github.io',
  'http://localhost:3000','http://localhost:5173','http://127.0.0.1:3000'
]);
const beatMs=60000/98;
const events=[];
let nextSeq=1,world=null,nextBeat=0,nextAt=0,dirty=false,ready=false,bootAt=Date.now(),lastWrite=0,writeQueue=Promise.resolve();
let lastAdvanceAt=0;
const noCache={'Cache-Control':'no-store, no-cache, max-age=0'};
function authorized(req){
 const value=req.headers.authorization||'';
 const match=value.match(/^Bearer (.+)$/);
 if(!secret||!match)return false;
 const candidate=Buffer.from(match[1]),expected=Buffer.from(secret);
 return candidate.length===expected.length&&timingSafeEqual(candidate,expected);
}
const send=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8',...noCache});res.end(JSON.stringify(obj));};
function snapshot(){return world?world.snapshot():null;}
function packageState(includeEvents=false,since=0,includeWorld=true){
 const now=Date.now();
 const list=includeEvents?events.filter(e=>e.seq>since).slice(-200):[];
 return {version:1,initialized:ready,serverNow:now,
  beat:nextBeat,seq:nextSeq-1,
  uptimeSeconds:Math.floor((now-bootAt)/1000),
  world:ready&&includeWorld?snapshot():null,
  events:list};
}
function capture(kind,args){
 const [a,b,c,d]=args;
 const time=(kind==='guitar'||kind==='voice')?b:a;
 const ev={seq:nextSeq++,kind,atMs:Math.round(time*1000),
  bar:world.bar,beat:world.beat};
 if(kind==='guitar'||kind==='voice'){ev.freq=a;ev.volume=c;ev.duration=d;}
 else ev.volume=b;
 events.push(ev);if(events.length>420)events.shift();
}
const sink={
 guitar(...a){capture('guitar',a)},
 voice(...a){capture('voice',a)},
 kick(...a){capture('kick',a)},
 snare(...a){capture('snare',a)},
 hat(...a){capture('hat',a)}
};
async function flush(){
 if(!dirty||!ready)return;
 dirty=false;
 const data=JSON.stringify({version:1,savedAt:Date.now(),instanceId:instanceId,
  world:snapshot(),nextBeat,nextAt});
 writeQueue=writeQueue.then(async()=>{
  await mkdir(root,{recursive:true});
  const temp=file+'.tmp';
  await writeFile(temp,data,'utf8');
  await rename(temp,file);
  lastWrite=Date.now();
 }).catch(e=>{console.error('GrooveGrove save failed',e);dirty=true;});
 return writeQueue;
}
function run(){
 if(!ready)return;
 let count=0;
 const now=Date.now();
 while(nextAt<=now && count++<32){
  world.onBeatEvent(nextBeat,nextAt/1000,sink);
  nextBeat++;
  lastAdvanceAt=Date.now();
  nextAt+=beatMs;
  // world checkpoint is called at every bar boundary; disk persists every 10s.
 }
 if(now-nextAt>beatMs*32){
  // Under a long process pause, catch up over successive ticks instead of
  // compressing hours of musical history into one CPU spike.
 }
 if(dirty&&now-lastWrite>10000)void flush();
}
const instanceId=randomUUID();
async function init(){
 try{
  const saved=JSON.parse(await readFile(file,'utf8'));
  if(saved?.world && Number.isInteger(saved.nextBeat) && Number.isFinite(saved.nextAt)){
   world=new Grove(saved.world,()=>{dirty=true;});
   nextBeat=saved.nextBeat;nextAt=saved.nextAt;ready=true;
   console.log('GrooveGrove resumed from persistent record at beat',nextBeat);
  }
 }catch(err){if(err.code!=='ENOENT')throw err;}
 if(!ready)console.log('GrooveGrove waiting for its one-time phone memory transfer.');
 // All writes use a single ordered queue. Never run two writers on one volume.
 setInterval(run,120);
 setInterval(()=>{if(dirty)void flush();},30000);
 // Prove progress independent of all client requests, at modest log volume.
 setInterval(()=>{
  if(!ready)return;
  const pip=world.understanding.report('Pip');
  const riff=world.understanding.report('Riff');
  console.log('GROVE_HEARTBEAT',JSON.stringify({
   beat:nextBeat,bar:world.bar,
   practice:{Pip:pip.observations,Riff:riff.observations},
   experiments:{Pip:pip.experiments,Riff:riff.experiments},
   sinceLastBeatMs:Date.now()-lastAdvanceAt,checkpointAt:lastWrite
  }));
 },30000);
}
const MAX_BODY=120_000;
async function readBody(req){
 let count=0,chunks=[];
 for await(const chunk of req){count+=chunk.length;if(count>MAX_BODY)throw Error('Body too large');chunks.push(chunk);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const app=createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin&&allowedOrigins.has(origin)){
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
 }
 if(req.method==='OPTIONS'){res.writeHead(origin&&!allowedOrigins.has(origin)?403:204);res.end();return;}
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/health'){
   const pip=ready?world.understanding.report('Pip'):null;
   const riff=ready?world.understanding.report('Riff'):null;
   send(res,200,{ok:true,ready,beat:nextBeat,bar:ready?world.bar:0,
    practice:ready?{Pip:pip.observations,Riff:riff.observations}:null,
    experiments:ready?{Pip:pip.experiments,Riff:riff.experiments}:null,
    lastAdvanceAt,lastSavedAt:lastWrite,
    uptime:Math.floor((Date.now()-bootAt)/1000)});return;
  }
  if(req.method==='GET'&&(url.pathname==='/v1/state'||url.pathname==='/v1/poll')){
   const since=Math.max(0,Number(url.searchParams.get('since')||0)||0);
   const polling=url.pathname==='/v1/poll';
   // Compact polls carry only newly scheduled notes. Old clients receive
   // full snapshots unless they opt in to the small payload explicitly.
   const fullWorld=!polling || url.searchParams.get('compact')!=='1' || url.searchParams.get('world')==='1';
   send(res,200,packageState(polling,since,fullWorld));return;
  }
  if(req.method==='POST'&&url.pathname==='/v1/seed'){
   if(!authorized(req)){send(res,401,{error:'Pairing key required'});return;}
   if(ready){send(res,409,{error:'The grove already has its permanent home'});return;}
   const request=await readBody(req);
   if(!request?.world || typeof request.world!=='object' || Array.isArray(request.world)){
    send(res,400,{error:'Missing grove memory'});return;
   }
   // Preserve browser-created books/skills/journals without accepting executable code.
   world=new Grove(request.world,()=>{dirty=true;});
   nextBeat=Math.max(0,(Number.isInteger(request.world.bar)?request.world.bar+1:0)*4);
   nextAt=Date.now()+beatMs;
   ready=true;dirty=true;
   await flush(); // Never report success until the seed is safely on disk.
   send(res,201,{ok:true,beat:nextBeat});return;
  }
  if(req.method==='POST'&&url.pathname==='/v1/donate'){
   if(!authorized(req)){send(res,401,{error:'Pairing key required'});return;}
   if(!ready){send(res,409,{error:'Grove not paired yet'});return;}
   const request=await readBody(req);
   const result=world.library.donate(request?.type);
   if(!result.ok){send(res,400,{error:result.reason});return;}
   world.push('A new book arrived at the library: '+request.type+'.');
   dirty=true;await flush();
   send(res,201,{ok:true,book:result.book});return;
  }
  send(res,404,{error:'Unknown route'});
 }catch(error){
  console.error('Request failed',error);
  send(res,500,{error:'Server error'});
 }
});
process.on('SIGTERM',()=>{void flush().finally(()=>process.exit(0));});
process.on('SIGINT',()=>{void flush().finally(()=>process.exit(0));});
await mkdir(root,{recursive:true});
await init();
app.listen(port,'0.0.0.0',()=>console.log('GrooveGrove server listening on',port));