/* Browser-free smoke tests for CellCanvas's exact shipped scripts. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ext=fs.readFileSync(path.join(root,'supervisor-inference.js'),'utf8');
const recovery=fs.readFileSync(path.join(root,'recovery-loop.js'),'utf8');
const learning=fs.readFileSync(path.join(root,'learning-lab.js'),'utf8');
const found=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert(found,'Main CellCanvas script should exist');
const starter=html.match(/<script id="starterWeights" type="application\/json">([\s\S]*?)<\/script>/);
assert(starter,'Starter weights should exist');
const elements=new Map();
const localStore=new Map();
const localStorage={getItem(k){return localStore.get(k)??null;},setItem(k,v){localStore.set(k,String(v));},removeItem(k){localStore.delete(k);}};
function el(key){
 if(!elements.has(key)){
  const ctx2d=new Proxy({canvas:{width:512,height:512}}, {get:(o,k)=> k in o?o[k]:(()=>{})});
  const obj={id:key,style:{},textContent:'',innerHTML:'',value:key==='speed'?'1':'84',dataset:{},classList:{add(){},remove(){},toggle(){}},parentElement:{insertBefore(){}},appendChild(){},addEventListener(){},setPointerCapture(){},getContext(){return ctx2d;},getBoundingClientRect(){return {left:0,top:0,width:512,height:512}}};
  if(key==='starterWeights')obj.textContent=starter[1];
  elements.set(key,obj);
 }
 return elements.get(key);
}
const document={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],createElement:s=>el('created-'+s+'-'+elements.size),title:''};
const sandbox=vm.createContext({document,console,Math,JSON,Map,Set,Array,Object,Number,Promise,Date,localStorage,
 setTimeout(){return 0;},clearTimeout(){},Blob:class{},URL:{createObjectURL(){return ''},revokeObjectURL(){}}});
vm.runInContext(found[1],sandbox,{filename:'cellcanvas/index.html'});
vm.runInContext(ext,sandbox,{filename:'supervisor-inference.js'});
vm.runInContext(recovery,sandbox,{filename:'recovery-loop.js'});
vm.runInContext(learning,sandbox,{filename:'learning-lab.js'});
const model=vm.runInContext('model',sandbox);
assert(model.neighborBrain,'Predictor constructed');
assert.equal(model.neighborBrain.inputs,24);
assert.equal(model.neighborBrain.outputs,4);
assert.equal(model.neighborExamples,3500,'Warm start performed');
assert.equal(model.inferMode,'cautious');
assert(document.title.includes('v0.5'));
assert.equal(model.recoveryBrain.weights.flat().length,40);
assert.equal(model.recoverySamples,4500);
assert.equal(model.neighborBrain.weights.flat().length,96);
const picture=vm.runInContext("shape('heart')",sandbox);
model.forget_mode='hard';model.audit_enabled=false;model.inferMode='off';model.newPicture(picture);
model.run(400);
const noInference={wrong:model.wrong,guesses:model.guessesMade};
assert(noInference.wrong>0,'Without audits or guessing, omissions should remain');
model.audit_enabled=true;model.inferMode='cautious';model.newPicture(picture);
const win=model.run(400);
assert(win,'Cautious supervisors should still complete a heart through verification');
const supervised={wrong:model.wrong,guesses:model.guessesMade,audits:model.audit_requests,confirmed:model.guessesConfirmed,errors:model.guessesWrong};
assert(supervised.audits>0);
model.audit_enabled=false;model.inferMode='cautious';model.inferConfidence=.65;model.newPicture(picture);
model.run(400);
const solo={wrong:model.wrong,guesses:model.guessesMade};
assert(solo.guesses>0,'Supervisors should propose pixels even when audits are switched off');
const brain=model.serialize();
assert.equal(brain.format,'cellcanvas.v4');
assert.equal(brain.recoveryBrain.weights.length,4);
assert.equal(brain.neighborBrain.weights.length,4);
model.load(brain);
assert.equal(model.neighborExamples,brain.neighborExamples);
model.inferMode='bold';model.challengeEnabled=true;model.audit_enabled=true;model.designErrors=true;
model.forget_mode='off';model.newPicture(vm.runInContext("shape('checker')",sandbox));
model.run(400);
const disputed={injected:model.corruptPackets,challenges:model.challengeCount,valid:model.challengesCorrect,false:model.challengesIncorrect,wrong:model.wrong};
assert(disputed.injected>0,'Test should include altered designer packets');
// A solid block offers abundant independent neighbor evidence.
const solid=Array.from({length:16},(_,y)=>Array.from({length:16},(_,x)=>x>=3&&x<=12&&y>=3&&y<=12?2:0));
model.rng=vm.runInContext('randomGenerator(177)',sandbox);
model.newPicture(solid);
model.run(500);
const solidDispute={injected:model.corruptPackets,challenges:model.challengeCount,valid:model.challengesCorrect,false:model.challengesIncorrect,wrong:model.wrong,scans:model.audit_requests};
assert(solidDispute.injected>0,'Injected corruption should be present in solid block');
assert(solidDispute.challenges>0,'Supervisors should challenge some suspicious designer pixels');
// Deliberately suppress the old rescan policy. Autonomous recovery must notice
// the unserviced designer gaps through observable information and act.
model.forget_mode='hard';
model.designErrors=false;
model.inferMode='off';
model.audit_enabled=true;
model.recoveryEnabled=true;
model.stallThreshold=12;
model.auditor.weights[0].fill(2);
model.auditor.weights[1].fill(-2);
model.rng=vm.runInContext('randomGenerator(19)',sandbox);
model.newPicture(vm.runInContext("shape('cross')",sandbox));
model.run(500);
const rescue={wrong:model.wrong,attempts:model.recoveryCount,useful:model.recoveryUseful,
 audits:model.audit_requests,last:model.recoveryLastAction,log:model.recoveryLog};
assert(rescue.attempts>0,'A stalled colony should make at least one recovery decision');
assert(rescue.audits>0,'An autonomous supervisor should be able to ask for a rescan');
assert(rescue.useful>0,'At least one intervention should lead to observed progress');
// Turning recovery off should expose the same stalled failure.
model.recoveryEnabled=false;
model.rng=vm.runInContext('randomGenerator(19)',sandbox);
model.newPicture(vm.runInContext("shape('cross')",sandbox));
model.run(500);
const noRescue={wrong:model.wrong,attempts:model.recoveryCount};
assert.equal(noRescue.attempts,0,'Recovery off must really disable interventions');
assert(noRescue.wrong>0,'With original auditing suppressed, omissions should remain');
// The user-facing one-tap experiment must visibly reproduce a stalled colony.
model.rng=vm.runInContext('randomGenerator(19)',sandbox);
el('stallChallenge').onclick();
assert.equal(model.stallChallenge,true);
assert.equal(model.audit_enabled,true);
assert.equal(model.inferMode,'off');
assert.equal(model.forget_mode,'hard');
const challengeSuccess=model.run(500);
const challenge={success:challengeSuccess,wrong:model.wrong,attempts:model.recoveryCount,useful:model.recoveryUseful};
assert(challenge.attempts>0,'Stall Challenge must invoke supervisor recovery');
assert(challenge.success,'Stall Challenge should recover the cross pattern');
el('stallChallenge').onclick();
assert.equal(model.stallChallenge,false,'Challenge switch should restore normal mode');
// v0.5: train on varied masked images and verify the on-device checkpoint.
const baselineHoldout=Number(el('holdout').textContent.replace('%',''));
const beginExamples=model.neighborExamples,beginWeights=JSON.stringify(model.neighborBrain.weights);
model.practiceMaskedPixels(320);
assert(model.neighborExamples>beginExamples+320,'New masked examples must count separately');
assert.notEqual(JSON.stringify(model.neighborBrain.weights),beginWeights,'New lessons should update predictor weights');
const currentTarget=model.target.map(row=>row.slice());
el('saveLocalNow').onclick();
const saved=JSON.parse(localStorage.getItem('wrkman.cellcanvas.autosave.v5'));
assert.equal(saved.version,5);
assert.equal(saved.brain.format,'cellcanvas.v4');
assert.equal(saved.brain.neighborExamples,model.neighborExamples);
assert.deepEqual(saved.target,currentTarget);
assert(saved.learning.bestScore>=0&&saved.learning.bestScore<=1,'Validation should track a bounded score');
el('autoToggle').onclick();
assert(el('autoToggle').textContent.includes('ON'));
el('autoToggle').onclick();
assert(el('autoToggle').textContent.includes('OFF'));
el('learnEvaluate').onclick();
const autosave={brainSamples:saved.brain.neighborExamples,
  holdout:saved.learning.bestScore,bytes:localStorage.getItem('wrkman.cellcanvas.autosave.v5').length};
const priorHoldout=Number(el('holdout').textContent.replace('%',''));
model.practiceMaskedPixels(500);
el('learnEvaluate').onclick();
const trainedHoldout=Number(el('holdout').textContent.replace('%',''));
const learningCheck={baselineHoldout,priorHoldout,trainedHoldout,improvement:trainedHoldout-baselineHoldout};
assert(Number.isFinite(trainedHoldout),'Validation must yield a numeric score');
// Simulate a second browser page using the same localStorage to prove restoration.
const restoredCells=new Map(),queued=[];
function el2(key){
 if(!restoredCells.has(key)){
  const ctx2d=new Proxy({canvas:{width:512,height:512}},{get:(o,k)=> k in o?o[k]:(()=>{})});
  const obj={id:key,style:{},textContent:'',innerHTML:'',value:key==='speed'?'5':'84',dataset:{},classList:{add(){},remove(){},toggle(){}},parentElement:{insertBefore(){}},appendChild(){},addEventListener(){},setPointerCapture(){},getContext(){return ctx2d;},getBoundingClientRect(){return {left:0,top:0,width:512,height:512}}};
  if(key==='starterWeights')obj.textContent=starter[1];
  restoredCells.set(key,obj);
 }
 return restoredCells.get(key);
}
const document2={getElementById:el2,querySelector:s=>el2(s),querySelectorAll:()=>[],createElement:t=>el2('created-'+t+'-'+restoredCells.size),title:'',hidden:false,addEventListener(){}};
const sandbox2=vm.createContext({document:document2,console,Math,JSON,Map,Set,Array,Object,Number,Promise,Date,localStorage,
 setTimeout(fn,delay){queued.push({fn,delay});return queued.length;},clearTimeout(){},Blob:class{},URL:{createObjectURL(){return ''},revokeObjectURL(){}}});
vm.runInContext(found[1],sandbox2,{filename:'reloaded-index.html'});
vm.runInContext(ext,sandbox2,{filename:'reloaded-supervisor-inference.js'});
vm.runInContext(recovery,sandbox2,{filename:'reloaded-recovery-loop.js'});
vm.runInContext(learning,sandbox2,{filename:'reloaded-learning-lab.js'});
const model2=vm.runInContext('model',sandbox2);
assert.equal(model2.neighborExamples,saved.brain.neighborExamples,'Brain sample count survives reload');
assert.equal(JSON.stringify(model2.neighborBrain.weights),JSON.stringify(saved.brain.neighborBrain.weights),'Weights survive reload');
assert.equal(JSON.stringify(model2.target),JSON.stringify(saved.target),'Drawing survives reload');
const preAuto=model2.neighborExamples;
el2('autoToggle').onclick();
const firstAuto=queued.find(t=>t.delay===400);
assert(firstAuto,'Auto trainer should schedule a browser timer');
firstAuto.fn();
assert(model2.neighborExamples>preAuto,'Auto trainer should make progress during active session');
const pausedAt=model2.neighborExamples;
document2.hidden=true;
const pausedLoop=queued.filter(t=>t.delay===150).at(-1);
assert(pausedLoop,'Auto trainer should reschedule itself');
pausedLoop.fn();
assert.equal(model2.neighborExamples,pausedAt,'Auto trainer should pause on hidden tab');
el2('autoToggle').onclick();
const restored={weights:4*24,startedAt:preAuto,afterAuto:model2.neighborExamples,autoPaused:true};
console.log(JSON.stringify({PASS:true,noInference,supervised,solo,disputed,solidDispute,rescue,noRescue,challenge,autosave,learningCheck,restored},null,2));