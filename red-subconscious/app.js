/* Red Subconscious v0.2: browser-only view / persistence / interaction. */
(function(){
"use strict";
const core=window.RedExperienceCore;
if(!core){document.body.textContent="Experience engine could not load.";return}
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
const STORE="wrkman-red-subconscious-v2",V1="wrkman-red-subconscious-v1";
let mind=core.create(),selected=null,flash={},graph={nodes:[],links:[],map:{}},width=0,height=0,sc=1,px=0,py=0,drag=null,dragPos=null,dragged=false,toastTimer=null;
const cv=$("#network"),ctx=cv.getContext("2d");
const resultTitle=$("#resultTitle"),resultTag=$("#resultTag"),resultHelp=$("#resultHelp"),evidence=$("#evidence");
function reply(tag,title,body,trace){resultTag.textContent=tag;resultTitle.textContent=title;resultHelp.textContent=body;evidence.textContent=trace.join("\n")}
function notification(msg){let t=$("#toast");t.textContent=msg;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),2600)}
function save(){try{localStorage.setItem(STORE,JSON.stringify(mind.snapshot()))}catch(e){notification("Browser storage unavailable. Export a snapshot.")}}
function migrate(x){
 if(x?.version===2){mind.load(x);return "v2"}
 if(x&&Array.isArray(x.experiences)){
  mind.reset();let count=0;
  for(const exp of x.experiences.slice(-240)){
   if(!exp||!Array.isArray(exp.cue)||!Array.isArray(exp.result))continue;
   if(count++)mind.startEpisode();
   mind.observe({type:"OBSERVE",text:exp.cue.join(" ")});
   mind.observe({type:"RESULT",text:exp.result.join(" ")});
  }
  return "v1";
 }
 throw Error("Unsupported memory file");
}
function restore(){
 try{
  const raw=localStorage.getItem(STORE);if(raw){migrate(JSON.parse(raw));return "v2"}
  const old=localStorage.getItem(V1);if(old){const version=migrate(JSON.parse(old));save();return version}
 }catch(e){notification("Saved data could not be restored")}
 return null;
}
function pulse(tokens,ids=[]){const until=performance.now()+2400;for(const w of tokens)flash["W:"+w]=until;for(const id of ids)flash["E:"+id]=until}
function record(input,update=true){
 const r=mind.observe(input);if(!r){if(update)notification("Enter an event to observe");return null}
 pulse(r.event.words,[r.event.id]);
 if(update){
  if(r.evaluation?.surprising){
   reply("⚡ EXPECTATION VIOLATED","SURPRISE "+r.evaluation.severity+"/100","An actual event contradicted a supported expectation.",[
    "Expected: "+r.evaluation.expected,"Observed: "+r.event.text,"Evidence: "+r.evaluation.support+" previous transitions",
    "The contradictory event becomes new evidence, so future predictions can change."]);
  }else if(r.prediction.best){
   const p=r.prediction.best;
   reply("NEXT EVENT ANTICIPATED",p.text,"The current experience activated an existing pathway.",[
    "Triggered by: "+r.event.text,"Prior transitions: "+p.support,
    "Heuristic confidence: "+Math.round(p.confidence*100)+"/100"]);
  }else reply("EXPERIENCE AGENT CREATED",r.event.text,"This event has been added to the current episode.",[
   "Episode "+r.event.episode+" / "+r.event.type+" / #"+r.event.id,
   r.evaluation?"Prediction difference: "+r.evaluation.severity+"/100":"No supported expectation available."]);
  save();render();
 }
 return r;
}
function showRecall(text){
 const r=mind.recall(text,true);if(!r.query.length){notification("Enter a thought to recall");return null}
 const hit=r.hits[0];pulse(r.query,r.hits.slice(0,5).map(h=>h.event.id));
 if(!hit)reply("NO MEMORY RETRIEVED","∅","Nothing recorded meaningfully overlaps this thought.",["The engine did not invent an experience."]);
 else{
  const trace=["Matched #"+hit.event.id+" / episode "+hit.event.episode+" / "+hit.event.type,
   "Word-overlap score: "+Math.round(hit.score*100)+"/100"];
  if(hit.prev)trace.push("Immediately before: "+hit.prev.text);
  if(hit.next)trace.push("Immediately after: "+hit.next.text);
  if(r.hits.length>1)trace.push((r.hits.length-1)+" other matching experiences");
  reply("MEMORY RETRIEVED",hit.event.text,"A remembered experience with source evidence.",trace);
 }
 save();render();return r;
}
function showPredict(text){
 const r=mind.predict(text,null,true);if(!r.query.length){notification("Enter a thought to predict");return null}
 pulse(r.query,r.best?.evidence.flatMap(e=>[e.from,e.to])||[]);
 if(!r.best)reply("NO PREDICTION","∅","No observed transition resembles the current thought.",["No outcome was invented."]);
 else{
  const c=r.best,trace=["Supporting transitions: "+c.support,"Heuristic confidence: "+Math.round(c.confidence*100)+"/100"];
  for(const z of c.evidence.slice(0,4))trace.push("Evidence: #"+z.from+" → #"+z.to+" / episode "+z.episode);
  if(r.candidates.length>1)trace.push("Alternatives: "+r.candidates.slice(1,3).map(c=>c.text+" ("+Math.round(c.confidence*100)+")").join(" ; "));
  reply("NEXT EVENT HYPOTHESIS",c.text,"A fallible expectation based on previously observed sequences.",trace);
 }
 save();render();return r;
}
function begin(){const ep=mind.startEpisode();reply("EPISODE BOUNDARY","EPISODE "+ep,"A new sequence begins. Unrelated earlier events cannot be joined across this boundary.",["The memory itself remains intact."]);save();render();return ep}
function demo(){
 mind.reset();selected=null;
 const episodes=[
  [["OBSERVE","a blue button is visible"],["ACT","press the blue button"],["RESULT","a panel opens"]],
  [["OBSERVE","the blue button appears again"],["ACT","press the blue button"],["RESULT","a panel opens"]],
  [["OBSERVE","a text document is visible"],["ACT","rename the text document"],["RESULT","the filename changes"]],
  [["OBSERVE","another text document is visible"],["ACT","rename the text document"],["RESULT","the filename changes"]]
 ];
 episodes.forEach((steps,i)=>{if(i)mind.startEpisode();for(const [type,text] of steps)mind.observe({type,text})});
 $("#query").value="press the blue button";$("#eventText").value="";
 reply("GENERAL EXPERIENCE DEMO","READY","Four ordinary episodes have been recorded in two unrelated settings.",[
  "Try predicting: press the blue button","Try recalling: filename changes",
  "Or record a familiar action followed by an unexpected result."]);
 save();render();
}
function empty(){mind.reset();selected=null;reply("MEMORY ERASED","∅","The experience field is empty.",["Record an event to begin."]);save();render()}
function runTests(){
 const r=core.runTests(),panel=$("#testResults");panel.replaceChildren();panel.classList.add("visible");
 panel.append(el("strong","",r.passed+" / "+r.total+" behavioral trials passed"));
 for(const t of r.tests)panel.append(el("div",t.pass?"testpass":"testfail",(t.pass?"✓ ":"✕ ")+t.name+": "+t.detail));
 panel.append(el("small","", "All trials ran on fresh temporary brains. Your current memory was untouched."));
 notification(r.passed===r.total?"All behavioral trials passed":"Some trials failed: inspect the results.");
 return r;
}
function exportMemory(){
 const data=JSON.stringify({format:"red-experience-engine-v2",...mind.snapshot()},null,2),blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob),a=el("a");
 a.href=url;a.download="red-experience-memory-v2.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notification("JSON memory exported");
}
function inspect(id,fromRender=false){
 const n=graph.map[id];if(!n){if(!fromRender){selected=null;$("#inspector").classList.remove("visible")}return}
 selected=id;$("#inspector").classList.add("visible");
 $("#inspectTitle").textContent=n.type.toUpperCase()+" AGENT · "+n.label;
 let detail="";
 if(n.type==="word"){
  const events=mind.getState().events.filter(e=>e.words.includes(n.word));
  detail="Activated "+(mind.getState().words[n.word]?.seen||0)+" times\nPresent in "+events.length+" event(s)\n"+events.slice(-6).map(e=>"#"+e.id+" "+e.text).join("\n");
 }else if(n.type==="experience"){
  const e=n.event;detail="Episode "+e.episode+" · "+e.type+" · #"+e.id+"\n"+e.text+"\n\nWords: "+e.words.join(", ");
  if(e.evaluation)detail+="\nExpected: "+e.evaluation.expected+"\nSurprise magnitude: "+e.evaluation.severity+"/100";
 }else{
  const p=n.pattern;detail=p.from+" → "+p.to+"\nSupport "+p.count+" transitions across "+p.distinctEpisodes+" episode(s)\n"+
   p.evidence.slice(-7).map(x=>"#"+x.from+" → #"+x.to).join("\n");
 }
 $("#inspectBody").textContent=detail;
}
function render(){
 const s=mind.stats(),state=mind.getState(),patterns=mind.patterns(),convergences=mind.convergences();
 $("#episode").textContent="EPISODE "+String(state.episode).padStart(3,"0");
 for(const [id,val] of [["words",s.words],["events",s.events],["patterns",s.patterns],["surprises",s.surprises],["probes",s.probes]])$("#s-"+id).textContent=val;
 $("#associationCount").textContent=String(s.patterns).padStart(2,"0");$("#historyCount").textContent=String(s.events).padStart(2,"0");
 const list=$("#associations");list.replaceChildren();
 if(!patterns.length&&!convergences.length)list.append(el("div","empty","Repeated sequences will create association agents here."));
 patterns.slice(0,8).forEach(p=>{
  const row=el("div","association");row.append(el("strong","",p.from));row.append(el("div","arrow","↳ "+p.to));
  row.append(el("small","",p.count+" transitions / "+p.distinctEpisodes+" episode(s)"));
  row.addEventListener("click",()=>inspect("A:"+p.id));list.append(row);
 });
 convergences.slice(0,3).forEach(c=>{const row=el("div","association");row.append(el("strong","",c.distinctSources+" different cues → "+c.result));row.append(el("small","",c.support+" converging transitions"));list.append(row)});
 const history=$("#history");history.replaceChildren();
 state.events.slice(-20).reverse().forEach(e=>{
  const row=el("div","history-row");row.append(el("b","",String(e.episode).padStart(2,"0")+" · "+e.type+" #"+e.id+"  "));
  row.append(document.createTextNode(e.text));
  if(e.evaluation?.surprising)row.append(el("div","surprise","⚡ SURPRISE "+e.evaluation.severity+"/100 · expected "+e.evaluation.expected));
  row.addEventListener("click",()=>inspect("E:"+e.id));history.append(row);
 });
 $("#blank").style.display=s.events?"none":"block";
 rebuildGraph();if(selected)inspect(selected,true);
}
function rebuildGraph(){
 const old=graph.map,nodes=[],map={},links=[],state=mind.getState(),freq={};
 for(const e of state.events)for(const w of e.words)freq[w]=(freq[w]||0)+1;
 const recent=state.events.slice(-19),vocab=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]||a.localeCompare(b)).slice(0,32);
 const patterns=mind.patterns().slice(0,8);
 function add(id,label,type,props){
  let h=0;for(let i=0;i<id.length;i++)h=(Math.imul(h,33)+id.charCodeAt(i))|0;
  const a=(Math.abs(h)%3600)*Math.PI/1800,r=65+(Math.abs(h>>7)%170);
  const n=old[id]||{x:width/2+Math.cos(a)*r,y:height/2+Math.sin(a)*r,vx:0,vy:0};
  Object.assign(n,{id,label,type,radius:type==="word"?17:type==="association"?24:21},props);nodes.push(n);map[id]=n;
 }
 for(const w of vocab)add("W:"+w,w,"word",{word:w});
 for(const e of recent)add("E:"+e.id,e.type,"experience",{event:e});
 patterns.forEach((p,i)=>add("A:"+p.id,"FUSE "+(i+1),"association",{pattern:p}));
 for(const e of recent)for(const w of e.words.slice(0,8))if(map["W:"+w])links.push({a:"W:"+w,b:"E:"+e.id,kind:"word"});
 for(let i=1;i<recent.length;i++)if(recent[i-1].episode===recent[i].episode)links.push({a:"E:"+recent[i-1].id,b:"E:"+recent[i].id,kind:"sequence"});
 for(const p of patterns){const example=p.evidence.at(-1);if(!example)continue;for(const id of [example.from,example.to])if(map["E:"+id])links.push({a:"A:"+p.id,b:"E:"+id,kind:"association"})}
 graph={nodes,links,map};
}
function resize(){
 if(!ctx)return;
 const rect=cv.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),oldW=width,oldH=height;
 width=Math.max(1,rect.width);height=Math.max(1,rect.height);cv.width=Math.round(width*dpr);cv.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 if(oldW&&oldH){for(const n of graph.nodes){n.x+=(width-oldW)/2;n.y+=(height-oldH)/2}}else{graph={nodes:[],links:[],map:{}};rebuildGraph();}
}
function force(){
 const ns=graph.nodes;
 for(let i=0;i<ns.length;i++){
  const a=ns[i];a.vx+=(width/2-a.x)*.0005;a.vy+=(height/2-a.y)*.0005;
  for(let j=i+1;j<ns.length;j++){
   const b=ns[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy+1,d=Math.sqrt(d2),f=Math.min(2.6,3400/d2);
   a.vx-=dx/d*f;a.vy-=dy/d*f;b.vx+=dx/d*f;b.vy+=dy/d*f;
  }
 }
 for(const link of graph.links){
  const a=graph.map[link.a],b=graph.map[link.b];if(!a||!b)continue;
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),len=link.kind==="sequence"?118:96,f=(d-len)*.002;
  a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;
 }
 for(const n of ns){if(n.id===drag){n.vx=n.vy=0;continue}n.vx*=.87;n.vy*=.87;n.x=Math.max(27,Math.min(width-27,n.x+n.vx));n.y=Math.max(27,Math.min(height-27,n.y+n.vy))}
}
function paint(now){
 if(!ctx)return;ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(px,py);ctx.scale(sc,sc);
 for(const l of graph.links){
  const a=graph.map[l.a],b=graph.map[l.b];if(!a||!b)continue;
  const lit=(flash[a.id]||0)>now||(flash[b.id]||0)>now;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=lit?2:1;
  ctx.strokeStyle=lit?"#72f2b59f":l.kind==="association"?"#6bdeab88":l.kind==="sequence"?"#ffd48d66":"#67869b40";ctx.stroke();
  if(lit){const t=(now/1500+(a.x%100)/100)%1;ctx.beginPath();ctx.arc(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,2.5,0,Math.PI*2);ctx.fillStyle="#b5ffe0";ctx.fill()}
 }
 for(const n of graph.nodes){
  const color=n.type==="word"?"#92b6ff":n.type==="experience"?"#ffd48d":"#72f2b5",r=n.radius,lit=(flash[n.id]||0)>now||selected===n.id;
  ctx.save();ctx.shadowBlur=lit?17:8;ctx.shadowColor=color;ctx.beginPath();
  if(n.type==="association"){for(let j=0;j<6;j++){const a=j*Math.PI/3-Math.PI/6,x=n.x+Math.cos(a)*r,y=n.y+Math.sin(a)*r;if(!j)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()}
  else if(n.type==="experience")ctx.rect(n.x-r,n.y-r,r*2,r*2);
  else ctx.arc(n.x,n.y,r,0,Math.PI*2);
  ctx.fillStyle=n.type==="word"?"#203048":n.type==="experience"?"#453a2d":"#16433b";ctx.strokeStyle=color;ctx.lineWidth=lit?3:1.5;ctx.fill();ctx.stroke();ctx.restore();
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="700 9px ui-monospace,monospace";ctx.fillStyle="#f2faf6";ctx.fillText(n.label.length>12?n.label.slice(0,11)+"…":n.label,n.x,n.y);
 }
 ctx.restore();
}
let lastTick=0;function tick(now){requestAnimationFrame(tick);if(document.hidden||now-lastTick<28)return;lastTick=now;force();paint(now)}
function pxy(e){const rect=cv.getBoundingClientRect();return {x:(e.clientX-rect.left-px)/sc,y:(e.clientY-rect.top-py)/sc}}
function pick(point){for(let i=graph.nodes.length-1;i>=0;i--){const n=graph.nodes[i];if(Math.hypot(n.x-point.x,n.y-point.y)<n.radius+9)return n}return null}
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);drag=pick(pxy(e))?.id||"PAN";dragPos={x:e.clientX,y:e.clientY};dragged=false});
cv.addEventListener("pointermove",e=>{if(!dragPos)return;const dx=e.clientX-dragPos.x,dy=e.clientY-dragPos.y;if(Math.abs(dx)+Math.abs(dy)>3)dragged=true;dragPos={x:e.clientX,y:e.clientY};if(drag==="PAN"){px+=dx;py+=dy}else if(graph.map[drag]){graph.map[drag].x+=dx/sc;graph.map[drag].y+=dy/sc}});
cv.addEventListener("pointerup",e=>{if(!dragPos)return;const n=pick(pxy(e));if(!dragged&&n)inspect(n.id);drag=null;dragPos=null});
cv.addEventListener("pointercancel",()=>{drag=null;dragPos=null});
cv.addEventListener("wheel",e=>{e.preventDefault();const rect=cv.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,next=Math.max(.5,Math.min(2.5,sc*(e.deltaY>0?.9:1.1)));px=x-(x-px)*next/sc;py=y-(y-py)*next/sc;sc=next},{passive:false});
$("#record").addEventListener("click",()=>{const type=document.querySelector('input[name="kind"]:checked').value;const r=record({type,text:$("#eventText").value});if(r)$("#eventText").value=""});
$("#newEpisode").addEventListener("click",begin);
$("#recall").addEventListener("click",()=>showRecall($("#query").value));$("#predict").addEventListener("click",()=>showPredict($("#query").value));
$("#tests").addEventListener("click",runTests);
$("#demo").addEventListener("click",()=>{if(mind.stats().events&&!confirm("Replace all current experiences with the example?"))return;demo();notification("Example experiences loaded")});
$("#reset").addEventListener("click",()=>{if(confirm("Clear all local experiences, agents and probes? Export first if needed.")){empty();notification("Brain cleared")}});
$("#export").addEventListener("click",exportMemory);$("#import").addEventListener("click",()=>$("#file").click());
$("#file").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>2200000)throw Error("Snapshot exceeds 2.2 MB");const payload=JSON.parse(await f.text());migrate(payload);selected=null;save();render();reply("MEMORY IMPORTED","READY","The imported stream has been reconstructed.",["Associations are derived from the source experiences."]);notification("Memory restored")}catch(err){notification(err.message||"Import failed")}e.target.value=""});
$("#helpBtn").addEventListener("click",()=>$("#help").showModal());$("#helpClose").addEventListener("click",()=>$("#help").close());
$("#eventText").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();$("#record").click()}});
window.RedMemoryV2=Object.freeze({
 observe:input=>record(input),startEpisode:begin,
 recall:showRecall,probe:showRecall,predict:showPredict,
 associations:()=>mind.patterns(),convergences:()=>mind.convergences(),
 export:()=>mind.snapshot(),import:input=>{const v=migrate(input);save();render();return v},
 stats:()=>mind.stats(),runTests,reset:empty
});
const restored=restore();
if(restored){render();reply("MEMORY RESTORED","READY",restored==="v1"?"Previous v0.1 pairs were migrated into experience episodes.":"Saved experiences are available.",["New events can extend the learned network."])}else demo();
resize();if(typeof ResizeObserver!=="undefined")new ResizeObserver(resize).observe(cv);else window.addEventListener("resize",resize);
requestAnimationFrame(tick);
})();