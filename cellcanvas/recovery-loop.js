/* CellCanvas v0.4 • Collective self-recovery.
 * Supervisors observe ONLY designer packets, local canvas state, worker assignments,
 * and elapsed ticks. The private target image is NOT used to choose actions.
 * Successful outcome metrics are based on visible progress, not reference truth. */
(()=>{
'use strict';
const P=Organism.prototype;
const parentReset=P.reset, parentStep=P.step, parentTrain=P.train;
const parentSave=P.serialize, parentLoad=P.load, parentGuess=P.inferNeighbors;
const ACTIONS=['WAIT','VERIFY','RECONSIDER','EXPLORE'], FEATURES=10;
const $s=id=>document.getElementById(id);
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
function state(m) {
 const tentative=m.tentative?.size||0;
 let satisfied=0, verified=0;
 for(const [k,c] of m.messages){
   const x=k%16,y=(k/16)|0;
   if(m.canvas[y][x]===c && c!==0)satisfied++;
   if(!m.tentative?.has(k))verified++;
 }
 const gaps=m.gaps.reduce((a,b)=>a+b,0);
 return {
   satisfied, verified, received:m.messages.size, gaps, tentative,
   tasks:m.knownErrors.size, moving:m.teams.filter(t=>t.goal!==null).length,
   queued:m.queues.reduce((a,q)=>a+q.length,0),
   pending:m.pending_scans.size,
   signatures:m.messages.size+':'+satisfied+':'+verified+':'+m.paint_actions
 };
}
function observation(m,s) {
 const idle=m.idleTicks||0;
 return [1,limit(idle/75,0,2),limit(s.tasks/25,0,2),
  limit(s.gaps/12,0,2),limit(s.tentative/10,0,2),
  +!!m.audit_enabled,+!!(m.inferMode!=='off'),
  +(s.pending>0||s.queued>0),+(s.tasks===0&&s.moving===0),
  limit((m.recoveryCount||0)/10,0,1)];
}
function teachRecovery(m,n){
 for(let i=0;i<n;i++){
   const idle=(8+Math.floor(m.rng()*85));
   const tasks=Math.floor(m.rng()*25);
   const gaps=Math.floor(m.rng()*12);
   const tentative=Math.floor(m.rng()*10);
   const audit=m.rng()>.35;
   const infer=m.rng()>.2;
   const pending=m.rng()<.17;
   const noJobs=m.rng()<.6;
   const o=[1,idle/75,tasks/25,gaps/12,tentative/10,
     +audit,+infer,+pending,+noJobs,m.rng()];
   let good=0;
   if(idle>=m.stallThreshold&&!pending) {
     if(audit&&(gaps>0||tentative>0||noJobs))good=1;
     else if(tentative>0&&m.rng()<.68)good=2;
     else if(infer&&gaps>0)good=3;
   }
   const rewards=[0,0,0,0];rewards[good]=2.5;
   // Constrain training toward actionable, locally sensible decisions.
   m.recoveryBrain.learn(o,rewards,.065);
   m.recoverySamples++;
 }
}
function ensure(m){
 if(!m.recoveryBrain){
   m.recoveryBrain=new Policy(FEATURES,ACTIONS.length,m.rng);
   m.recoverySamples=0;
   m.recoveryEnabled=true;
   m.stallThreshold=28;
 }
 if(m.recoveryEnabled===undefined)m.recoveryEnabled=true;
 if(!m.stallThreshold)m.stallThreshold=28;
 if(!m.recoveryLog)m.recoveryLog=[];
 if(!m.recoveryLastAction)m.recoveryLastAction='none';
 if(!m.recoveryBanned)m.recoveryBanned=new Set();
 if(!m.recoveryRowUsed)m.recoveryRowUsed=new Map();
 if(m.recoveryCount===undefined)m.recoveryCount=0;
 if(m.recoveryUseful===undefined)m.recoveryUseful=0;
 if(m.recoveryFailed===undefined)m.recoveryFailed=0;
 if(m.recoveryReconsidered===undefined)m.recoveryReconsidered=0;
 if(m.recoveryExplored===undefined)m.recoveryExplored=0;
 if(m.idleTicks===undefined)m.idleTicks=0;
 if(m.lastProgressTick===undefined)m.lastProgressTick=0;
 if(m.lastRecoveryTick===undefined)m.lastRecoveryTick=-100;
}
P.reset=function(){
 parentReset.call(this);ensure(this);
 this.idleTicks=0;this.lastProgressTick=0;this.lastRecoveryTick=-100;
 this.recoveryCount=0;this.recoveryUseful=0;this.recoveryFailed=0;
 this.recoveryLastAction='none';
 this.recoveryReconsidered=0;this.recoveryExplored=0;
 this.recoveryLog=[];this.recoveryPending=null;
 this.recoveryBanned.clear();this.recoveryRowUsed.clear();
 this.recoveryPrev=state(this);
};
P.inferNeighbors=function(){
 ensure(this);
 // Temporarily reserve discarded hypotheses so the predictor cannot repeat
 // them on the very next tick. Zero isn't counted as a received pixel.
 const placeholders=[];
 for(const k of this.recoveryBanned)if(!this.messages.has(k)){
   this.messages.set(k,0);placeholders.push(k);
 }
 try{return parentGuess.call(this);}
 finally{for(const k of placeholders)if(this.messages.get(k)===0)this.messages.delete(k);}
};
function verify(m,s) {
 const options=[];
 for(let row=0;row<16;row++){
   const count=m.manifest[row];
   if(!count||m.pending_scans.has(row))continue;
   const now=m.ticks,last=m.recoveryRowUsed.get(row)??-1000;
   if(now-last<Math.max(16,m.stallThreshold))continue;
   const uncertain=[...m.tentative.keys()].filter(k=>(k/16|0)===row).length;
   const disputed=[...m.suspected.keys()].filter(k=>(k/16|0)===row).length;
   const miss=m.gaps[row]||0;
   const unfinished=[...m.messages].filter(([k,c])=>(k/16|0)===row && m.canvas[row][k%16]!==c).length;
   // Row packets and manifested counts are observable. Never inspect target pixels.
   const score=miss*6+uncertain*3+disputed*8+Math.min(4,unfinished)*.5
      +(now-last)/500 +m.rng()*.01;
   options.push({row,score});
 }
 options.sort((a,b)=>b.score-a.score);
 if(!options.length)return false;
 const row=options[0].row;
 m.pending_scans.set(row,m.ticks+2);
 m.recoveryRowUsed.set(row,m.ticks);
 m.audit_requests++;
 return {detail:'rescan row '+(row+1),row};
}
function reconsider(m) {
 const choices=[...m.tentative].sort((a,b)=>a[1].confidence-b[1].confidence||a[0]-b[0]);
 if(!choices.length)return false;
 const [k,g]=choices[0],x=k%16,y=(k/16)|0;
 m.tentative.delete(k);
 m.messages.delete(k);
 if(m.canvas[y][x]===g.color)m.canvas[y][x]=0;
 m.recoveryBanned.add(k);
 m.recoveryReconsidered++;
 return {detail:'withdraw guess at '+(x+1)+','+(y+1),position:k};
}
function explore(m,s) {
 if(m.inferMode==='off'||s.gaps===0)return false;
 const prev=m.inferConfidence;
 m.inferConfidence=limit(prev-.16,.52,.98);
 const before=m.guessesMade;
 try{m.inferNeighbors();}finally{m.inferConfidence=prev;}
 if(m.guessesMade===before)return false;
 m.recoveryExplored+=m.guessesMade-before;
 return {detail:'explored '+(m.guessesMade-before)+' lower-confidence pixels'};
}
P.recoveryChoose=function(s){
 ensure(this);
 const f=observation(this,s),scores=this.recoveryBrain.logits(f);
 const allowed=[true,!!this.audit_enabled&&s.pending===0,
    s.tentative>0,!!(this.inferMode!=='off'&&s.gaps>0)];
 for(let a=0;a<scores.length;a++)if(!allowed[a])scores[a]=-1e5;
 const rank=scores.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);
 return {f,rank};
};
P.recoveryRespond=function(s){
 ensure(this);
 if(!this.recoveryEnabled || !this.initial_done || s.queued>0 ||
   this.idleTicks<this.stallThreshold || s.pending>0 ||
   this.ticks-this.lastRecoveryTick<Math.max(15,this.stallThreshold) ||
   this.recoveryCount>=12)return;
 const {f,rank}=this.recoveryChoose(s);
 for(const {i} of rank){
   if(i===0)break; // The learned policy can elect to wait.
   let result=false;
   if(i===1)result=verify(this,s);
   if(i===2)result=reconsider(this);
   if(i===3)result=explore(this,s);
   if(!result)continue;
   this.recoveryCount++;
   this.lastRecoveryTick=this.ticks;
   this.recoveryLastAction=ACTIONS[i];
   this.recoveryLog.unshift({tick:this.ticks,action:ACTIONS[i],detail:result.detail,outcome:'pending'});
   this.recoveryLog.length=Math.min(this.recoveryLog.length,12);
   this.recoveryPending={action:i,f,tick:this.ticks,
     satisfied:s.satisfied,received:s.received,verified:s.verified};
   this.idleTicks=0;
   return;
 }
 this.recoveryLastAction='WAIT';
};
P.step=function(){
 ensure(this);
 const before=state(this);
 const did=parentStep.call(this);
 const after=state(this);
 const madeProgress=after.satisfied>before.satisfied ||
   after.received>before.received || after.verified>before.verified;
 if(madeProgress){this.idleTicks=0;this.lastProgressTick=this.ticks;}
 else this.idleTicks++;
 // Each recovery action is graded by subsequent *observed* useful progress.
 // It is not allowed to peek at reference correctness for choosing/learning.
 if(this.recoveryPending&&this.ticks-this.recoveryPending.tick>=18){
   const p=this.recoveryPending;
   const helped=after.satisfied>p.satisfied||after.received>p.received||after.verified>p.verified;
   if(helped)this.recoveryUseful++;else this.recoveryFailed++;
   this.recoveryBrain.learn(p.f,ACTIONS.map((_,i)=>i===p.action?(helped?1.7:-1.2):0),.09);
   const entry=this.recoveryLog.find(e=>e.tick===p.tick);
   if(entry)entry.outcome=helped?'helped':'no observed progress';
   this.recoveryPending=null;
 }
 this.recoveryRespond(after);
 this.recoveryPrev=after;
 return did;
};
P.train=function(n=2500){ensure(this);parentTrain.call(this,n);teachRecovery(this,n);};
P.serialize=function(){const d=parentSave.call(this);
 d.format='cellcanvas.v4';d.recoveryBrain=this.recoveryBrain.serialize();
 d.recoverySamples=this.recoverySamples;return d;};
P.load=function(d){
 const legacy={...d,format:d?.format==='cellcanvas.v4'?'cellcanvas.v3':d?.format};
 parentLoad.call(this,legacy);ensure(this);
 if(d?.recoveryBrain){this.recoveryBrain.load(d.recoveryBrain);
   this.recoverySamples=Number(d.recoverySamples)||0;}
};
ensure(model);teachRecovery(model,4500);model.reset();
const options=document.querySelector('.options');
const el=document.createElement('div');el.className='group';
el.innerHTML='<h3>SUPERVISOR RECOVERY · v0.4</h3>'+
 '<div class="controls"><button id="recoverToggle">RECOVERY · ON</button>'+
 '<button id="recoveryTrain">TRAIN RECOVERY +2K</button></div>'+
 '<div class="controls" style="margin-top:8px">'+
 '<label style="margin:0;color:var(--muted)">Stall threshold <b id="stallLimit">28 ticks</b></label>'+
 '<input type="range" min="12" max="80" step="4" value="28" id="stallSlider" aria-label="Ticks without progress before supervisor recovery"></div>'+
 '<div class="statbar"><span>State <b id="recoveryState">ACTIVE</b></span>'+
 '<span>Idle <b id="idleCount">0</b></span>'+
 '<span>Recovery attempts <b id="recoveryAttempts">0</b></span>'+
 '<span>Helped <b id="recoveryUseful">0</b></span>'+
 '<span>No progress <b id="recoveryFailed">0</b></span></div>'+
 '<div class="readout" id="recoveryActivity" style="min-height:65px;margin-top:9px">Awaiting activity.</div>'+
 '<p class="tinyhint">Measures observable task completion and new messages, not hidden reference correctness. Supervisors can verify, retract a guess, experiment with lower confidence, or wait. Recovery actions are rewarded or penalized based on subsequent visible progress.</p>';
options.appendChild(el);
let recoveryTraining=false;
function updateRecoveryPanel(){
 const m=model, s=state(m);
 let label='ACTIVE';
 if(!m.initial_done)label='DESIGNERS WORKING';
 else if(s.pending)label='WAITING ON RESCAN';
 else if(m.idleTicks>=m.stallThreshold)label=s.tasks?'STALLED':'QUIESCENT';
 else if(s.tasks||s.moving)label='WORKERS ACTIVE';
 else label='IDLE / CHECKING';
 $s('recoveryState').textContent=label;
 $s('idleCount').textContent=m.idleTicks;
 $s('recoveryAttempts').textContent=m.recoveryCount;
 $s('recoveryUseful').textContent=m.recoveryUseful;
 $s('recoveryFailed').textContent=m.recoveryFailed;
 $s('recoverToggle').textContent='RECOVERY · '+(m.recoveryEnabled?'ON':'OFF');
 $s('stallLimit').textContent=m.stallThreshold+' ticks';
 $s('recoveryActivity').textContent=m.recoveryLog.length?
   m.recoveryLog.slice(0,4).map(e=>'t'+e.tick+' '+e.action+': '+e.detail+' ('+e.outcome+')').join('\n'):
   'No recovery needed yet. Try hard forgetting + audits off to observe a stall.';
}
$s('recoverToggle').onclick=()=>{model.recoveryEnabled=!model.recoveryEnabled;restart('Recovery policy '+(model.recoveryEnabled?'enabled':'disabled')+'.');updateRecoveryPanel();};
$s('stallSlider').oninput=e=>{model.stallThreshold=Number(e.target.value);updateRecoveryPanel();};
$s('recoveryTrain').onclick=async()=>{if(busy)return;pause();recoveryTraining=true;for(let i=0;i<2000;i+=200){teachRecovery(model,200);await new Promise(r=>setTimeout(r,0));}
 recoveryTraining=false;updateRecoveryPanel();status('Recovery decision policy trained with 2,000 synthetic situations. It also learns from observed actions during play.');};
const originalRender=render;
render=function(){originalRender();updateRecoveryPanel();};
const savedClick=$s('save').onclick;
$s('save').onclick=()=>{download('cellcanvas_brains_v04.json',JSON.stringify(model.serialize(),null,2),'application/json');
 status('Saved v0.4 weights including the recovery policy. Older v0.2/v0.3 files still load.');};
const heading=document.querySelector('h1');
heading.innerHTML='CELLCANVAS <span style="color:var(--mint)">v0.4</span>';
document.title='CellCanvas v0.4 | Recovery Loop • Forge Testbench';
document.querySelector('.chip').textContent='260 WEIGHTS · SELF-RECOVERY';
document.querySelector('.header p').textContent='A tiny image-making colony. Designers forget, supervisors guess, and now stalled work can trigger independent recovery attempts. No external AI.';
render();
status('v0.4 ready. Watch the IDLE counter and recovery activity log. Supervisors never read the hidden target.');
})();