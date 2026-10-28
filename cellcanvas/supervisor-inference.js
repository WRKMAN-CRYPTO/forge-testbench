/* CellCanvas v0.3: local inference, uncertainty, and designer challenges.
   Supervisors never read model.target here. Only verified designer rescans may do so. */
(()=>{
'use strict';
const P=Organism.prototype, originalReset=P.reset, originalDesign=P.designerTick, originalAudit=P.chooseAudits, originalTrain=P.train, originalSerialize=P.serialize, originalLoad=P.load, originalPaint=paint, originalRender=render, originalTick=tick, originalRun=P.run;
const idx=(x,y)=>y*16+x;
const inferenceNames=['off','cautious','bold'];
function inputs(x,y,visible) {
 const get=(xx,yy)=>xx<0||xx>=16||yy<0||yy>=16?0:visible[idx(xx,yy)]||0;
 const l=get(x-1,y),r=get(x+1,y),u=get(x,y-1),d=get(x,y+1);
 const nw=get(x-1,y-1),ne=get(x+1,y-1),sw=get(x-1,y+1),se=get(x+1,y+1);
 const axial=[l,r,u,d],diagonal=[nw,ne,sw,se],f=[1];
 for(let c=1;c<=3;c++)f.push(axial.filter(v=>v===c).length/4);
 for(let c=1;c<=3;c++)f.push(diagonal.filter(v=>v===c).length/4);
 for(let c=1;c<=3;c++)f.push(+(l===c&&r===c),+(u===c&&d===c));
 for(let c=1;c<=3;c++)f.push(+(nw===c&&se===c),+(ne===c&&sw===c));
 f.push(x/15,y/15,(x%2), (y%2), [...axial,...diagonal].filter(Boolean).length/8);
 return f;
}
const IN=24;
function prepared(m) {if(!m.neighborBrain){m.neighborBrain=new Policy(IN,4,m.rng);m.neighborExamples=0;}if(!m.tentative)m.tentative=new Map();if(!m.identified)m.identified=new Set();if(!m.suspected)m.suspected=new Map();if(!m._marked)m._marked=new Set();if(!m.inferMode)m.inferMode='cautious';if(m.challengeEnabled===undefined)m.challengeEnabled=true;if(m.designErrors===undefined)m.designErrors=false;if(!m.inferConfidence)m.inferConfidence=.84;if(m.guessesMade===undefined)m.guessesMade=0;if(m.guessesConfirmed===undefined)m.guessesConfirmed=0;if(m.guessesWrong===undefined)m.guessesWrong=0;if(m.challengeCount===undefined)m.challengeCount=0;if(m.challengesCorrect===undefined)m.challengesCorrect=0;if(m.challengesIncorrect===undefined)m.challengesIncorrect=0;if(m.corruptPackets===undefined)m.corruptPackets=0;}
P.reset=function(){originalReset.call(this);prepared(this);this.tentative.clear();this.identified.clear();this.suspected.clear();this._marked.clear();this.guessesMade=0;this.guessesConfirmed=0;this.guessesWrong=0;this.challengeCount=0;this.challengesCorrect=0;this.challengesIncorrect=0;this.corruptPackets=0;};
Object.defineProperty(P,'gaps',{configurable:true,get:function(){
 const recv=Array(16).fill(0);for(const k of this.messages.keys())if(!this.tentative?.has(k)&&this.messages.get(k)!==0)recv[Math.floor(k/16)]++;
 return this.manifest.map((v,y)=>Math.max(0,v-recv[y]));
}});
function visible(m){const a=Array(256).fill(0);for(const [k,c] of m.messages)if(!m.tentative.has(k))a[k]=c;return a;}
function classify(m,x,y,a){const f=inputs(x,y,a),p=softmax(m.neighborBrain.logits(f)),q=[1,2,3].sort((u,v)=>p[v]-p[u])[0];
 let conf=p[q];
 const g=(xx,yy)=>xx<0||yy<0||xx>=16||yy>=16?0:a[idx(xx,yy)];
 const opp=[[g(x-1,y),g(x+1,y)],[g(x,y-1),g(x,y+1)],[g(x-1,y-1),g(x+1,y+1)],[g(x+1,y-1),g(x-1,y+1)]];
 const bridge=opp.filter(([u,v])=>u===q&&v===q).length;
 if(bridge)conf=Math.max(conf,bridge>=2?.96:.89);
 return {color:q,confidence:conf,features:f,probabilities:p,bridge};
}
P.designerTick=function(){
 prepared(this);
 const scans=[...this.pending_scans].filter(([,due])=>this.ticks>=due).map(([row])=>row);
 originalDesign.call(this);
 // A returned designer rescan supersedes tentative pixels and corrects erroneous packets.
 for(const y of scans){
   for(let x=0;x<16;x++){
     const k=idx(x,y),trueColor=this.target[y][x];
     if(this.tentative.has(k)){
       if(this.tentative.get(k).color===trueColor)this.guessesConfirmed++;else this.guessesWrong++;
       this.tentative.delete(k);
       this.messages.set(k,trueColor);
     } else if(this.messages.has(k)&&this.messages.get(k)!==trueColor){
       this.messages.set(k,trueColor);
     }
     if(this.suspected.has(k)){
       if(this.suspected.get(k).predicted===trueColor&&this.suspected.get(k).reported!==trueColor)this.challengesCorrect++;
       else this.challengesIncorrect++;
       this.suspected.delete(k);
     }
     this._marked.add(k);
   }
 }
 // Simulate wrong-colored designer packets for a controlled challenge experiment.
 for(const [k,c] of this.messages){
   if(this.tentative.has(k)||this._marked.has(k))continue;
   this._marked.add(k);
   if(this.designErrors&&c>0&&this.rng()<.1){
     this.messages.set(k,1+(c%3));this.corruptPackets++;
   }
 }
};
P.inferNeighbors=function(){
 prepared(this);
 if(!this.initial_done||this.inferMode==='off')return;
 const a=visible(this),gaps=this.gaps;
 for(let y=0;y<16;y++){
   let remaining=gaps[y]-[...this.tentative.keys()].filter(k=>Math.floor(k/16)===y).length;
   if(remaining<=0)continue;
   const proposals=[];
   for(let x=0;x<16;x++){
     const k=idx(x,y);if(this.messages.has(k))continue;
     const p=classify(this,x,y,a);
     if(p.confidence>=this.inferConfidence)proposals.push({k,...p});
   }
   proposals.sort((u,v)=>v.confidence-u.confidence||v.bridge-u.bridge||u.k-v.k);
   for(const p of proposals.slice(0,remaining)){
     this.messages.set(p.k,p.color);this.tentative.set(p.k,{color:p.color,confidence:p.confidence});
     this.guessesMade++;
   }
 }
 if(!this.challengeEnabled||!this.audit_enabled)return;
 for(const [k,c] of this.messages){
   if(this.tentative.has(k)||this.identified.has(k)||!c)continue;
   const x=k%16,y=Math.floor(k/16);
   if(this.audited_rows.has(y)||this.pending_scans.has(y))continue;
   const p=classify(this,x,y,a);
   const neighbors=p.features[23];
   if(p.color!==c&&p.confidence>=Math.max(.94,this.inferConfidence)&&p.probabilities[c]<.13&&neighbors>=.5){
      this.suspected.set(k,{reported:c,predicted:p.color,confidence:p.confidence});
      this.identified.add(k);this.challengeCount++;
      this.pending_scans.set(y,this.ticks+2);this.audited_rows.add(y);this.audit_requests++;
   }
 }
};
P.chooseAudits=function(){
 if(!this.initial_done)return;
 this.inferNeighbors();
 if(!this.audit_enabled)return;
 // In bold mode, high-confidence guesses can stand without a rescan, explicitly at risk.
 if(this.inferMode==='bold'){
   const rows=[];
   for(let y=0;y<16;y++){
     const gaps=this.gaps[y];if(!gaps||this.pending_scans.has(y)||this.audited_rows.has(y))continue;
     const guesses=[...this.tentative].filter(([k,v])=>Math.floor(k/16)===y&&v.confidence>=this.inferConfidence).length;
     if(guesses>=gaps)rows.push(y);
   }
   for(const y of rows)this.audited_rows.add(y);
 }
 originalAudit.call(this);
};
const cacheNames=['heart','cross','house','spiral','checker','scatter'];
function teach(m,n){
 prepared(m);
 for(let i=0;i<n;i++){
   const picture=shape(cacheNames[Math.floor(m.rng()*cacheNames.length)],m.rng);
   const a=Array(256).fill(0), positives=[],all=[];
   for(let k=0;k<256;k++){
     const x=k%16,y=Math.floor(k/16),value=picture[y][x];all.push(k);
     if(value)positives.push(k);
     if(m.rng()>.36)a[k]=value;
   }
   const k=(positives.length&&m.rng()<.7)?positives[Math.floor(m.rng()*positives.length)]:all[Math.floor(m.rng()*all.length)];
   const x=k%16,y=Math.floor(k/16),answer=picture[y][x],f=inputs(x,y,a),p=softmax(m.neighborBrain.logits(f));
   for(let out=0;out<4;out++)for(let j=0;j<IN;j++)m.neighborBrain.weights[out][j]+=.18*((answer===out?1:0)-p[out])*f[j];
   m.neighborExamples++;
 }
}
P.train=function(n=2500){originalTrain.call(this,n);teach(this,n);};
P.serialize=function(){const d=originalSerialize.call(this);d.format='cellcanvas.v3';d.neighborBrain=this.neighborBrain.serialize();d.neighborExamples=this.neighborExamples;return d;};
P.load=function(d){const legacy={...d,format:d.format==='cellcanvas.v3'?'cellcanvas.v2':d.format};originalLoad.call(this,legacy);prepared(this);if(d.neighborBrain){this.neighborBrain.load(d.neighborBrain);this.neighborExamples=Number(d.neighborExamples)||0;}};
prepared(model);teach(model,3500);model.reset();
const options=document.querySelector('.options');
const panel=document.createElement('div');panel.className='group';panel.innerHTML='<h3>SUPERVISOR INTUITION · v0.3</h3><div class="controls"><button id="inferToggle">GUESS · CAUTIOUS</button><button id="challengeToggle">DISPUTES · ON</button><button id="errorsToggle">BAD PACKETS · OFF</button></div><div class="controls" style="margin-top:9px"><label style="margin:0;color:var(--muted)">Minimum confidence <b id="inferPct">84%</b></label><input id="inferSlider" aria-label="Minimum guess confidence" type="range" min="65" max="98" value="84"></div><div class="statbar"><span>Guesses <b id="guessCount">0</b></span><span>Verified <b id="verifiedCount">0</b></span><span>Wrong <b id="wrongGuessCount">0</b></span><span>Disputes <b id="disputeCount">0</b></span><span>Confirmed disputes <b id="confirmedDisputes">0</b></span></div><p class="tinyhint">Cautious asks designers to verify guesses. Bold may trust a confident guess. Bad packets deliberately introduce wrong colors; disputes trigger verification. The supervisors never see the target directly.</p>';
options.appendChild(panel);
function updatePanel(){
 document.getElementById('inferToggle').textContent='GUESS · '+model.inferMode.toUpperCase();
 document.getElementById('challengeToggle').textContent='DISPUTES · '+(model.challengeEnabled?'ON':'OFF');
 document.getElementById('errorsToggle').textContent='BAD PACKETS · '+(model.designErrors?'ON':'OFF');
 document.getElementById('guessCount').textContent=model.guessesMade;
 document.getElementById('verifiedCount').textContent=model.guessesConfirmed;
 document.getElementById('wrongGuessCount').textContent=model.guessesWrong;
 document.getElementById('disputeCount').textContent=model.challengeCount;
 document.getElementById('confirmedDisputes').textContent=model.challengesCorrect;
 document.getElementById('inferPct').textContent=Math.round(model.inferConfidence*100)+'%';
}
document.getElementById('inferToggle').onclick=()=>{model.inferMode=inferenceNames[(inferenceNames.indexOf(model.inferMode)+1)%3];restart('Neighbor inference: '+model.inferMode+'.');updatePanel();};
document.getElementById('challengeToggle').onclick=()=>{model.challengeEnabled=!model.challengeEnabled;restart('Independent designer challenges '+(model.challengeEnabled?'enabled':'disabled')+'.');updatePanel();};
document.getElementById('errorsToggle').onclick=()=>{model.designErrors=!model.designErrors;restart('Wrong-colored designer packets '+(model.designErrors?'enabled':'disabled')+'.');updatePanel();};
document.getElementById('inferSlider').oninput=e=>{model.inferConfidence=Number(e.target.value)/100;updatePanel();};
const oldRender=render;
render=function(){oldRender();updatePanel();};
const oldPaint=paint;
paint=function(ctx,pixels,kind){oldPaint(ctx,pixels,kind);if(kind==='work'){
  for(const [k,g] of model.tentative){const x=k%16,y=Math.floor(k/16);ctx.lineWidth=2;ctx.strokeStyle='#ffd175';ctx.setLineDash([5,4]);ctx.strokeRect(x*32+3,y*32+3,26,26);}
  ctx.setLineDash([]);
  for(const [k,s] of model.suspected){const x=k%16,y=Math.floor(k/16);ctx.strokeStyle='#ff748e';ctx.lineWidth=3;ctx.strokeRect(x*32+2,y*32+2,28,28);}
}};
const oldTrainClick=document.getElementById('train').onclick;
document.getElementById('train').onclick=async function(){await oldTrainClick.call(this);if(!busy){status('Trained all five original policies plus the neighbor predictor. '+model.neighborExamples.toLocaleString()+' local learning samples.');render();}};
const oldSaveClick=document.getElementById('save').onclick;
document.getElementById('save').onclick=function(){download('cellcanvas_brains_v03.json',JSON.stringify(model.serialize(),null,2),'application/json');status('Saved v0.3 brain with neighbor prediction weights. Can load older v0.2 brains too.');};
document.querySelector('h1').innerHTML='CELLCANVAS <span style="color:var(--mint)">v0.3</span>';
document.title='CellCanvas v0.3 | Supervisor Intuition • Forge Testbench';
document.querySelector('.header p').textContent='Forgetful designers, skeptical supervisors, and local pattern learning. No AI API. Experiment with guesses, verification, and incorrect instructions.';
document.querySelector('.chip').textContent='220 WEIGHTS · LOCAL LEARNING';
const foot=document.createElement('p');foot.className='under';foot.innerHTML='<b>Experiment note:</b> Neighbor predictions come from local received instructions, not the reference. Training uses synthetic examples with known answers. Accuracy on unfamiliar drawings is not guaranteed. Rescans, not guesses, establish truth.';
options.parentElement.insertBefore(foot,options.nextSibling);
render();
status('v0.3 ready. Guesses are tentative (gold dashed boxes). Challenge a wrong-colored designer instruction with BAD PACKETS ON.');
})();
