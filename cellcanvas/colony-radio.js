/* CellCanvas v0.6: observable communication, one working group.
   Workers observe only nearby PAINTED pixels; supervisors see worker reports,
   designer packets and public row receipts. Only designers read the reference.
   The message log represents real in-simulation envelopes, not generated dialogue. */
(()=>{
'use strict';
const P=Organism.prototype;
const previousReset=P.reset, previousStep=P.step, previousTrain=P.train;
const previousSave=P.serialize, previousLoad=P.load;
const $c=id=>document.getElementById(id);
const key=(x,y)=>y*16+x;
const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
const integer=(v,a,b)=>Math.max(a,Math.min(b,Math.floor(v)));
const min=(a,b)=>Math.min(a,b);
function ensure(m){
 if(!m.commBrain){
  m.commBrain=new Policy(7,2,m.rng);
  m.commBrain.weights[0]=[0,0,0,0,0,0,0];
  m.commBrain.weights[1]=[.15,.45,.65,.35,.65,-.15,-.55];
  m.commLearning=0;
  m.commEnabled=true;
 }
 if(m.commEnabled===undefined)m.commEnabled=true;
 if(!m.commQueue)m.commQueue=[];
 if(!m.commLog)m.commLog=[];
 if(!m.commTickets)m.commTickets=new Map();
 if(!m.commCooldown)m.commCooldown=new Map();
 if(!m.commScouts)m.commScouts=[null,null,null,null];
 if(!m.commLastOrder)m.commLastOrder=[-1000,-1000,-1000,-1000];
 if(m.commSeq===undefined)m.commSeq=0;
 if(m.commSent===undefined)m.commSent=0;
 if(m.commDelivered===undefined)m.commDelivered=0;
 if(m.commReports===undefined)m.commReports=0;
 if(m.commQuestions===undefined)m.commQuestions=0;
 if(m.commAnswers===undefined)m.commAnswers=0;
 if(m.commUseful===undefined)m.commUseful=0;
 if(m.commFalse===undefined)m.commFalse=0;
 if(m.commWorkerAcks===undefined)m.commWorkerAcks=0;
 if(m.commScans===undefined)m.commScans=0;
 if(m.commScoutEnabled===undefined)m.commScoutEnabled=true;
 if(m.commLastScoutTick===undefined)m.commLastScoutTick=-1000;
}
function record(m,from,to,type,detail){
 m.commLog.unshift({tick:m.ticks,from,to,type,detail});
 if(m.commLog.length>30)m.commLog.length=30;
}
function send(m,from,to,type,payload={},lag=1){
 ensure(m);
 if(m.commQueue.length>250)return false;
 m.commQueue.push({id:++m.commSeq,from,to,type,payload,due:m.ticks+Math.max(1,lag)});
 m.commSent++;
 return true;
}
function evidence(m,x,y){
 const pic=m.canvas;
 const get=(xx,yy)=>xx>=0&&yy>=0&&xx<16&&yy<16?pic[yy][xx]:0;
 const here=get(x,y),a=get(x-1,y),b=get(x+1,y),c=get(x,y-1),d=get(x,y+1);
 const nw=get(x-1,y-1),ne=get(x+1,y-1),sw=get(x-1,y+1),se=get(x+1,y+1);
 const axes=[[a,b],[c,d],[nw,se],[ne,sw]];
 const matches=[1,2,3].map(color=>{
    const pairs=axes.filter(([p,q])=>p===color&&q===color).length;
    const orth=[a,b,c,d].filter(v=>v===color).length;
    return {color,pairs,orth,strength:pairs*2+orth};
 });
 matches.sort((u,v)=>v.strength-u.strength||u.color-v.color);
 const top=matches[0];
 if(!top||!top.strength)return null;
 // No guesses from the reference or row totals. Detect local discontinuities only.
 if(here===0 && (top.pairs>=1&&top.orth>=2 || top.orth>=3)){
   return {x,y,observed:here,suggested:top.color,strength:Math.min(6,top.strength),kind:'possible-hole'};
 }
 if(here>0 && here!==top.color && (top.pairs>=2||top.orth>=3)){
   return {x,y,observed:here,suggested:top.color,strength:Math.min(6,top.strength),kind:'color-conflict'};
 }
 return null;
}
function features(m,data){
 const k=key(data.x,data.y);
 const packet=m.messages.get(k);
 const outstanding=m.commTickets.size;
 return [1,+(data.kind==='possible-hole'),Math.min(1,data.strength/6),
   +(packet!==undefined&&!m.tentative?.has(k)),
   +(m.gaps[data.y]>0),Math.min(1,m.knownErrors.size/25),
   Math.min(1,outstanding/8)];
}
function supervisorReceive(m,msg){
 const d=msg.payload;
 if(msg.type==='PAINTED'){
   m.commWorkerAcks++;
   record(m,msg.from,msg.to,'PAINTED','pixel '+(d.x+1)+','+(d.y+1));
   return;
 }
 if(msg.type!=='OBSERVATION')return;
 m.commReports++;
 const k=key(d.x,d.y);
 record(m,msg.from,msg.to,'OBSERVATION',d.kind+' '+(d.x+1)+','+(d.y+1));
 if(m.commTickets.has(k) || m.commQuestions>=55)return;
 const f=features(m,d);
 const decision=m.commBrain.choose(f);
 if(decision!==1)return;
 const packet=m.messages.get(k);
 m.commTickets.set(k,{features:f,reported:packet,proposed:d.suggested,reason:d.kind,created:m.ticks});
 m.commQuestions++;
 const designer='designer-'+((d.y%2)+1);
 send(m,msg.to,designer,'QUESTION',{x:d.x,y:d.y,reported:packet??null,suggested:d.suggested,reason:d.kind},1);
 record(m,msg.to,designer,'QUESTION','verify '+(d.x+1)+','+(d.y+1));
}
function designerReceive(m,msg){
 if(msg.type!=='QUESTION')return;
 const d=msg.payload;
 // The designer is the ONLY actor in this protocol to inspect the target.
 const actual=m.target[d.y][d.x];
 send(m,msg.to,msg.from,'ANSWER',{x:d.x,y:d.y,color:actual},2);
 record(m,msg.to,msg.from,'ANSWER','responding to '+(d.x+1)+','+(d.y+1));
}
function answerSupervisor(m,msg){
 const d=msg.payload,k=key(d.x,d.y),ticket=m.commTickets.get(k);
 if(!ticket)return;
 m.commTickets.delete(k);
 m.commAnswers++;
 const former=m.messages.get(k);
 const changed=former===undefined?d.color!==0:former!==d.color;
 if(changed)m.commUseful++;else m.commFalse++;
 if(m.tentative?.has(k)){
    const old=m.tentative.get(k);
    if(old.color===d.color)m.guessesConfirmed++;else m.guessesWrong++;
    m.tentative.delete(k);
 }
 if(m.suspected?.has(k))m.suspected.delete(k);
 if(d.color===0){
   // Verified background should erase wrong paint, not enqueue a nonexistent blob.
   if(former!==undefined || m.canvas[d.y][d.x]!==0)m.messages.set(k,0);
 }else{
   if(former===undefined)m.recovered++;
   m.messages.set(k,d.color);
   m._designer_misses?.delete(k);
 }
 // The answer is a genuine learning signal. Supervisors do not read the reference.
 m.commBrain.learn(ticket.features,changed?[0,2.2]:[1.4,-.7],.075);
 m.commLearning++;
 record(m,msg.to,'workers','RESOLUTION',(changed?'updated':'confirmed')+' '+(d.x+1)+','+(d.y+1));
 send(m,msg.to,'worker-'+(1+(d.x>=8)+2*(d.y>=8)),'WORK_ORDER',{x:d.x,y:d.y,color:d.color},1);
}
function deliver(m){
 const arrived=[],later=[];
 for(const msg of m.commQueue)(msg.due<=m.ticks?arrived:later).push(msg);
 m.commQueue=later;
 for(const msg of arrived){
  m.commDelivered++;
  if(msg.to.startsWith('supervisor-')){
    if(msg.type==='ANSWER')answerSupervisor(m,msg);else supervisorReceive(m,msg);
  }else if(msg.to.startsWith('designer-'))designerReceive(m,msg);
  else if(msg.to.startsWith('worker-')){
    if(msg.type==='SCOUT'){
      const worker=Number(msg.to.slice(-1))-1;
      m.commScouts[worker]={row:msg.payload.row,x:worker%2?15:0};
      record(m,msg.from,msg.to,'SCOUT','inspect row '+(msg.payload.row+1));
    }
    if(msg.type==='WORK_ORDER')record(m,msg.from,msg.to,'WORK_ORDER','correct '+(msg.payload.x+1)+','+(msg.payload.y+1));
  }
 }
}
function dispatchScout(m){
 if(!m.commScoutEnabled||!m.initial_done||m.ticks-m.commLastScoutTick<22)return;
 if(m.knownErrors.size>8)return;
 const candidates=[];
 for(let y=0;y<16;y++){
   const gap=m.gaps[y];
   if(gap<=0)continue;
   const backlog=[...m.messages].filter(([k,c])=>(k/16|0)===y&&m.canvas[y][k%16]!==c).length;
   candidates.push({y,score:gap*3-backlog});
 }
 if(!candidates.length)return;
 candidates.sort((a,b)=>b.score-a.score||a.y-b.y);
 const available=m.teams.map((t,i)=>({t,i})).filter(({t})=>t.goal===null);
 if(!available.length)return;
 let chosen=candidates.find(c=>!m.commScouts.some(s=>s&&s.row===c.y));
 if(!chosen)chosen=candidates[0];
 const {i}=available[(m.ticks/22|0)%available.length];
 send(m,'supervisor-'+(i%2+1),'worker-'+(i+1),'SCOUT',{row:chosen.y},1);
 m.commLastScoutTick=m.ticks;
}
function patrol(m,t,i){
 if(t.goal!==null||!m.initial_done)return;
 const order=m.commScouts[i];
 if(order){
    const dx=Math.sign(order.x-t.x),dy=Math.sign(order.row-t.y);
    if(dy)t.y+=dy;
    else if(dx)t.x+=dx;
    else{
      if(order.x===15){m.commScouts[i]=null;}
      else order.x++;
    }
 }else{
   const sx=(i%2)*8,sy=(i>>1)*8,local=((m.ticks+i*17)%64);
   const yy=(local/8)|0,xx=yy%2?7-local%8:local%8;
   const tx=sx+xx,ty=sy+yy;
   const dx=Math.sign(tx-t.x),dy=Math.sign(ty-t.y);
   if(Math.abs(tx-t.x)>=Math.abs(ty-t.y)&&dx)t.x+=dx;
   else if(dy)t.y+=dy;
 }
 m.commScans++;
 const r=evidence(m,t.x,t.y);
 if(!r)return;
 const k=key(r.x,r.y),sig=r.kind+':'+r.observed+':'+r.suggested;
 const old=m.commCooldown.get(k);
 if(old&&old.sig===sig&&m.ticks-old.tick<38)return;
 m.commCooldown.set(k,{sig,tick:m.ticks});
 send(m,'worker-'+(i+1),'supervisor-'+(i%2+1),'OBSERVATION',r,1);
}
function reportWork(m,before){
 for(let i=0;i<4;i++){
   const t=m.teams[i],at=key(t.x,t.y),beforeInfo=before[i];
   const known=m.messages.get(at);
   if(known===undefined||!t.goal===false){} // intentionally no behavior; retained below
   if(beforeInfo.paint===m.paint_actions)continue;
   if(beforeInfo.pos!==at||beforeInfo.pixel===m.canvas[t.y][t.x])continue;
   if(known===undefined||known!==m.canvas[t.y][t.x])continue;
   send(m,'worker-'+(i+1),'supervisor-'+(i%2+1),'PAINTED',{x:t.x,y:t.y,color:known},1);
 }
}
P.reset=function(){
 previousReset.call(this);ensure(this);
 this.commQueue=[];this.commLog=[];this.commTickets.clear();this.commCooldown.clear();
 this.commScouts=[null,null,null,null];this.commLastOrder=[-1000,-1000,-1000,-1000];
 this.commLastScoutTick=-1000;this.commSeq=0;this.commSent=0;this.commDelivered=0;
 this.commReports=0;this.commQuestions=0;this.commAnswers=0;this.commUseful=0;
 this.commFalse=0;this.commWorkerAcks=0;this.commScans=0;
};
P.step=function(){
 ensure(this);
 if(!this.commEnabled)return previousStep.call(this);
 deliver(this);
 const prev=this.teams.map(t=>({pos:key(t.x,t.y),pixel:this.canvas[t.y][t.x],paint:this.paint_actions,goal:t.goal}));
 const status=previousStep.call(this);
 // All teams inspect their real physical surroundings after the painting tick.
 for(let i=0;i<4;i++){
   const t=this.teams[i];
   const previous=prev[i];
   if(previous.goal!==null&&t.goal===null){
      const k=key(t.x,t.y),c=this.canvas[t.y][t.x];
      if(c===this.messages.get(k))send(this,'worker-'+(i+1),'supervisor-'+(i%2+1),'PAINTED',{x:t.x,y:t.y,color:c},1);
   }
   if(t.goal===null)patrol(this,t,i);
   else {
      this.commScans++;
      const r=evidence(this,t.x,t.y);
      if(!r)continue;
      const k=key(r.x,r.y),sig=r.kind+':'+r.observed+':'+r.suggested;
      const old=this.commCooldown.get(k);
      if(old&&old.sig===sig&&this.ticks-old.tick<38)continue;
      this.commCooldown.set(k,{sig,tick:this.ticks});
      send(this,'worker-'+(i+1),'supervisor-'+(i%2+1),'OBSERVATION',r,1);
   }
 }
 dispatchScout(this);
 return status;
};
P.train=function(n=2500){
 previousTrain.call(this,n);ensure(this);
 // Train on whether a supervisor should request verification using packet
 // discrepancy, neighborhood evidence, and missing-receipt context.
 for(let i=0;i<Math.min(400,n);i++){
   const hole=this.rng()<.5,bad=this.rng()<.4,gap=hole&&this.rng()<.85;
   const f=[1,+hole, .3+this.rng()*.7,+!hole,+gap,
      this.rng(),this.rng()*.3];
   const good=bad||gap;
   this.commBrain.learn(f,good?[0,2]:[1.3,-.7],.03);
 }
};
P.serialize=function(){const d=previousSave.call(this);d.format='cellcanvas.v6';
 d.commBrain=this.commBrain.serialize();d.commLearning=this.commLearning;return d;};
P.load=function(d){
 const legacy={...d,format:d?.format==='cellcanvas.v6'?'cellcanvas.v4':d?.format};
 previousLoad.call(this,legacy);ensure(this);
 if(d?.commBrain){this.commBrain.load(d.commBrain);this.commLearning=Number(d.commLearning)||0;}
};
ensure(model);model.reset();
const panel=document.createElement('div');panel.className='group';
panel.innerHTML='<h3>COLONY RADIO · v0.6</h3>'+
 '<div class="controls"><button id="radioToggle">RADIO · ON</button><button id="radioChallenge">RADIO CHALLENGE</button></div>'+
 '<div class="statbar"><span>Worker reports <b id="radioReports">0</b></span>'+
 '<span>Supervisor questions <b id="radioQuestions">0</b></span>'+
 '<span>Designer answers <b id="radioAnswers">0</b></span>'+
 '<span>Useful corrections <b id="radioUseful">0</b></span>'+
 '<span>False alarms <b id="radioFalse">0</b></span>'+
 '<span>Paint acknowledgments <b id="radioAcks">0</b></span>'+
 '<span>Local scans <b id="radioScans">0</b></span>'+
 '<span>Messages in transit <b id="radioPending">0</b></span></div>'+
 '<div id="radioLog" class="readout" style="margin-top:9px;min-height:98px;max-height:190px;overflow:auto;font-size:11px">No messages yet. Press PLAY.</div>'+
 '<p class="tinyhint">Workers only inspect painted pixels immediately around them. Supervisors see worker reports, instruction receipts and row counts, but cannot read the reference. Only designers may answer coordinate questions. RADIO CHALLENGE turns off the old auditing/guessing shortcuts for a controlled comparison. This is a fixed message protocol, not invented language.</p>';
document.querySelector('.options').appendChild(panel);
const previousRender=render;
function showRadio(){
 if(!$c('radioLog'))return;
 $c('radioToggle').textContent='RADIO · '+(model.commEnabled?'ON':'OFF');
 $c('radioChallenge').textContent=model.commChallenge?'END RADIO CHALLENGE':'RADIO CHALLENGE';
 for(const [tag,value] of [['radioReports',model.commReports],['radioQuestions',model.commQuestions],
  ['radioAnswers',model.commAnswers],['radioUseful',model.commUseful],['radioFalse',model.commFalse],
  ['radioAcks',model.commWorkerAcks],['radioScans',model.commScans],['radioPending',model.commQueue.length]]){
    $c(tag).textContent=String(value);
 }
 $c('radioLog').textContent=model.commLog.length?
  model.commLog.slice(0,7).map(e=>'t'+e.tick+' '+e.from+' → '+e.to+': '+e.type+' · '+e.detail).join('\n'):
  'No messages yet. Press PLAY.';
}
render=function(){previousRender();showRadio();};
$c('radioToggle').onclick=()=>{model.commEnabled=!model.commEnabled;restart('Worker–supervisor–designer radio '+(model.commEnabled?'enabled':'disabled')+'.');showRadio();};
$c('radioChallenge').onclick=()=>{
 pause();
 if(!model.commChallenge){
   model._priorRadio={forget:model.forget_mode,audit:model.audit_enabled,infer:model.inferMode,recovery:model.recoveryEnabled,errors:model.designErrors,radio:model.commEnabled,stall:model.stallChallenge};
   model.commChallenge=true;model.stallChallenge=false;
   model.forget_mode='hard';model.audit_enabled=false;model.inferMode='off';
   model.recoveryEnabled=false;model.designErrors=false;model.commEnabled=true;
   const a=zeros();
   for(let y=3;y<=12;y++)for(let x=3;x<=12;x++)a[y][x]=2;
   model.newPicture(a);
   status('Radio challenge: 40% missing instructions, old audits/inference/recovery disabled. Only observed worker reports can prompt a designer question.');
 }else{
   const p=model._priorRadio||{};
   model.commChallenge=false;model.stallChallenge=p.stall||false;
   model.forget_mode=p.forget||'adaptive';model.audit_enabled=p.audit??true;
   model.inferMode=p.infer||'cautious';model.recoveryEnabled=p.recovery??true;
   model.designErrors=p.errors??false;model.commEnabled=p.radio??true;
   model.newPicture(shape('heart'));status('Radio challenge ended. Previous experiment switches restored.');
 }
 render();
};
document.querySelector('h1').innerHTML='CELLCANVAS <span style="color:var(--mint)">v0.6</span>';
document.title='CellCanvas v0.6 | Colony Radio • Forge Testbench';
document.querySelector('.header p').textContent='A colony with an actual message path: worker observations → supervisor questions → designer answers → corrected tasks. Start with one communicating group before adding organizational layers.';
document.querySelector('.chip').textContent='274 WEIGHTS · MESSAGE PROTOCOL';
render();
})();
