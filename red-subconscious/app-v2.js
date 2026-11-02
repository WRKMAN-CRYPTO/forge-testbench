/* RED // SUBCONSCIOUS v0.2 interface. Engine rules live exclusively in engine-v2.js. */
(function(){
"use strict";
const $ = id => document.getElementById(id);
const brain = RedEngine.create();
const STORE="red-subconscious-experience-v2";
const UI = {
  episode:$("episode"), event:$("eventText"), type:$("eventType"), probe:$("probeText"),
  title:$("summaryTitle"), body:$("summaryText"), evidence:$("evidence"),
  assoc:$("associations"), history:$("history"), report:$("report"),
  inspect:$("inspect"), toast:$("toast"), canvas:$("network"), empty:$("empty"),
  statWords:$("wordCount"), statEvents:$("experienceCount"),
  statPatterns:$("associationCount"), statSurprise:$("surpriseCount"), statProbes:$("probeCount")
};
const ctx=UI.canvas.getContext("2d");
let log=[], nodes=[], links=[], nodeMap={}, selected=null, flash=new Map(), pan={x:0,y:0},zoom=1,drag=null,lastPos=null,dragMoved=false, viewW=1, viewH=1;
function node(tag,cls,content){
  const d=document.createElement(tag);
  if(cls)d.className=cls;
  if(content!==undefined)d.textContent=String(content);
  return d;
}
function message(label,title,body,lines=[]){
  $("summaryLabel").textContent=label;
  UI.title.textContent=title;
  UI.body.textContent=body;
  UI.evidence.replaceChildren();
  for(const line of lines)UI.evidence.append(node("div","evidence-line",line));
}
let toastTimer;
function toast(t){UI.toast.textContent=t;UI.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>UI.toast.classList.remove("show"),2400)}
function pushLog(label,text){log.unshift({label,text});if(log.length>12)log.length=12}
function save(){try{localStorage.setItem(STORE,JSON.stringify(brain.export()))}catch(e){toast("Local save unavailable. Export JSON instead.")}}
function restore(){
  try{
    const v2=localStorage.getItem(STORE);
    if(v2){brain.load(JSON.parse(v2));pushLog("RESTORE","Prior experiences loaded");return true}
    const v1=localStorage.getItem("wrkman-red-subconscious-v1");
    if(v1){
      const old=JSON.parse(v1);if(Array.isArray(old.experiences)&&old.experiences.length){
        for(const [i,e] of old.experiences.slice(-250).entries()){
          if(!Array.isArray(e.cue)||!Array.isArray(e.result))continue;
          if(i)brain.startEpisode();
          brain.observe({type:"OBSERVE",text:e.cue.join(" ")});
          brain.observe({type:"RESULT",text:e.result.join(" ")});
        }
        save();pushLog("MIGRATION","v0.1 cue/result pairs loaded");return true;
      }
    }
  }catch(e){pushLog("WARNING","Saved data could not be restored")}
  return false;
}
function excite(words,ids=[]){
  const until=performance.now()+2000;
  for(const w of words)flash.set("W:"+w,until);
  for(const id of ids)flash.set("E:"+id,until);
}
function refresh(){
  const s=brain.stats(), recent=brain.events();
  UI.episode.textContent="EPISODE "+String(recent.at(-1)?.episode||1).padStart(3,"0")+" / ACTIVE "+String(s.events)+" EVENTS";
  UI.statWords.textContent=s.words;
  UI.statEvents.textContent=s.events;
  UI.statPatterns.textContent=s.patterns;
  UI.statSurprise.textContent=s.surprises;
  UI.statProbes.textContent=s.probes;
  UI.assoc.replaceChildren();
  const patterns=brain.patterns().slice(0,9), convergences=brain.convergences().slice(0,3);
  if(!patterns.length && !convergences.length)UI.assoc.append(node("div","muted-item","Patterns appear after repeated transitions."));
  for(const p of patterns){
    const item=node("button","pattern");
    item.append(node("strong","",p.from));
    item.append(node("span","green","↳ "+p.to));
    item.append(node("small","",p.count+" observations · "+p.episodes+" episode(s)"));
    item.addEventListener("click",()=>inspectPattern(p));
    UI.assoc.append(item);
  }
  for(const c of convergences){
    const item=node("div","convergence");
    item.append(node("strong","",c.sources+" different cues → "+c.result));
    item.append(node("small","",c.support+" transitions · emergent shared destination"));
    UI.assoc.append(item);
  }
  UI.history.replaceChildren();
  if(!recent.length)UI.history.append(node("div","muted-item","No experiences recorded."));
  for(const e of recent.slice(-16).reverse()){
    const row=node("button","history-row");
    const top=node("div","history-meta","#"+e.id+"  "+e.type+"  /  EP "+e.episode);
    row.append(top,node("span","",e.text));
    if(e.surprise)row.append(node("div","surprise-text","⚡ SURPRISE "+e.surprise.strength+" / expected: "+e.surprise.expected));
    row.addEventListener("click",()=>inspectEvent(e));
    UI.history.append(row);
  }
  UI.empty.hidden=!!s.events;
  rebuildGraph();
}
function record(){
  const r=brain.observe({type:UI.type.value,text:UI.event.value});
  if(!r){toast("Describe an event first");return}
  UI.event.value="";
  excite(r.event.tokens,[r.event.id]);
  pushLog(r.event.type,r.event.text);
  if(r.surprise){
    message("⚡ SURPRISE SIGNAL","EXPECTATION VIOLATED",
      "This result differed from a previously reinforced next-event prediction.",
      ["Predicted: "+r.surprise.expected,"Observed: "+r.event.text,
      "Surprise strength: "+r.surprise.strength+"/100 (heuristic)",
      "Supported by event transitions: "+r.surprise.evidence.map(x=>"#"+x.from+"→#"+x.to).join(", ")]);
  }else if(r.forecast.best){
    const p=r.forecast.best;
    message("EMERGING PREDICTION",p.text,"The recent event activated a possible next result.",
      ["Support: "+p.support+" previous transition(s)","Heuristic confidence: "+Math.round(p.confidence*100)+"/100",
       "No action is required. Red decides what to do with the suggestion."]);
  }else{
    const echoes=brain.recall(r.event.text).hits.filter(x=>x.event.id!==r.event.id&&x.event.episode!==r.event.episode&&x.score>=.52);
    if(echoes.length){
      message("SPONTANEOUS ECHO",echoes[0].event.text,"An older experience resembles this new observation.",
      ["Prior episode: "+echoes[0].event.episode,"Similarity: "+Math.round(echoes[0].score*100)+"/100",
       echoes[0].after?"What followed then: "+echoes[0].after.text:"No following event recorded."]);
      excite(echoes[0].event.tokens,[echoes[0].event.id]);
    }else message("EXPERIENCE RECORDED",r.event.text,"One more piece of Red's history.",
      ["Episode "+r.event.episode+" · "+r.event.type+" · event #"+r.event.id,
       "No supported next-event hypothesis yet."]);
  }
  save();refresh();
}
function newEpisode(){
  const id=brain.startEpisode();
  $("episode").textContent="EPISODE "+String(id).padStart(3,"0")+" / NEW";
  message("EPISODE BOUNDARY","FRESH SEQUENCE","The next event will not be linked to the previous episode.",["This prevents unrelated experiences from becoming false transitions."]);
  pushLog("BOUNDARY","Episode "+id+" started");
  save();refresh();
  $("episode").textContent="EPISODE "+String(id).padStart(3,"0")+" / NEW";
}
function recall(){
  const q=UI.probe.value.trim();if(!q){toast("Enter a thought first");return}
  const r=brain.recall(q,true);
  excite(r.query,r.hits.slice(0,4).map(x=>x.event.id));
  pushLog("RECALL",q);
  if(!r.hits.length)message("EMPTY RECALL","NO MEMORY FOUND","No recorded evidence matches this thought.",["The engine will not manufacture a recollection."]);
  else{
    const h=r.hits[0], lines=[
      "Event #"+h.event.id+" · episode "+h.event.episode+" · "+h.event.type,
      "Word-overlap similarity: "+Math.round(h.score*100)+"/100"];
    if(h.before)lines.push("Before: "+h.before.text);
    if(h.after)lines.push("After: "+h.after.text);
    if(r.hits.length>1)lines.push("Additional matching experiences: "+(r.hits.length-1));
    message("MEMORY RECALLED",h.event.text,"An experience surfaced with its original context.",lines);
  }
  save();refresh();return r;
}
function predict(){
  const q=UI.probe.value.trim();if(!q){toast("Enter a thought first");return}
  const r=brain.predict(q,null,true);excite(r.query);
  if(r.best)for(const ev of r.best.evidence.slice(0,5))excite([], [ev.from,ev.to]);
  pushLog("PROBE",q);
  if(!r.best)message("NO PREDICTION","NO KNOWN PATH","The query does not sufficiently resemble recorded precursor events.",["No evidence, so no predicted answer."]);
  else{
    const p=r.best, lines=[
      "Support: "+p.support+" observed transition(s)",
      "Heuristic confidence: "+Math.round(p.confidence*100)+"/100 (not calibrated)",
      "Evidence: "+p.evidence.slice(0,4).map(e=>"#"+e.from+"→#"+e.to+" / ep "+e.episode).join(", ")];
    if(r.candidates.length>1)lines.push("Alternatives: "+r.candidates.slice(1,4).map(c=>c.text+" ["+Math.round(c.confidence*100)+"]").join(" · "));
    message("PREDICTION / HYPOTHESIS",p.text,"Evidence suggests this event might happen next. It is not an instruction.",lines);
  }
  save();refresh();return r;
}
function example(){
  brain.reset();log=[];
  const episodes=[
    [["OBSERVE","a blue button is visible"],["ACT","press the blue button"],["RESULT","a panel opens"]],
    [["OBSERVE","the blue button is visible again"],["ACT","press the blue button"],["RESULT","a panel opens"]],
    [["OBSERVE","a document is visible"],["ACT","rename the document"],["RESULT","its filename changes"]],
    [["OBSERVE","another document is visible"],["ACT","rename the document"],["RESULT","its filename changes"]],
    [["OBSERVE","a blue button is visible"],["ACT","press the blue button"]]
  ];
  episodes.forEach((episode,i)=>{
    if(i)brain.startEpisode();
    for(const [type,text] of episode)brain.observe({type,text});
  });
  UI.probe.value="press the blue button";
  UI.event.value="";
  UI.type.value="RESULT";
  message("DEMO READY","AN EXPERIENCE IS UNFINISHED",
    "Two familiar activities have been learned. The last episode ends after an action.",
    ["Try PREDICT with 'press the blue button'.",
     "Then record RESULT: 'an error message appears'.",
     "Look for the surprise signal."]);
  pushLog("DEMO","Cross-domain example loaded");
  save();refresh();
}
function reset(){
  brain.reset();log=[];selected=null;UI.inspect.hidden=true;
  message("EMPTY MEMORY","···","No experiences stored.",["Start with OBSERVE, ACT, or RESULT."]);
  save();refresh();
}
function test(){
  const r=RedEngine.tests();
  UI.report.hidden=false;
  UI.report.replaceChildren();
  UI.report.append(node("strong","",r.passed+" / "+r.total+" independent trials passed"));
  for(const c of r.checks){
    const d=node("div",c.pass?"test-pass":"test-fail",(c.pass?"✓ ":"✕ ")+c.name+": "+c.detail);
    UI.report.append(d);
  }
  UI.report.append(node("small","","These tests run in fresh isolated memories. The live brain is untouched."));
  toast(r.passed===r.total?"All engine tests passed":"Some tests need attention");
  return r;
}
function download(){
  const payload={format:"red-experience-engine-v2",...brain.export()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="red-experience-brain-v2.json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Experience brain exported");
}
function importData(input){
  if(input?.version===2){brain.load(input)}
  else if(Array.isArray(input?.experiences)){
    brain.reset();
    let i=0;
    for(const e of input.experiences.slice(-250)){
      if(!Array.isArray(e.cue)||!Array.isArray(e.result))continue;
      if(i++)brain.startEpisode();
      brain.observe({type:"OBSERVE",text:e.cue.join(" ")});
      brain.observe({type:"RESULT",text:e.result.join(" ")});
    }
  }else throw Error("Unrecognized memory format");
  pushLog("IMPORT","Memory restored");
  save();refresh();
  message("MEMORY RESTORED","READY","Chronological experiences were reconstructed.",["Associations will be recomputed from the imported evidence."]);
  return brain.stats();
}
function inspectEvent(e){
  UI.inspect.hidden=false;
  $("inspectTitle").textContent="EXPERIENCE #"+e.id;
  $("inspectBody").textContent="EPISODE "+e.episode+" / "+e.type+"\n"+e.text+"\n\nWord agents: "+e.tokens.join(", ")+(e.surprise?"\n\nExpected: "+e.surprise.expected+"\nSurprise: "+e.surprise.strength+"/100":"");
}
function inspectPattern(p){
  UI.inspect.hidden=false;
  $("inspectTitle").textContent="ASSOCIATION AGENT";
  $("inspectBody").textContent=p.from+" → "+p.to+"\n"+p.count+" supporting transitions\n"+p.episodes+" episode(s)\n\nEvidence: "+p.evidence.slice(-8).map(x=>"#"+x[0]+"→#"+x[1]).join(", ");
}
function inspectWord(w){
  UI.inspect.hidden=false;
  $("inspectTitle").textContent="WORD AGENT / "+w;
  const events=brain.events().filter(e=>e.tokens.includes(w));
  $("inspectBody").textContent="Appears in "+events.length+" retained event(s)\n\n"+events.slice(-6).map(e=>"#"+e.id+" "+e.text).join("\n");
}
function rebuildGraph(){
  const old=nodeMap;nodes=[];links=[];nodeMap={};
  const events=brain.events().slice(-18),freq={};
  for(const e of events)for(const w of e.tokens)freq[w]=(freq[w]||0)+1;
  const chosen=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]||a.localeCompare(b)).slice(0,24);
  const paths=brain.patterns().slice(0,6);
  function add(id,type,label,detail){
    let h=2166136261;for(const ch of id)h=Math.imul((h^ch.charCodeAt(0)),16777619)>>>0;
    const theta=(h%3600)*Math.PI/1800;
    const r=60+((h>>>12)%140);
    const n=old[id]||{id,x:viewW/2+Math.cos(theta)*r,y:viewH/2+Math.sin(theta)*r,vx:0,vy:0};
    Object.assign(n,{type,label,detail});
    n.radius=type==="word"?19:type==="event"?22:24;
    nodes.push(n);nodeMap[id]=n;
  }
  chosen.forEach(w=>add("W:"+w,"word",w,w));
  events.forEach(e=>add("E:"+e.id,"event",e.type,e));
  paths.forEach((p,i)=>add("P:"+p.id,"pattern","LINK "+(i+1),p));
  for(const e of events)for(const w of e.tokens.slice(0,6))if(nodeMap["W:"+w])links.push({a:"W:"+w,b:"E:"+e.id,type:"word"});
  for(let i=1;i<events.length;i++)if(events[i].episode===events[i-1].episode)links.push({a:"E:"+events[i-1].id,b:"E:"+events[i].id,type:"sequence"});
  for(const p of paths){
    const last=p.evidence.at(-1);if(!last)continue;
    for(const id of last)if(nodeMap["E:"+id])links.push({a:"P:"+p.id,b:"E:"+id,type:"pattern"});
  }
}
function layout(){
  for(let i=0;i<nodes.length;i++){
    const a=nodes[i];
    a.vx+=(viewW/2-a.x)*.0006;a.vy+=(viewH/2-a.y)*.0006;
    for(let j=i+1;j<nodes.length;j++){
      const b=nodes[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy+1,d=Math.sqrt(d2),force=Math.min(2.1,2400/d2);
      a.vx-=dx/d*force;a.vy-=dy/d*force;b.vx+=dx/d*force;b.vy+=dy/d*force;
    }
  }
  for(const l of links){
    const a=nodeMap[l.a],b=nodeMap[l.b];if(!a||!b)continue;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),strength=(d-(l.type==="sequence"?105:90))*.002;
    a.vx+=dx/d*strength;a.vy+=dy/d*strength;b.vx-=dx/d*strength;b.vy-=dy/d*strength;
  }
  for(const n of nodes){
    if(drag===n.id){n.vx=0;n.vy=0;continue}
    n.vx*=.87;n.vy*=.87;n.x=Math.max(25,Math.min(viewW-25,n.x+n.vx));n.y=Math.max(25,Math.min(viewH-25,n.y+n.vy));
  }
}
function draw(now){
  ctx.clearRect(0,0,viewW,viewH);ctx.save();ctx.translate(pan.x,pan.y);ctx.scale(zoom,zoom);
  for(const l of links){
    const a=nodeMap[l.a],b=nodeMap[l.b];if(!a||!b)continue;
    const lit=(flash.get(a.id)||0)>now||(flash.get(b.id)||0)>now;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    ctx.lineWidth=lit?1.9:1;
    ctx.strokeStyle=lit?"#85ffbcaa":l.type==="pattern"?"#72f2b577":l.type==="sequence"?"#ffd48d66":"#668ba244";
    ctx.stroke();
  }
  for(const n of nodes){
    const color=n.type==="word"?"#92b6ff":n.type==="event"?"#ffd48d":"#72f2b5";
    const lit=(flash.get(n.id)||0)>now||selected===n.id;
    ctx.beginPath();
    if(n.type==="event")ctx.rect(n.x-n.radius,n.y-n.radius,n.radius*2,n.radius*2);
    else if(n.type==="pattern"){for(let j=0;j<6;j++){const a=j*Math.PI/3-Math.PI/6,x=n.x+Math.cos(a)*n.radius,y=n.y+Math.sin(a)*n.radius;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()}
    else ctx.arc(n.x,n.y,n.radius,0,Math.PI*2);
    ctx.fillStyle=n.type==="word"?"#182c45":n.type==="event"?"#392f29":"#133e35";
    ctx.shadowColor=color;ctx.shadowBlur=lit?19:8;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle=color;ctx.lineWidth=lit?3:1.5;ctx.stroke();
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#f6fcf7";ctx.font="700 10px ui-monospace,monospace";
    ctx.fillText(n.label.length>12?n.label.slice(0,11)+"…":n.label,n.x,n.y);
  }
  ctx.restore();
}
let lastFrame=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-lastFrame<38)return;lastFrame=now;layout();draw(now)}
function resize(){
  const rect=UI.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),prevW=viewW,prevH=viewH;
  viewW=Math.max(1,rect.width);viewH=Math.max(1,rect.height);
  UI.canvas.width=Math.round(viewW*dpr);UI.canvas.height=Math.round(viewH*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  for(const n of nodes){n.x+=(viewW-prevW)/2;n.y+=(viewH-prevH)/2}
}
function cursor(e){const r=UI.canvas.getBoundingClientRect();return{x:(e.clientX-r.left-pan.x)/zoom,y:(e.clientY-r.top-pan.y)/zoom}}
function hitTest(p){for(let i=nodes.length-1;i>=0;i--)if(Math.hypot(nodes[i].x-p.x,nodes[i].y-p.y)<nodes[i].radius+8)return nodes[i];return null}
UI.canvas.addEventListener("pointerdown",e=>{UI.canvas.setPointerCapture(e.pointerId);const n=hitTest(cursor(e));drag=n?n.id:"PAN";lastPos={x:e.clientX,y:e.clientY};dragMoved=false});
UI.canvas.addEventListener("pointermove",e=>{
  if(!lastPos)return;
  const dx=e.clientX-lastPos.x,dy=e.clientY-lastPos.y;
  lastPos={x:e.clientX,y:e.clientY};if(Math.abs(dx)+Math.abs(dy)>4)dragMoved=true;
  if(drag==="PAN"){pan.x+=dx;pan.y+=dy}
  else if(nodeMap[drag]){nodeMap[drag].x+=dx/zoom;nodeMap[drag].y+=dy/zoom}
});
UI.canvas.addEventListener("pointerup",e=>{
  if(!lastPos)return;
  const picked=hitTest(cursor(e)),clicked=!dragMoved;
  lastPos=null;drag=null;
  if(!clicked||!picked)return;
  selected=picked.id;
  if(picked.type==="word")inspectWord(picked.detail);
  else if(picked.type==="event")inspectEvent(picked.detail);
  else inspectPattern(picked.detail);
});
UI.canvas.addEventListener("pointercancel",()=>{drag=null;lastPos=null});
UI.canvas.addEventListener("wheel",e=>{
  e.preventDefault();const b=UI.canvas.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top,next=Math.max(.5,Math.min(2.5,zoom*(e.deltaY>0?.9:1.1)));
  pan.x=x-(x-pan.x)*next/zoom;pan.y=y-(y-pan.y)*next/zoom;zoom=next;
},{passive:false});
$("record").addEventListener("click",record);
$("newEpisode").addEventListener("click",newEpisode);
$("recall").addEventListener("click",recall);
$("predict").addEventListener("click",predict);
$("demo").addEventListener("click",()=>{
  if(brain.stats().events&&!confirm("Replace current experiences with the example?"))return;
  example();
});
$("tests").addEventListener("click",test);
$("reset").addEventListener("click",()=>{
  if(confirm("Clear all recorded experiences? Export first if you want to save them."))reset();
});
$("export").addEventListener("click",download);
$("import").addEventListener("click",()=>$("file").click());
$("file").addEventListener("change",async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{if(f.size>2200000)throw Error("Memory snapshot exceeds 2.2 MB");
    importData(JSON.parse(await f.text()));toast("Memory imported");
  }catch(error){toast(error.message||"Import failed")}
  e.target.value="";
});
$("help").addEventListener("click",()=>$("manual").showModal());
$("closeHelp").addEventListener("click",()=>$("manual").close());
UI.event.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();record()}});
window.RedMemoryV2=Object.freeze({
  observe:info=>{const r=brain.observe(info);if(r){save();refresh()}return r},
  startEpisode:()=>{const n=brain.startEpisode();save();refresh();return n},
  predict:q=>{const r=brain.predict(q,null,true);save();refresh();return r},
  recall:q=>{const r=brain.recall(q,true);save();refresh();return r},
  associations:()=>brain.patterns(),convergences:()=>brain.convergences(),
  stats:()=>brain.stats(),export:()=>brain.export(),import:importData,reset,runTests:test
});
if(restore()){
  message("MEMORY RESTORED","EXPERIENCE ENGINE READY","Saved memories have been reconstructed.",["Patterns are computed from recorded evidence, not pre-programmed task labels."]);
  refresh();
}else example();
resize();
if(typeof ResizeObserver!=="undefined")new ResizeObserver(resize).observe(UI.canvas);
else window.addEventListener("resize",resize);
requestAnimationFrame(frame);
})();
