/* CellCanvas v0.5: local autosave and adaptive auto-training.
   Trainer alone can read reference targets. Supervisors still see only packets.
   Training runs only while this browser page is open and visible. */
(()=>{
'use strict';
const STORE='wrkman.cellcanvas.autosave.v5';
const VERSION=5;
const $t=id=>document.getElementById(id);
const P=Organism.prototype;
const baseTrain=P.train;
const baseLoad=P.load;
const baseSave=P.serialize;
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
const rng=(seed)=>randomGenerator(seed);
let trainingOn=false,trainingBusy=false,autoTimer=null,saveTimer=null,dirty=false,storageOK=false;
let lastSaved=0,autoTrained=0,bestScore=null,lastScore=null,plateau=0,autoRounds=0;
let bestWeights=null,history=[],evalAt=0,trainRng=rng(161926);
const recentCases=[],MAX_CASES=350;
const quiet=()=>!(typeof document!=='undefined'&&document.hidden);
function setStatus(s){const el=$t('learnState');if(el)el.textContent=s;}
function pixelFeatures(x,y,visible){
 const get=(xx,yy)=>xx<0||xx>=16||yy<0||yy>=16?0:visible[yy*16+xx]||0;
 const l=get(x-1,y),r=get(x+1,y),u=get(x,y-1),d=get(x,y+1);
 const n=[get(x-1,y-1),get(x+1,y-1),get(x-1,y+1),get(x+1,y+1)],a=[l,r,u,d],f=[1];
 for(let c=1;c<=3;c++)f.push(a.filter(v=>v===c).length/4);
 for(let c=1;c<=3;c++)f.push(n.filter(v=>v===c).length/4);
 for(let c=1;c<=3;c++)f.push(+(l===c&&r===c),+(u===c&&d===c));
 for(let c=1;c<=3;c++)f.push(+(n[0]===c&&n[3]===c),+(n[1]===c&&n[2]===c));
 f.push(x/15,y/15,(x%2), (y%2),[...a,...n].filter(Boolean).length/8);
 return f;
}
function sigmoidSoftmax(scores){
 const max=Math.max(...scores),out=scores.map(x=>Math.exp(Math.max(-35,x-max)));
 const sum=out.reduce((a,b)=>a+b,0);
 return out.map(x=>x/sum);
}
function predict(features){
 const raw=model.neighborBrain.logits(features);
 const p=sigmoidSoftmax(raw);
 return {p,answer:p.indexOf(Math.max(...p))};
}
function teachOne(f,answer,alpha=.085){
 const {p}=predict(f);
 const weights=model.neighborBrain.weights;
 for(let i=0;i<4;i++){
   const e=(+(i===answer)-p[i])*alpha;
   for(let j=0;j<f.length;j++)weights[i][j]+=e*f[j];
 }
 model.neighborExamples++;
 return -Math.log(Math.max(1e-7,p[answer]));
}
function randomPattern(rand,holdout=false){
 const pic=zeros(),type=Math.floor(rand()*9);
 const color=()=>1+Math.floor(rand()*3);
 const put=(x,y,c)=>{if(x>=0&&x<16&&y>=0&&y<16)pic[y][x]=c;};
 const stroke=(x,y,dx,dy,n,c)=>{for(let j=0;j<n;j++)put(x+dx*j,y+dy*j,c);};
 const x=Math.floor(rand()*13)+1,y=Math.floor(rand()*13)+1,c=color();
 if(type===0){stroke(x,y,1,0,2+Math.floor(rand()*12),c);}
 if(type===1){stroke(x,y,0,1,2+Math.floor(rand()*12),c);}
 if(type===2){stroke(x,y,rand()<.5?1:-1,1,4+Math.floor(rand()*10),c);}
 if(type===3){
   const x0=Math.floor(rand()*12),y0=Math.floor(rand()*12);
   const w=2+Math.floor(rand()*(16-x0)),h=2+Math.floor(rand()*(16-y0));
   for(let yy=y0;yy<Math.min(16,y0+h);yy++)for(let xx=x0;xx<Math.min(16,x0+w);xx++)
     if(yy===y0||yy===y0+h-1||xx===x0||xx===x0+w-1)put(xx,yy,c);
 }
 if(type===4){
   const x0=Math.floor(rand()*10),y0=Math.floor(rand()*10);
   const w=2+Math.floor(rand()*(16-x0)),h=2+Math.floor(rand()*(16-y0));
   for(let yy=y0;yy<Math.min(16,y0+h);yy++)for(let xx=x0;xx<Math.min(16,x0+w);xx++)put(xx,yy,c);
 }
 if(type===5){
   for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)if((xx+yy+Math.floor(rand()*1))%2===0&&rand()>.12)put(xx,yy,c);
 }
 if(type===6){
   let xx=Math.floor(rand()*16),yy=Math.floor(rand()*16);
   for(let n=0;n<30+Math.floor(rand()*50);n++){put(xx,yy,c);xx=clampN(xx+Math.floor(rand()*3)-1,0,15);yy=clampN(yy+Math.floor(rand()*3)-1,0,15);}
 }
 if(type===7){
   // Two intersecting strokes, useful for diagnosing row/column pattern recovery.
   const xx=Math.floor(rand()*16),yy=Math.floor(rand()*16);
   stroke(0,yy,1,0,16,c);stroke(xx,0,0,1,16,rand()<.5?c:color());
 }
 if(type===8){
   for(let n=0;n<20+Math.floor(rand()*70);n++)put(Math.floor(rand()*16),Math.floor(rand()*16),color());
 }
 if(holdout){ // unseen compositions, constructed using an independent RNG
   if(rand()<.65){
      const x1=Math.floor(rand()*16),y1=Math.floor(rand()*16),cc=color();
      stroke(0,y1,1,0,16,cc);stroke(x1,0,0,1,16,cc);
   }
 }
 return pic;
}
function sampleFromPicture(pic,rand,forcePositive=false){
 const cells=[];
 const wantPositive=forcePositive||rand()<.62;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++)if((pic[y][x]!==0)===wantPositive)cells.push(y*16+x);
 if(!cells.length)return null;
 const k=cells[Math.floor(rand()*cells.length)];
 const visible=new Array(256).fill(0);
 const reveal=.27+rand()*.62;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const i=y*16+x;
   if(i!==k&&pic[y][x]&&rand()<reveal)visible[i]=pic[y][x];
 }
 const x=k%16,y=Math.floor(k/16);
 return {features:pixelFeatures(x,y,visible),answer:pic[y][x]};
}
function addCase(c){if(!c)return;recentCases.push(c);if(recentCases.length>MAX_CASES)recentCases.shift();}
// Learning from actual colony corrections, not merely synthetic pictures.
// Capture what the supervisor knew before a due designer rescan. The trainer
// receives the verified response ONLY after the designer sends it.
const originalDesignerTick=P.designerTick;
P.designerTick=function(){
 const records=[];
 for(const [y,due] of this.pending_scans){
  if(this.ticks<due)continue;
  const known=new Array(256).fill(0);
  for(const [k,c] of this.messages)if(!this.tentative.has(k))known[k]=c;
  for(let x=0;x<16;x++){
   const k=y*16+x;
   if(this.tentative.has(k)||this.suspected.has(k)){
    records.push({k,features:pixelFeatures(x,y,known)});
   }
  }
 }
 const result=originalDesignerTick.call(this);
 for(const r of records)if(this.messages.has(r.k)){
    const label=this.messages.get(r.k);
    if(Number.isInteger(label)&&label>=0&&label<=3)
      addCase({features:r.features,answer:label,origin:'verified rescan'});
 }
 return result;
};

let sourcePic=null,sourceLeft=0;
function nextCase(){
 const rand=trainRng;
 if(recentCases.length&&rand()<.22)return recentCases[Math.floor(rand()*recentCases.length)];
 if(sourceLeft<=0){
   sourcePic=rand()<.30?model.target:randomPattern(rand);
   sourceLeft=16;
 }
 sourceLeft--;
 return sampleFromPicture(sourcePic,rand);
}
function batch(n){
 // Mix ordinary task-policy practice with new hard-pixel practice.
 // The old counter represented routine samples, so expose both counts.
 const routine=Math.min(16,Math.max(4,Math.round(n/3)));
 baseTrain.call(model,routine);
 for(let i=0;i<n;i++){
    let candidate=nextCase(),maxLoss=-Infinity;
    // Hard-example mining: draw 3 candidate cases, study the hardest.
    for(let j=0;j<2;j++){
       const c=nextCase();
       if(!c)continue;
       const p=predict(c.features).p,loss=-Math.log(Math.max(1e-7,p[c.answer]));
       if(loss>maxLoss){candidate=c;maxLoss=loss;}
    }
    if(!candidate)continue;
    teachOne(candidate.features,candidate.answer,.045);
    if(maxLoss>1.05&&trainRng()<.15)addCase(candidate);
 }
 autoTrained+=n;
}
P.practiceMaskedPixels=function(n=24){batch(Math.min(500,Math.max(1,Math.floor(n))));};
function evaluate(){
 // Fixed holdout set, never used for training. Does not test full-image success.
 const rr=rng(7461831);
 let good=0,positive=0,negative=0,loss=0,total=0;
 for(let i=0;i<400;i++){
    const target=randomPattern(rr,true),c=sampleFromPicture(target,rr);
    if(!c)continue;
    const q=predict(c.features);
    if(q.answer===c.answer)good++;
    if(c.answer)positive++;else negative++;
    loss+=-Math.log(Math.max(1e-7,q.p[c.answer]));
    total++;
 }
 return {accuracy:total?good/total:0,loss:total?loss/total:0,total,positive,negative};
}
function snapshot(){
 return model.neighborBrain.weights.map(row=>row.slice());
}
function restoreWeights(rows){
 model.neighborBrain.weights=rows.map(row=>row.slice());
}
function scoreTest(){
 const metric=evaluate(),now=metric.accuracy;
 lastScore=now;
 if(bestScore===null||now>bestScore+.001){
   bestScore=now;bestWeights=snapshot();plateau=0;
 }else{
   plateau++;
   // If a bad run overwrote an excellent predictor, keep the best validated one.
   if(bestWeights&&now<bestScore-.04){restoreWeights(bestWeights);lastScore=evaluate().accuracy;}
 }
 history.push({examples:model.examples,neighbor:model.neighborExamples,accuracy:lastScore});
 if(history.length>32)history.shift();
 evalAt=model.neighborExamples;
 updateLearningUI();
 return {accuracy:lastScore,best:bestScore,plateau};
}
function settings(){
 return {forget:model.forget_mode,audit:model.audit_enabled,infer:model.inferMode,
  confidence:model.inferConfidence,challenge:model.challengeEnabled,
  designErrors:model.designErrors,recovery:model.recoveryEnabled,threshold:model.stallThreshold,
  speed:$t('speed')?.value||'5',auto:trainingOn,radio:model.commEnabled};
}
function savePayload(){
 return {version:VERSION,when:Date.now(),brain:model.serialize(),target:model.target.map(row=>row.slice()),
   settings:settings(),learning:{autoTrained,bestScore,lastScore,plateau,history,
    bestWeights,replay:recentCases.slice(-80),recoverySamples:model.recoverySamples}};
}
function saveNow(force=false){
 if(!storageOK)return false;
 try{
   localStorage.setItem(STORE,JSON.stringify(savePayload()));
   lastSaved=Date.now();dirty=false;updateLearningUI();
   return true;
 }catch(err){
   storageOK=false;setStatus('Browser storage unavailable or full. Download SAVE BRAIN as backup.');
   return false;
 }
}
function scheduleSave(){
 dirty=true;
 if(saveTimer!==null)return;
 saveTimer=setTimeout(()=>{saveTimer=null;if(dirty)saveNow();},2500);
}
function loadSave(){
 try{
  const raw=localStorage.getItem(STORE);
  if(!raw)return false;
  const data=JSON.parse(raw);
  if(data.version!==VERSION||!data.brain||!data.target)throw Error('Invalid autosave');
  const savedTarget=model.target.map(row=>row.slice()),fallback=model.serialize();
  try{
   model.load(data.brain);
   model.newPicture(data.target);
  }catch(e){model.load(fallback);model.newPicture(savedTarget);throw e;}
  const s=data.settings||{};
  model.forget_mode=['off','adaptive','hard'].includes(s.forget)?s.forget:model.forget_mode;
  model.audit_enabled=s.audit!==false;
  model.inferMode=['off','cautious','bold'].includes(s.infer)?s.infer:model.inferMode;
  model.inferConfidence=clampN(Number(s.confidence)||.84,.52,.98);
  model.challengeEnabled=s.challenge!==false;
  model.designErrors=s.designErrors===true;
  if(s.radio!==undefined)model.commEnabled=s.radio!==false;
  model.recoveryEnabled=s.recovery!==false;
  model.stallThreshold=clampN(Number(s.threshold)||28,12,80);
  if(s.speed&&$t('speed')){$t('speed').value=s.speed;$t('speedLabel').textContent=s.speed+'×';}
  trainingOn=s.auto===true;
  const l=data.learning||{};
  autoTrained=Math.max(0,Number(l.autoTrained)||0);
  bestScore=typeof l.bestScore==='number'&&Number.isFinite(l.bestScore)?l.bestScore:null;
  lastScore=typeof l.lastScore==='number'&&Number.isFinite(l.lastScore)?l.lastScore:null;
  plateau=Math.max(0,Math.floor(Number(l.plateau)||0));
  history=Array.isArray(l.history)?l.history.slice(-32):[];
  if(Array.isArray(l.bestWeights)&&l.bestWeights.length===4&&
   l.bestWeights.every(w=>Array.isArray(w)&&w.length===24&&w.every(Number.isFinite)))bestWeights=l.bestWeights;
  if(Array.isArray(l.replay))for(const c of l.replay.slice(-80))
    if(c?.features?.length===24&&Number.isInteger(c.answer)&&c.answer>=0&&c.answer<=3&&c.features.every(Number.isFinite))addCase(c);
  lastSaved=data.when||0;
  return true;
 }catch(e){
  setStatus('Autosave could not be restored. Starter brain retained.');
  return false;
 }
}
function updateLearningUI(){
 if(!$t('autoToggle'))return;
 $t('autoToggle').textContent=trainingOn?'Ⅱ AUTO-TRAIN ON':'▶ AUTO-TRAIN OFF';
 $t('autoState').textContent=!trainingOn?'OFF':!quiet()?'PAUSED / TAB HIDDEN':'LEARNING';
 $t('autoSamples').textContent=autoTrained.toLocaleString();
 $t('neighborSamples').textContent=model.neighborExamples.toLocaleString();
 $t('holdout').textContent=lastScore===null?'–':(100*lastScore).toFixed(1)+'%';
 $t('bestHoldout').textContent=bestScore===null?'–':(100*bestScore).toFixed(1)+'%';
 $t('plateau').textContent=plateau;
 $t('saveState').textContent=!storageOK?'UNAVAILABLE':!lastSaved?'READY':dirty?'CHANGED':'SAVED';
}
function autoLoop(){
 autoTimer=null;
 if(trainingOn&&quiet()&&!trainingBusy&&!busy){
   trainingBusy=true;
   try{
      batch(24);
      autoRounds++;
      if(model.neighborExamples-evalAt>=1000){
         const result=scoreTest();
         setStatus(result.plateau>=4?
          'Validation plateau: the existing neighbor sensors or tiny model may be the limit. Still practicing hard cases.':
          'Practicing new shapes and uncertain pixels. Held-out accuracy '+(100*result.accuracy).toFixed(1)+'%.');
      }
      scheduleSave();
   }catch(err){trainingOn=false;setStatus('Auto-training stopped: '+err.message);}
   finally{trainingBusy=false;}
   if(autoRounds%4===0)updateLearningUI();
 }
 autoTimer=setTimeout(autoLoop,trainingOn?150:1200);
}
const initialStorage=(()=>{
 try{if(typeof localStorage==='undefined')return false;
  const key=STORE+'.test';localStorage.setItem(key,'1');localStorage.removeItem(key);return true;
 }catch(e){return false;}
})();
storageOK=initialStorage;
const pane=document.createElement('div');pane.className='group';
pane.innerHTML='<h3>LEARNING LAB · v0.5</h3>'+
 '<div class="controls"><button id="autoToggle">▶ AUTO-TRAIN OFF</button>'+
 '<button id="learnEvaluate">TEST HELD-OUT</button><button id="saveLocalNow">SAVE NOW</button></div>'+
 '<div class="statbar"><span>Auto samples <b id="autoSamples">0</b></span>'+
 '<span>Neighbor lessons <b id="neighborSamples">0</b></span>'+
 '<span>Held-out <b id="holdout">–</b></span>'+
 '<span>Best <b id="bestHoldout">–</b></span>'+
 '<span>Plateau checks <b id="plateau">0</b></span>'+
 '<span>Autosave <b id="saveState">READY</b></span>'+
 '<span>Trainer <b id="autoState">OFF</b></span></div>'+
 '<div class="readout" id="learnState" style="margin-top:9px;min-height:60px">'+
 'Held-out score tests predicted pixel colors from partial neighbor information, not overall image success.</div>'+
 '<p class="tinyhint">AUTOSAVE is on when browser storage is available: it keeps your drawing, brain weights, settings and lesson history on this device. The current simulation restarts after reload. AUTO-TRAIN runs only while this tab is open and visible, pauses when hidden, and resumes when you return. Download SAVE BRAIN for an independent backup.</p>';
document.querySelector('.options').appendChild(pane);
const hadExistingSave=storageOK&&!!localStorage.getItem(STORE);
const didLoad=storageOK&&loadSave();
if(lastScore===null){scoreTest();}
if(didLoad){status('Restored your saved CellCanvas drawing and learned weights. Workshop reset to start of the picture.');}
else if(storageOK){status(hadExistingSave?'The stored checkpoint was invalid. Starter brain retained. Download SAVE BRAIN for portable backups.':'v0.5 ready. Browser autosave enabled. Turn on AUTO-TRAIN for continued practice while this tab is visible.');}
else{status('v0.5 ready. Local storage blocked; use SAVE BRAIN for manual backups.');}
$t('autoToggle').onclick=()=>{
 trainingOn=!trainingOn;
 scheduleSave();updateLearningUI();
 setStatus(trainingOn?'Auto-training enabled. Training pauses if this tab becomes hidden.':'Auto-training stopped. Learned weights kept.');
};
$t('learnEvaluate').onclick=()=>{
 const metrics=scoreTest();
 scheduleSave();
 setStatus('Held-out masked-pixel quiz: '+(metrics.accuracy*100).toFixed(1)+'% correct, '+metrics.plateau+' checks without a new best. This is NOT a full-picture benchmark.');
};
$t('saveLocalNow').onclick=()=>{const ok=saveNow(true);setStatus(ok?'Saved to this browser. Use SAVE BRAIN for a portable backup.':'Browser storage unavailable. Use SAVE BRAIN instead.');};
const prevRender=render;
render=function(){prevRender();updateLearningUI();scheduleSave();};
const oldTrain=$t('train').onclick;
$t('train').onclick=async function(){trainingOn=false;updateLearningUI();await oldTrain.call(this);scoreTest();scheduleSave();};
const oldLoad=$t('load').onclick;
$t('fileInput').addEventListener('change',()=>setTimeout(()=>{scoreTest();scheduleSave();},200));
const oldStarter=$t('reloadDefault').onclick;
$t('reloadDefault').onclick=function(){oldStarter.call(this);scoreTest();scheduleSave();};
if(typeof window!=='undefined'){
 window.addEventListener('pagehide',()=>saveNow(true));
 window.addEventListener('beforeunload',()=>saveNow(true));
}
if(typeof document.addEventListener==='function'){
 document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow(true);updateLearningUI();});
}
document.querySelector('h1').innerHTML='CELLCANVAS <span style="color:var(--mint)">v0.5</span>';
document.title='CellCanvas v0.5 | Learning Lab • Forge Testbench';
document.querySelector('.header p').textContent='The little image-making colony now saves its brain locally and practices on new, deliberately incomplete patterns. See whether additional lessons actually improve prediction.';
render();
autoTimer=setTimeout(autoLoop,400);
})();
