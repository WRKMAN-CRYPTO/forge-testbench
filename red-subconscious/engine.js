/* RED // SUBCONSCIOUS v0.2. The same generic rules handle every environment. */
(function(root){
"use strict";
const MAX_EVENTS=600,MAX_WORDS=2200;
const words=s=>(String(s||"").toUpperCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]).slice(0,48);
const unique=a=>Array.from(new Set(a));
const key=a=>unique(a).slice().sort().join("\u001f");
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(+n)?+n:min));
function create(){
 let state={version:2,words:{},events:[],episode:1,sequence:0,probes:0,surprises:0},pending=null;
 function seen(w){if(!state.words[w]){if(Object.keys(state.words).length>=MAX_WORDS)return;state.words[w]={seen:0}}state.words[w].seen=Math.min(999999,state.words[w].seen+1)}
 function frequency(){const freq={};for(const e of state.events)for(const w of e.words)freq[w]=(freq[w]||0)+1;return freq}
 function similarity(a,b,freq){
  if(!a.length||!b.length)return 0;
  const A=new Set(a),B=new Set(b),wt=w=>Math.pow(1+Math.log(1+(state.events.length+1)/(1+(freq[w]||0))),2);let inter=0,x=0,y=0;
  for(const w of A){const v=wt(w);x+=v;if(B.has(w))inter+=v}
  for(const w of B)y+=wt(w);
  return x&&y?inter/Math.sqrt(x*y):0;
 }
 function transitions(){const out=[];for(let i=1;i<state.events.length;i++)if(state.events[i-1].episode===state.events[i].episode)out.push({from:state.events[i-1],to:state.events[i]});return out}
 function predict(text,kind,track=false){
  const query=unique(words(text)),freq=frequency(),buckets={};
  if(track){state.probes++;query.forEach(seen)}
  if(!query.length)return {query,candidates:[],best:null};
  for(const t of transitions()){
   const sim=similarity(query,t.from.words,freq);if(sim<.09)continue;
   const weight=sim*(kind&&kind!==t.from.type?.65:1),id=t.to.type+"|"+key(t.to.words);
   if(!buckets[id])buckets[id]={text:t.to.text,type:t.to.type,words:t.to.words,support:0,score:0,evidence:[]};
   const c=buckets[id];c.support++;c.score+=weight;c.evidence.push({from:t.from.id,to:t.to.id,episode:t.from.episode,similarity:+sim.toFixed(3)});
  }
  const all=Object.values(buckets),total=all.reduce((s,c)=>s+c.score,0);
  all.sort((a,b)=>b.score-a.score||b.support-a.support||a.text.localeCompare(b.text));
  for(const c of all)c.confidence=total?Math.min(.96,(c.score/total)*(1-Math.exp(-c.support/1.5))):0;
  return {query,candidates:all.slice(0,5),best:all[0]||null};
 }
 function recall(text,track=false){
  const query=unique(words(text)),freq=frequency(),hits=[];
  if(track){state.probes++;query.forEach(seen)}
  state.events.forEach((e,i)=>{
   const score=similarity(query,e.words,freq);if(score<.07)return;
   const prev=i>0&&state.events[i-1].episode===e.episode?state.events[i-1]:null;
   const next=i+1<state.events.length&&state.events[i+1].episode===e.episode?state.events[i+1]:null;
   hits.push({event:e,score,prev,next});
  });
  hits.sort((a,b)=>b.score-a.score||b.event.id-a.event.id);
  return {query,hits:hits.slice(0,7)};
 }
 function observe(input){
  const type=["OBSERVE","ACT","RESULT"].includes(input?.type)?input.type:"OBSERVE";
  const text=String(input?.text||"").replace(/\s+/g," ").trim().slice(0,320),token=unique(words(text));if(!token.length)return null;
  let evaluation=null;
  if(pending&&pending.episode===state.episode&&pending.best&&pending.best.support>=2){
   const match=similarity(token,pending.best.words,frequency()),severity=Math.round((1-match)*pending.best.confidence*100);
   evaluation={expected:pending.best.text,actual:text,severity,match:+match.toFixed(3),support:pending.best.support,confidence:+pending.best.confidence.toFixed(3),surprising:severity>=40};
   if(evaluation.surprising)state.surprises++;
  }
  token.forEach(seen);
  const event={id:++state.sequence,episode:state.episode,type,text,words:token,at:Date.now(),evaluation};
  state.events.push(event);if(state.events.length>MAX_EVENTS)state.events.shift();
  const anticipation=predict(text,type,false);pending={episode:state.episode,best:anticipation.best};
  return {event,evaluation,prediction:anticipation};
 }
 function startEpisode(){state.episode++;pending=null;return state.episode}
 function patterns(){
  const groups={};
  for(const t of transitions()){
   const id=t.from.type+"|"+key(t.from.words)+"→"+t.to.type+"|"+key(t.to.words);
   if(!groups[id])groups[id]={id,from:t.from.text,to:t.to.text,typeFrom:t.from.type,typeTo:t.to.type,count:0,evidence:[],episodes:[],fromWords:t.from.words,toWords:t.to.words};
   const p=groups[id];p.count++;p.evidence.push({from:t.from.id,to:t.to.id});p.episodes.push(t.from.episode);
  }
  return Object.values(groups).filter(p=>p.count>=2).map(p=>({...p,distinctEpisodes:unique(p.episodes).length})).sort((a,b)=>b.count-a.count||a.from.localeCompare(b.from));
 }
 function convergences(){
  const groups={};
  for(const t of transitions()){
   const id=t.to.type+"|"+key(t.to.words);if(!groups[id])groups[id]={result:t.to.text,sources:[],episodes:[]};
   groups[id].sources.push(t.from.type+"|"+key(t.from.words));groups[id].episodes.push(t.from.episode);
  }
  return Object.values(groups).filter(p=>unique(p.sources).length>1&&unique(p.episodes).length>1).map(p=>({result:p.result,distinctSources:unique(p.sources).length,support:p.sources.length})).sort((a,b)=>b.support-a.support);
 }
 function stats(){return {words:Object.keys(state.words).length,events:state.events.length,episodes:new Set(state.events.map(e=>e.episode)).size,patterns:patterns().length,convergences:convergences().length,probes:state.probes,surprises:state.surprises}}
 function snapshot(){return JSON.parse(JSON.stringify(state))}
 function reset(){state={version:2,words:{},events:[],episode:1,sequence:0,probes:0,surprises:0};pending=null}
 function load(input){
  if(!input||input.version!==2||!Array.isArray(input.events))throw Error("Not a v0.2 experience snapshot");
  const all=input.events.slice(-MAX_EVENTS);reset();let prev=null;
  for(const e of all){if(!e||typeof e.text!=="string")continue;const ep=clamp(Math.floor(e.episode),1,1e7);if(prev!==null&&ep!==prev)startEpisode();prev=ep;observe({type:e.type,text:e.text})}
  state.probes=clamp(Math.floor(input.probes||0),0,1e6);pending=null;
  if(state.events.length){const last=state.events[state.events.length-1];const next=predict(last.text,last.type,false);pending={episode:state.episode,best:next.best}}
  return stats();
 }
 return {observe,startEpisode,predict,recall,patterns,convergences,stats,snapshot,reset,load,getState:()=>state,transitions};
}
function runTests(){
 const scenes=[["Card table","turn both cards","two stars appear"],["Browser","click address field","text cursor appears"],["Files","rename document","document name changes"]];
 const tests=scenes.map(([name,action,result])=>{const e=create();for(let i=0;i<3;i++){if(i)e.startEpisode();e.observe({type:"ACT",text:action});e.observe({type:"RESULT",text:result})}const p=e.predict(action,"ACT");return {name,pass:!!p.best&&p.best.text===result&&p.best.support===3,detail:p.best?.text||"no prediction"}});
 const surprise=create();for(let i=0;i<4;i++){if(i)surprise.startEpisode();surprise.observe({type:"ACT",text:"press square control"});surprise.observe({type:"RESULT",text:"light turns on"})}
 surprise.startEpisode();surprise.observe({type:"ACT",text:"press square control"});const changed=surprise.observe({type:"RESULT",text:"light turns off"});
 tests.push({name:"Unexpected outcome",pass:!!changed?.evaluation?.surprising,detail:changed?.evaluation?"surprise "+changed.evaluation.severity+"/100":"no prediction"});
 const boundary=create();boundary.observe({type:"ACT",text:"alpha"});boundary.startEpisode();boundary.observe({type:"RESULT",text:"omega"});
 tests.push({name:"Episode boundaries",pass:boundary.predict("alpha","ACT").best===null,detail:"episodes kept separate"});
 tests.push({name:"Unknown recall",pass:boundary.recall("unseen willow nebula").hits.length===0,detail:"no invented memory"});
 const conflict=create();for(let i=0;i<3;i++){if(i)conflict.startEpisode();conflict.observe({type:"ACT",text:"press center"});conflict.observe({type:"RESULT",text:i===2?"red signal":"green signal"})}
 const guess=conflict.predict("press center","ACT");
 tests.push({name:"Competing outcomes",pass:guess.candidates.length===2&&guess.best?.text==="green signal"&&guess.best.confidence<.75,detail:guess.candidates.length+" possible successors"});
 return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests,isolated:true};
}
root.RedExperienceCore=Object.freeze({create,runTests,words});
})(window);