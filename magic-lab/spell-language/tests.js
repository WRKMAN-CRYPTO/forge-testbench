/* Spell-Language offline test suite. Run: node tests.js
   IMPORTANT: This does not launch Arcane Lab or connect to Matter. */
"use strict";
const SL=require("./engine.js");
const sample=require("./stormglass.draft.json");
let passed=0;
function ok(test,label){
 if(!test)throw new Error("FAIL: "+label);
 passed++;
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function clone(o){return JSON.parse(JSON.stringify(o));}
function simulate(recipe,inputs,max=100){
 let state=SL.createState(recipe),actions=[];
 for(let tick=0;tick<max&&state.status==="running";tick++){
  const result=SL.step(recipe,state,inputs[tick]||{});
  if(result.intents.length>1)throw Error("More than one intent in a tick");
  actions.push(...result.intents);
  state=result.state;
 }
 return {state,actions};
}
ok(SL.validate(sample).ok,"Stormglass schema validation");
ok(SL.validate({...sample,status:"active"}).ok===false,
 "active status forbidden at v0.1");
const observations=Array.from({length:20},(_,i)=>({
 "cluster.converged":i>=3,"target.frozen":i>=6,"vapor.present":i>=9
}));
const result=simulate(sample,observations);
ok(result.state.status==="completed","condition-driven recipe completion");
ok(same(result.actions.map(a=>a.effect),
 ["gravity.well","frost.field","flame.field","lightning.arc"]),
 "ordered four-stage casting intentions");
ok(result.actions.every(a=>a.kind==="CAST_INTENT"&&a.approval==="required"),
 "no authorized spell casts from interpreter");
ok(result.state.spent===SL.COST["gravity.well"]+
 SL.COST["frost.field"]+SL.COST["flame.field"]+SL.COST["lightning.arc"],
 "resource cost is deterministic");
const stalled=simulate(sample,[],40).state;
ok(stalled.status==="failed"&&stalled.failure==="wait_timeout:cluster.converged",
 "observation timeout fails closed");
const evil=clone(sample);evil.program[1]={op:"EVAL",code:"window.alert(1)"};
ok(!SL.validate(evil).ok,"arbitrary code rejected");
const extra=clone(sample);extra.program[1].callback="unsafe";
ok(!SL.validate(extra).ok,"unknown args rejected");
const unlicensed=clone(sample);unlicensed.program[1].spell="win.everything";
ok(!SL.validate(unlicensed).ok,"unknown spell rejected");
const overCost=clone(sample);overCost.program.splice(8,0,
 {op:"CAST",spell:"lightning.arc"},{op:"CAST",spell:"lightning.arc"});
ok(!SL.validate(overCost).ok,"overbudget spell sequence rejected");
const waiting=clone(sample);
waiting.program=[
 {op:"FOCUS",selector:"self"},
 {op:"WAIT",ticks:2},{op:"CAST",spell:"arc.bolt"},{op:"END"}
];
const waitState=simulate(waiting,[{},{},{}]);
ok(waitState.actions.length===1&&waitState.actions[0].tick===3,
 "fixed WAIT delays execution two ticks");
const branch=clone(sample);
branch.program=[
 {op:"FOCUS",selector:"self"},
 {op:"IF",test:"vapor.present",skip:1},
 {op:"CAST",spell:"lightning.arc"},
 {op:"CAST",spell:"arc.bolt"},
 {op:"END"}
];
ok(SL.validate(branch).ok,"safe forward IF compiles");
const skipped=simulate(branch,Array.from({length:5},()=>({})));
ok(same(skipped.actions.map(a=>a.effect),["arc.bolt"]),
 "unmet condition skips lightning");
const fork=SL.forkDraft(sample,{id:"stormglass.child-1",name:"Stormglass / Child"});
ok(fork.status==="draft"&&fork.lineage.rootId===sample.id&&
 fork.lineage.parentId===sample.id&&fork.lineage.generation===1,
 "lineage captures parent and generation");
fork.program[1].spell="arc.bolt";
ok(sample.program[1].spell==="gravity.well","parent program never mutates");
const attempts=[
 {id:"a",casts:["frost.field","flame.field"],success:true},
 {id:"b",casts:["frost.field","flame.field"],success:true},
 {id:"c",casts:["frost.field","flame.field"],success:true},
 {id:"d",casts:["frost.field","flame.field"],success:false}
];
const proposal=SL.suggestFromRuns(attempts);
ok(proposal.length===1&&proposal[0].status==="suggestion-only"&&
 proposal[0].successfulRuns===3&&proposal[0].attempts===4,
 "evidence-based suggestion without promotion");
ok(SL.suggestFromRuns(attempts.slice(0,2)).length===0,
 "insufficient repetition generates nothing");
const tooLong=clone(sample);
tooLong.program.splice(8,0,...Array.from({length:30},()=>({op:"WAIT",ticks:1})));
ok(!SL.validate(tooLong).ok,"instruction count bound enforced");
const src=JSON.stringify(result.actions);
ok(!src.includes("execute")&&!src.includes("authorized"),
 "no game execution included in intents");
const missingFocus=clone(sample);
missingFocus.id="target-guard";missingFocus.lineage.rootId="target-guard";
missingFocus.program=[
 {op:"IF",test:"vapor.present",skip:1},
 {op:"FOCUS",selector:"self"},
 {op:"CAST",spell:"arc.bolt"},
 {op:"END"}
];
const guard=SL.step(missingFocus,SL.createState(missingFocus),{});
ok(guard.state.status==="failed"&&guard.state.failure==="target_not_selected"&&
 guard.intents.length===0,"skipped focus fails closed");
const twice=simulate(sample,observations);
ok(same(result,twice),"same observations give identical replay");
console.log("Spell-Language dormant tests: "+passed+" passed");
