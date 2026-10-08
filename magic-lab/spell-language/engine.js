/*
 * WRKMAN / SPELL-LANGUAGE
 * Status: DORMANT v0.1 DRAFT. Not imported by Arcane Lab.
 * Deterministic offline intent planner, NOT a spell executor.
 * No browser APIs, timers, storage, physics writes, or network calls.
 * Deliberately forward-only with finite time, instructions, emissions and energy.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module&&module.exports)module.exports=api;
  else if(root)root.WRKMAN_SPELL_LANGUAGE_DRAFT=api;
})(typeof globalThis==="object"?globalThis:null,function(){
  "use strict";

  const FORMAT="wrkman.sl/0.1-draft";
  const LIMITS=Object.freeze({
    instructions:24, casts:8, ticks:240, energy:44,
    waitTicks:60, observationWaitTicks:90, runs:200
  });
  // Temporary authoring weights, NOT Arcane Lab mana or balance data.
  const COST=Object.freeze({
    "arc.bolt":4,"gravity.well":10,"frost.field":8,
    "flame.field":9,"lightning.arc":12,
    "kinetic.pulse":6,"detonation":8
  });
  const SELECTORS=Object.freeze([
    "enemy_cluster","nearest_enemy","aim_point","self"
  ]);
  const TESTS=Object.freeze([
    "target.found","cluster.converged","target.frozen",
    "vapor.present","target.wet","target.alive","cloud.charged"
  ]);
  const OPS=Object.freeze(["FOCUS","CAST","UNTIL","WAIT","IF","END"]);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const whole=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
  const plain=o=>o!==null&&typeof o==="object"&&!Array.isArray(o);
  const string=(v,n)=>typeof v==="string"&&v.length>0&&v.length<=n;
  const safeId=v=>string(v,80)&&/^[a-z0-9][a-z0-9._:/-]*$/i.test(v);
  const fail=reason=>({ok:false,error:reason});
  const successful=()=>({ok:true,error:null});

  function validate(recipe){
    if(!plain(recipe))return fail("recipe must be an object");
    if(recipe.format!==FORMAT)return fail("unsupported format");
    if(!safeId(recipe.id)||!string(recipe.name,80))return fail("invalid recipe identity");
    if(recipe.status!=="draft")return fail("only draft recipes are supported");
    if(!whole(recipe.version,1,9999))return fail("invalid revision");
    const lin=recipe.lineage;
    if(!plain(lin)||!safeId(lin.rootId)||!whole(lin.generation,0,9999)||
       !(lin.parentId===null||safeId(lin.parentId)))
      return fail("invalid lineage");
    if(lin.generation===0&&(lin.parentId!==null||lin.rootId!==recipe.id))
      return fail("founder lineage must begin at its own root");
    if(lin.generation>0&&lin.parentId===null)
      return fail("descendant lineage needs a parent");
    if(!Array.isArray(recipe.program)||recipe.program.length<2||
       recipe.program.length>LIMITS.instructions)return fail("invalid program length");
    if(recipe.program.at(-1)?.op!=="END")return fail("last instruction must be END");
    let totalCost=0,castCount=0,hasFocus=false;
    for(let i=0;i<recipe.program.length;i++){
      const op=recipe.program[i];
      if(!plain(op)||!OPS.includes(op.op))return fail("unknown opcode at "+i);
      const wanted={
        FOCUS:["op","selector"],CAST:["op","spell"],
        UNTIL:["op","test","timeout"],WAIT:["op","ticks"],
        IF:["op","test","skip"],END:["op"]
      }[op.op];
      if(Object.keys(op).some(k=>!wanted.includes(k))||
         wanted.some(k=>!own(op,k)))return fail("invalid instruction arguments at "+i);
      if(op.op==="FOCUS"){
        if(!SELECTORS.includes(op.selector))return fail("unknown selector at "+i);
        hasFocus=true;
      }else if(op.op==="CAST"){
        if(!own(COST,op.spell))return fail("unknown effect at "+i);
        totalCost+=COST[op.spell];castCount++;
        if(!hasFocus)return fail("CAST requires FOCUS before it");
      }else if(op.op==="WAIT"){
        if(!whole(op.ticks,1,LIMITS.waitTicks))return fail("invalid WAIT at "+i);
      }else if(op.op==="UNTIL"){
        if(!TESTS.includes(op.test)||!whole(op.timeout,1,LIMITS.observationWaitTicks))
          return fail("invalid UNTIL at "+i);
      }else if(op.op==="IF"){
        if(!TESTS.includes(op.test)||!whole(op.skip,1,recipe.program.length-i-2))
          return fail("IF must skip forward within the program at "+i);
      }else if(i!==recipe.program.length-1){
        return fail("END is allowed only as final instruction");
      }
    }
    if(castCount===0||castCount>LIMITS.casts)return fail("invalid number of casts");
    if(totalCost>LIMITS.energy)return fail("draft energy budget exceeded");
    return successful();
  }

  function assertRecipe(recipe){
    const result=validate(recipe);
    if(!result.ok)throw new Error(result.error);
  }

  function createState(recipe){
    assertRecipe(recipe);
    return {
      recipeId:recipe.id,pc:0,tick:0,status:"running",
      focus:null,spent:0,emitted:0,waitPC:null,waitStart:null,
      failure:null,history:[]
    };
  }

  function step(recipe,previous,observation={}){
    assertRecipe(recipe);
    if(!plain(previous)||previous.recipeId!==recipe.id||
       !whole(previous.pc,0,recipe.program.length-1)||
       !whole(previous.tick,0,LIMITS.ticks)||
       !["running","completed","failed"].includes(previous.status))
      throw new Error("invalid interpreter state");
    // Only the game adapter may supply world facts. No direct physics reads.
    const facts=plain(observation)?observation:{};
    const state={
      ...previous,history:Array.isArray(previous.history)?
        previous.history.slice(-LIMITS.casts):[],
      tick:previous.tick+(previous.status==="running"?1:0)
    };
    if(previous.status!=="running")return {state,intents:[]};
    if(state.tick>LIMITS.ticks){
      state.status="failed";state.failure="tick_budget";return {state,intents:[]};
    }
    const intents=[];
    for(let steps=0;steps<recipe.program.length;steps++){
      const op=recipe.program[state.pc];
      if(!op){state.status="failed";state.failure="invalid_pc";break;}
      if(op.op==="FOCUS"){
        state.focus=op.selector;state.pc++;
        state.waitPC=null;state.waitStart=null;
      }else if(op.op==="IF"){
        state.pc+=facts[op.test]===true?1:op.skip+1;
        state.waitPC=null;state.waitStart=null;
      }else if(op.op==="WAIT"||op.op==="UNTIL"){
        if(state.waitPC!==state.pc){
          state.waitPC=state.pc;state.waitStart=state.tick;
        }
        const ready=op.op==="WAIT"?
          state.tick-state.waitStart>=op.ticks:facts[op.test]===true;
        if(ready){
          state.pc++;state.waitPC=null;state.waitStart=null;
        }else if(op.op==="UNTIL"&&state.tick-state.waitStart>=op.timeout){
          state.status="failed";state.failure="wait_timeout:"+op.test;
          break;
        }else{
          break;
        }
      }else if(op.op==="CAST"){
        // Branches can skip FOCUS. A missing selection must fail closed even
        // if the linear validator saw a FOCUS somewhere earlier.
        if(!state.focus){
          state.status="failed";state.failure="target_not_selected";break;
        }
        // The interpreter NEVER calls the game. It returns a proposal only.
        const price=COST[op.spell];
        if(state.emitted>=LIMITS.casts||state.spent+price>LIMITS.energy){
          state.status="failed";state.failure="action_budget";break;
        }
        const intent={
          kind:"CAST_INTENT",recipeId:recipe.id,pc:state.pc,
          tick:state.tick,effect:op.spell,targetSelector:state.focus,
          estimatedEnergy:price,approval:"required"
        };
        intents.push(intent);
        state.history.push({...intent});
        state.emitted++;state.spent+=price;state.pc++;
        break; // at most ONE side-effect proposal per tick
      }else if(op.op==="END"){
        state.status="completed";break;
      }
    }
    return {state,intents};
  }

  // A repeated successful sequence becomes a SUGGESTION, not a spell.
  // Each run is an explicit, independent attempt; no background monitoring.
  function suggestFromRuns(runs,{minimum=3}={}){
    if(!Array.isArray(runs)||runs.length>LIMITS.runs||
       !whole(minimum,2,20))throw new Error("invalid run collection");
    const groups=new Map(),usedIds=new Set();
    for(const run of runs){
      if(!plain(run)||!safeId(run.id)||usedIds.has(run.id))
        throw new Error("runs require distinct safe IDs");
      usedIds.add(run.id);
      if(!Array.isArray(run.casts)||run.casts.length<2||run.casts.length>LIMITS.casts)
        throw new Error("each run needs 2 to 8 casts");
      if(run.casts.some(spell=>!own(COST,spell)))throw new Error("unknown cast in run");
      if(run.success!==true&&run.success!==false)
        throw new Error("success must be an explicit boolean");
      const key=run.casts.join("|");
      const value=groups.get(key)||{casts:run.casts.slice(),runs:0,successfulRuns:0,runIds:[]};
      value.runs++;
      if(run.success){value.successfulRuns++;value.runIds.push(run.id);}
      groups.set(key,value);
    }
    return [...groups.values()]
      .filter(v=>v.successfulRuns>=minimum)
      .sort((a,b)=>b.successfulRuns-a.successfulRuns||
        a.casts.join("|").localeCompare(b.casts.join("|")))
      .map(v=>({
        status:"suggestion-only",signature:v.casts.join(" > "),
        casts:v.casts,successfulRuns:v.successfulRuns,
        attempts:v.runs,evidenceRunIds:v.runIds
      }));
  }

  // Forking is explicit, always draft, and produces a new value.
  // Program inheritance never authorizes automatic mutation/deployment.
  function forkDraft(parent,{id,name,program}={}){
    assertRecipe(parent);
    if(!safeId(id)||id===parent.id)throw new Error("fork requires new ID");
    const child={
      format:FORMAT,id,name:name||parent.name,version:parent.version+1,
      status:"draft",
      lineage:{rootId:parent.lineage.rootId,parentId:parent.id,
        generation:parent.lineage.generation+1},
      program:JSON.parse(JSON.stringify(program||parent.program))
    };
    assertRecipe(child);
    return child;
  }

  return Object.freeze({
    FORMAT,LIMITS,COST,SELECTORS,TESTS,OPS,
    validate,createState,step,suggestFromRuns,forkDraft
  });
});
