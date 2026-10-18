/* WANDRUNE / PIXI8 MIGRATION PHASE 1
 * Purely presentational adapter for the existing crafted swarm drawing pass.
 * Phaser 3 + Matter retain all gameplay, collisions, input, time, save keys,
 * agent movement, rune effects, world geometry and combat state.
 * No global cast limit, agent mutation, forced visual LOD or gameplay hooks.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_PIXI_SWARM=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="091-water-lab",CDN="https://cdn.jsdelivr.net/npm/pixi.js@8.10.0/dist/pixi.min.js";
 let scriptLoading=null;
 function clamp(n,a=0,b=1){return Math.min(b,Math.max(a,Number.isFinite(n)?n:a));}
 function wantPixi(search){return !/(?:[?&])(?:renderer|render)=legacy(?:&|$)/.test(search||"");}
 function loadPixi(win){
  if(win.PIXI?.Application&&win.PIXI?.ParticleContainer)return Promise.resolve(win.PIXI);
  if(scriptLoading)return scriptLoading;
  scriptLoading=new Promise((resolve,reject)=>{
   const script=win.document.createElement("script");
   let finished=false;
   const timer=win.setTimeout(()=>fail(new Error("PixiJS download timed out")),12000);
   function fail(err){if(finished)return;finished=true;win.clearTimeout(timer);reject(err);}
   script.src=CDN;script.async=true;
   script.onload=()=>{if(win.PIXI?.ParticleContainer){finished=true;win.clearTimeout(timer);resolve(win.PIXI);}
    else fail(new Error("PixiJS 8 is missing ParticleContainer"));};
   script.onerror=()=>fail(new Error("PixiJS 8 CDN unavailable"));
   win.document.head.append(script);
  }).catch(e=>{scriptLoading=null;throw e;});
  return scriptLoading;
 }
 function classify(record){
  const x=Number(record?.element)||0;
  return Number.isInteger(x)&&x>=0&&x<=4?x:0;
 }
 const ELEMENTS=[
  {name:"arcane",rgb:[182,137,255]},
  {name:"fire",rgb:[255,144,68]},
  {name:"water",rgb:[102,204,251]},
  {name:"frost",rgb:[139,228,255]},
  {name:"lightning",rgb:[162,211,255]}
 ];
 function makeTexture(win,P,kind,variant){
  const canvas=win.document.createElement("canvas");canvas.width=canvas.height=128;
  // White luminance texture can be tinted to the *authored* recipe RGB.
  // A preset-color texture multiplied by the recipe tint would darken custom spells.
  const g=canvas.getContext("2d"),[r,v,b]=[255,255,255];
  const glow=g.createRadialGradient(64,64,1,64,64,59);
  glow.addColorStop(0,"rgba("+r+","+v+","+b+",.95)");
  glow.addColorStop(.16,"rgba("+r+","+v+","+b+",.60)");
  glow.addColorStop(.40,"rgba("+r+","+v+","+b+",.16)");
  glow.addColorStop(1,"rgba("+r+","+v+","+b+",0)");
  g.fillStyle=glow;g.fillRect(0,0,128,128);
  g.save();g.translate(64,64);
  g.shadowColor="rgb("+r+","+v+","+b+")";g.shadowBlur=13;
  g.fillStyle="#ffffff";
  if(variant===0){
   if(kind===1){g.beginPath();g.moveTo(0,-27);g.bezierCurveTo(16,-5,10,4,8,17);g.quadraticCurveTo(-2,26,-12,8);g.quadraticCurveTo(-10,-3,0,-27);g.fill();}
   else if(kind===3){g.beginPath();g.moveTo(0,-27);g.lineTo(8,-6);g.lineTo(0,28);g.lineTo(-9,-7);g.closePath();g.fill();}
   else if(kind===4){g.beginPath();g.moveTo(-5,-25);g.lineTo(9,-6);g.lineTo(0,-5);g.lineTo(9,25);g.lineTo(-12,0);g.lineTo(0,-2);g.closePath();g.fill();}
   else {g.beginPath();g.arc(0,0,10,0,Math.PI*2);g.fill();}
  }else if(variant===1){
   g.rotate(.6);g.beginPath();g.ellipse(0,0,kind===3?4:3,kind===1?22:26,0,0,Math.PI*2);g.fill();
  }else{
   g.beginPath();g.arc(0,0,kind===3?6:3.7,0,Math.PI*2);g.fill();
   if(kind===3){g.strokeStyle="#ffffff";g.lineWidth=1.3;g.beginPath();g.moveTo(-12,0);g.lineTo(12,0);g.moveTo(0,-12);g.lineTo(0,12);g.stroke();}
  }
  g.restore();
  return P.Texture.from(canvas);
 }
 // Display-only fire footprint: original agent count, lifetime, radius,
 // art source, batching, opacity and gameplay all stay untouched.
 // Smooth hypotenuse support prevents hard minimum-size transitions.
 function fireEmberFootprint(radius,element,useMaterial,hero,enabled){
  const base=radius*(useMaterial?3.2:(hero?6.0:4.3));
  return enabled&&element===1&&useMaterial?Math.hypot(base,12):base;
 }
 function createBridge(scene,opts={}){
  const win=opts.window||(typeof window!=="undefined"?window:null);
  if(!win||!win.document)throw Error("Browser required for Pixi overlay");
  const W=Number(opts.width)||960,H=Number(opts.height)||600;
  const stage=opts.stage||win.document.getElementById("stage");
  if(!stage)throw Error("Wandrune stage not found");
  const FORMATION=win.WRKMAN_PIXI_FORMATIONS||null;
  const FIRE_CLUSTERS=win.WRKMAN_FIRE_CLUSTERS||null;
  const FIRE_PERIMETER=win.WRKMAN_FIRE_PERIMETER||null;
  const FIRE_STABILITY=win.WRKMAN_FIRE_STABILITY||null;
  const FIRE_FLAME=win.WRKMAN_FIRE_FLAME||null;
  const FIRE_MOTION=win.WRKMAN_FIRE_MOTION||null;
  const FIRE_GROUP_FLAMES=win.WRKMAN_FIRE_GROUP_FLAMES||null;
  const FIRE_GROUP_FLOW=win.WRKMAN_FIRE_GROUP_FLOW||null;
  const WATER_VFX=win.WRKMAN_WATER_VFX||null;
  const fireMotionTracker=FIRE_MOTION?.makeTracker?FIRE_MOTION.makeTracker():null;
  const fireTracker=FIRE_STABILITY?.makeTracker?FIRE_STABILITY.makeTracker({
   maxSlots:3,fadeMs:180,heatHoldMs:110,heatFadeMs:190}):null;
  const allowedLooks=["original","bright","formation"];
  const requested=allowedLooks.includes(opts.look)?opts.look:"formation";
  const initialLook=requested==="formation"&&!FORMATION?.analyze?"bright":requested;
  const artStyles=["soft","forge","forge-hot"];
  const selectedArt=artStyles.includes(opts.art)?opts.art:"forge";
  const state={active:false,ready:false,loading:false,error:null,records:[],drawn:0,
   details:0,bulk:0,frame:0,look:initialLook,art:selectedArt,materialDrawn:0,artFallback:0,ambientDrawn:0,formations:0,formationSegments:0,canvasOffsetX:0,canvasOffsetY:0,
   fireDebug:!!opts.fireDebug&&!!FIRE_CLUSTERS?.findClusters,
   fireCandidates:0,fireGroups:0,fireLargest:0,fireSingles:0,fireEdges:0,
   fireVisibleGroups:0,fireNeighborChecks:0,
   fireShell:opts.fireShell!==false&&!!FIRE_CLUSTERS?.findClusters&&!!FIRE_PERIMETER?.buildPerimeters,
   fireShellGroups:0,fireShellPaths:0,fireShellVertices:0,fireShellSamples:0,
   fireShellWork:0,fireShellSkipped:0,fireShellMs:0,
   fireBody:opts.fireBody!==false&&!!FIRE_PERIMETER?.buildPerimeters,
   fireBodyLayers:0,fireBodyFills:0,
   fireHot:opts.fireHot!==false&&!!FIRE_PERIMETER?.buildPerimeters&&!!FIRE_CLUSTERS?.findClusters,
   fireHotPaths:0,firePeakPaths:0,fireHotFills:0,fireHotGlows:0,
   fireStable:opts.fireStable!==false&&!!fireTracker,
   fireEmbers:opts.fireEmbers!==false,fireEmberBoosted:0,
   fireFlames:opts.fireFlames!==false&&!!FIRE_FLAME?.makeFlameTexture,
   fireFlamesDrawn:0,
   fireMotion:opts.fireMotion!==false&&!!fireMotionTracker,
   fireMotionAligned:0,fireMotionDense:0,
   fireGroupFlames:opts.fireGroupFlames!==false&&
    !!(FIRE_GROUP_FLOW?.createFlows||FIRE_GROUP_FLAMES?.createTongues)&&!!FIRE_PERIMETER?.buildPerimeters,
   fireGroupStyle:opts.fireGroupFlames===false||opts.fireGroupStyle==="off"?"off":
    opts.fireGroupStyle==="spikes"?"spikes":FIRE_GROUP_FLOW?.createFlows?"flow":"spikes",
   fireGroupTongues:0,fireGroupTongueGroups:0,
   waterDrops:opts.waterDrops!==false&&!!WATER_VFX?.makeDropTexture,
   waterStreams:opts.waterStreams!==false&&!!WATER_VFX?.collectStreams,
   waterDropsDrawn:0,waterStreamsDrawn:0,
   fireStableSlots:0,fireStableGhosts:0,fireStableFading:0,
   fireStableSwaps:0,fireStableHeldHot:0,fireStableCached:0};
  let P=null,app=null,world=null,detailsLayer=null,shapeLayer=null,shapeGraphics=null,
   registrationGraphics=null,registrationPoint=null,textureSet=[],bulkGroups=new Map(),spritePool=[],
   restoredTextures=new Map(),flameTextures=[],waterTextures=[],waterGraphics=null,fireGroupGraphics=null,accentGraphics=null,fireDebugGraphics=null,fireShellGraphics=null,fireBodyGraphics=null,fireHotGraphics=null,disposed=false,heroUsed=0;
  const DETAIL_RATIO=.10;
  function announce(msg){
   if(typeof opts.status==="function")try{opts.status(msg);}catch(_){}
  }
  function setLook(next){
   if(!allowedLooks.includes(next))return state.look;
   if(next==="formation"&&!FORMATION?.analyze){
    announce("FORMATION UNAVAILABLE · BRIGHT ONLY");
    next="bright";
   }
   state.look=next;
   if(next!=="formation"){shapeGraphics?.clear();state.formations=0;state.formationSegments=0;}
   announce("PIXI LOOK · "+next.toUpperCase());
   return state.look;
  }
  const MATERIAL_KEYS=["arcane","fire","water","frost","lightning"];
  const NEUTRAL_PALETTES=new Set(["flame","arcane","healing","void"]);
  const exposedAlpha=(a,elem)=>Math.pow(clamp(a),elem===3?.8:.55);
  function materialKey(r,element){
   const base="wandrune-mat069-";
   if(element>0)return base+MATERIAL_KEYS[element];
   const palette=NEUTRAL_PALETTES.has(r.palette)?r.palette:"flame";
   const progress=clamp(Number(r.progress)||0);
   const tier=progress<.33?0:progress<.7?1:2;
   return base+"neutral-"+palette+"-"+tier;
  }
  function materialTexture(r,element){
   const key=materialKey(r,element);
   if(restoredTextures.has(key))return restoredTextures.get(key);
   // The Phaser material atlas is authoritative for Wandrune's visual style.
   // It was authored by ElementVFX 069, and exists even while Pixi is active.
   const image=scene.textures?.get?.(key)?.getSourceImage?.();
   if(!image||!(image.width>0)||!(image.height>0))return null;
   const t=P.Texture.from(image);
   restoredTextures.set(key,t);
   return t;
  }
  function setArt(next){
   if(!artStyles.includes(next))return state.art;
   state.art=next;
   announce("PIXI ART · "+next.toUpperCase());
   return state.art;
  }
  function paintAccents(){
   if(!accentGraphics)return;
   const g=accentGraphics;g.clear();state.ambientDrawn=0;
   if(state.art!=="forge-hot")return;
   const max=72;
   for(const r of state.records){
    if(state.ambientDrawn>=max)break;
    if(!(r.agentIndex>=0)||r.agentIndex%13!==0||r.alpha<=.06)continue;
    const elem=classify(r),t=(r.time||0)*.001;
    const phase=(r.seed||0)*.731+(r.agentIndex||0)*.593;
    const wobble=.6+.4*Math.sin(t*7+phase);
    const angle=r.angle||0;
    const nx=Math.cos(angle),ny=Math.sin(angle);
    const col=elem===1?0xffd371:elem===3?0xe7fcff:elem===4?0xffffff:
      elem===2?0xc9faff:(Number(r.color)||0xf5e6ff);
    const radius=Math.max(.6,Math.min(4,(r.r||2)*.45));
    g.circle(r.x,r.y,radius*(.65+.3*wobble)).fill({color:col,alpha:exposedAlpha(r.alpha,elem)*.60});
    if(elem===1||elem===4){
     const length=3+Math.min(7,(r.r||2)*1.5);
     g.moveTo(r.x-nx*length*.3,r.y-ny*length*.3)
      .lineTo(r.x+nx*length,r.y+ny*length)
      .stroke({color:col,alpha:exposedAlpha(r.alpha,elem)*.43,width:.7});
    }
    state.ambientDrawn++;
   }
  }
  function tracePaths(g,paths,width,color,alpha){
   // All vertices are the original Phaser-trail world positions.
   // Explicit moveTo starts each separate trail; no cross-agent bridges.
   for(const path of paths){
    if(!path||path.length<2)continue;
    g.moveTo(path[0].x,path[0].y);
    for(let i=1;i<path.length;i++)g.lineTo(path[i].x,path[i].y);
   }
   g.stroke({width,color,alpha,cap:"round",join:"round"});
  }
  function setFireDebug(enabled){
   state.fireDebug=!!enabled&&!!FIRE_CLUSTERS?.findClusters;
   if(!state.fireDebug){
    fireDebugGraphics?.clear();
    state.fireCandidates=0;state.fireGroups=0;state.fireLargest=0;
    state.fireSingles=0;state.fireEdges=0;state.fireVisibleGroups=0;
   }
   announce("FIRE CLUSTERS · "+(state.fireDebug?"DEBUG ON":"OFF"));
   return state.fireDebug;
  }
  function setWaterDrops(enabled){
   state.waterDrops=!!enabled&&waterTextures.length===3&&waterTextures.every(Boolean);
   announce("WATER DROPS · "+(state.waterDrops?"ON":"OFF"));
   return state.waterDrops;
  }
  function setWaterStreams(enabled){
   state.waterStreams=!!enabled&&!!WATER_VFX?.collectStreams;
   if(!state.waterStreams){waterGraphics?.clear();state.waterStreamsDrawn=0;}
   announce("WATER STREAMS · "+(state.waterStreams?"ON":"OFF"));
   return state.waterStreams;
  }
  function setFireGroupStyle(mode){
   let next=["flow","spikes","off"].includes(mode)?mode:"off";
   if(next==="flow"&&!FIRE_GROUP_FLOW?.createFlows)next=FIRE_GROUP_FLAMES?.createTongues?"spikes":"off";
   if(next==="spikes"&&!FIRE_GROUP_FLAMES?.createTongues)next=FIRE_GROUP_FLOW?.createFlows?"flow":"off";
   state.fireGroupStyle=next;
   state.fireGroupFlames=next!=="off"&&!!FIRE_PERIMETER?.buildPerimeters;
   if(!state.fireGroupFlames){fireGroupGraphics?.clear();state.fireGroupTongues=state.fireGroupTongueGroups=0;}
   announce("GROUP FIRE · "+next.toUpperCase());
   return next;
  }
  function setFireGroupFlames(enabled){
   if(!enabled)setFireGroupStyle("off");
   else setFireGroupStyle(FIRE_GROUP_FLOW?.createFlows?"flow":"spikes");
   return state.fireGroupFlames;
  }
  function setFireMotion(enabled){
   state.fireMotion=!!enabled&&!!fireMotionTracker;
   fireMotionTracker?.reset();
   state.fireMotionAligned=state.fireMotionDense=0;
   announce("FIRE MOTION · "+(state.fireMotion?"ON":"OFF"));
   return state.fireMotion;
  }
  function setFireFlames(enabled){
   state.fireFlames=!!enabled&&flameTextures.length===3&&flameTextures.every(Boolean);
   announce("FIRE FLAMES · "+(state.fireFlames?"ON":"OFF"));
   return state.fireFlames;
  }
  function setFireEmbers(enabled){
   state.fireEmbers=!!enabled;
   announce("FIRE EMBERS · "+(state.fireEmbers?"ON":"OFF"));
   return state.fireEmbers;
  }
  function setFireStable(enabled){
   state.fireStable=!!enabled&&!!fireTracker;
   fireTracker?.reset();
   state.fireStableSlots=state.fireStableGhosts=state.fireStableFading=0;
   state.fireStableSwaps=state.fireStableHeldHot=state.fireStableCached=0;
   announce("FIRE STABILITY · "+(state.fireStable?"ON":"OFF"));
   return state.fireStable;
  }
  function setFireShell(enabled){
   state.fireShell=!!enabled&&!!FIRE_PERIMETER?.buildPerimeters&&!!FIRE_CLUSTERS?.findClusters;
   if(!state.fireShell){
    fireShellGraphics?.clear();
    state.fireShellGroups=state.fireShellPaths=state.fireShellVertices=0;
    state.fireShellSamples=state.fireShellWork=state.fireShellSkipped=0;
    state.fireShellMs=0;
   }
   announce("FIRE SHELL · "+(state.fireShell?"ON":"OFF"));
   return state.fireShell;
  }
  function setFireBody(enabled){
   state.fireBody=!!enabled&&!!FIRE_PERIMETER?.buildPerimeters&&!!FIRE_CLUSTERS?.findClusters;
   if(!state.fireBody){fireBodyGraphics?.clear();state.fireBodyLayers=0;state.fireBodyFills=0;}
   announce("FIRE BODY · "+(state.fireBody?"ON":"OFF"));
   return state.fireBody;
  }
  function setFireHot(enabled){
   state.fireHot=!!enabled&&!!FIRE_PERIMETER?.buildPerimeters&&!!FIRE_CLUSTERS?.findClusters;
   if(!state.fireHot){
    fireHotGraphics?.clear();
    state.fireHotPaths=state.firePeakPaths=state.fireHotFills=state.fireHotGlows=0;
   }
   announce("FIRE HOT CORE · "+(state.fireHot?"ON":"OFF"));
   return state.fireHot;
  }
  function drawFireHot(results){
   if(!fireHotGraphics)return;
   const g=fireHotGraphics;
   g.clear();
   state.fireHotFills=0;state.fireHotGlows=0;
   if(!state.fireHot)return;
   function polygon(path){
    const points=path.points;
    if(!path.closed||points.length<4)return false;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.closePath();
    return true;
   }
   for(const cl of results.shells){
    // Hot effects come from the same measured density grid as Pass C.
    // Never apply them to isolated embers or simply brighten every agent.
    if(cl.count<4)continue;
    for(const band of cl.hotBands||[]){
     const peak=band.kind==="peak";
     const color=peak?0xfff2be:0xffc65b;
     const strength=cl.count<13?.58:1;
     const alpha=(peak?.34:.27)*strength*(cl.opacity??1)*(band.opacity??1);
     const paths=band.paths||[];
     for(let i=0;i<paths.length;i++){
      const p=paths[i];
      if(!p.closed||p.depth%2!==0||!polygon(p))continue;
      g.fill({color,alpha});
      state.fireHotFills++;
      // Preserve holes even in hollow hot fire. No glowing disk through
      // the center of a ring, no bridge across disconnected embers.
      for(let j=i+1;j<paths.length;j++){
       const q=paths[j];
       if(q.parent===i&&q.depth===p.depth+1&&q.closed&&polygon(q))
        if(typeof g.cut==="function")g.cut();
      }
      // Soft inner light: two restrained concentric border treatments,
      // still derived only from the original contour positions.
      for(const halo of peak?[
       {width:4.5,alpha:.09*strength*(cl.opacity??1)*(band.opacity??1)},{width:1.4,alpha:.16*strength*(cl.opacity??1)*(band.opacity??1)}
      ]:[
       {width:7,alpha:.06*strength*(cl.opacity??1)*(band.opacity??1)},{width:2.5,alpha:.09*strength*(cl.opacity??1)*(band.opacity??1)}
      ]){
       if(!polygon(p))continue;
       g.stroke({color,alpha:halo.alpha,width:halo.width,
        cap:"round",join:"round"});
       state.fireHotGlows++;
      }
     }
    }
   }
  }
  function drawFireBody(results){
   if(!fireBodyGraphics)return;
   fireBodyGraphics.clear();
   state.fireBodyLayers=0;state.fireBodyFills=0;
   if(!state.fireBody)return;
   const g=fireBodyGraphics;
   function polygon(path){
    const points=path.points;
    if(!path.closed||points.length<4)return false;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.closePath();
    return true;
   }
   for(const cl of results.shells){
    // A pair gets just a whisper. Larger collectives deserve a visible
    // body, but never a full-opacity mask over the game's environment.
    const confidence=cl.count<=3?.22:cl.count<=12?.58:1;
    for(const band of cl.bands||[]){
     const dense=band.kind==="dense";
     const opacity=(dense?.19:.16)*confidence*(cl.opacity??1);
     const color=dense?0xffac49:0xff5922;
     // Contours are ordered by enclosed area with recorded nesting.
     // A hole contour is cut from its parent (PixiJS 8 Graphics.cut).
     // A detached bright island gets a separate fill, never a bridge.
     const paths=band.paths||[];
     for(let i=0;i<paths.length;i++){
      const p=paths[i];
      if(!p.closed||p.depth%2||!polygon(p))continue;
      g.fill({color,alpha:opacity});
      state.fireBodyFills++;
      for(let j=i+1;j<paths.length;j++){
       const q=paths[j];
       if(q.parent===i&&q.depth===p.depth+1&&q.closed&&polygon(q)){
        if(typeof g.cut==="function")g.cut();
       }
      }
     }
     state.fireBodyLayers++;
    }
   }
  }
  function drawFireGroupFlames(results,groups){
   fireGroupGraphics?.clear();
   state.fireGroupTongues=state.fireGroupTongueGroups=0;
   if(!state.fireGroupFlames||!fireGroupGraphics)return;
   try{
    // Scene clock rather than a frame counter; same timing on iPhone 30/60 FPS.
    const sceneTime=Number(state.records[0]?.time);
    const presentationTime=Number.isFinite(sceneTime)?sceneTime:state.frame*16.667;
    if(state.fireGroupStyle==="flow"&&FIRE_GROUP_FLOW?.createFlows){
     const fire=FIRE_GROUP_FLOW.createFlows(results.shells,groups,presentationTime,
      {maxTotal:12,maxPerGroup:4});
     state.fireGroupTongues=FIRE_GROUP_FLOW.drawFlows(fireGroupGraphics,fire.ribbons);
     state.fireGroupTongueGroups=fire.groups;
    }else if(state.fireGroupStyle==="spikes"&&FIRE_GROUP_FLAMES?.createTongues){
     const flame=FIRE_GROUP_FLAMES.createTongues(results.shells,presentationTime,
      {maxTotal:30,maxPerShell:10});
     state.fireGroupTongues=FIRE_GROUP_FLAMES.drawTongues(fireGroupGraphics,flame.tongues);
     state.fireGroupTongueGroups=flame.groups;
    }
   }catch(error){
    console.warn("Optional group fire appearance unavailable",error);
    setFireGroupStyle("off");
   }
  }
  function paintFireShells(found){
   if(!fireShellGraphics)return;
   fireShellGraphics.clear();
   if((!state.fireShell&&!state.fireBody&&!state.fireHot&&!state.fireGroupFlames)||!found||!FIRE_PERIMETER?.buildPerimeters)return;
   const before=typeof performance!=="undefined"?performance.now():0;
   try{
    let choice=null;
    let groups=found.groups;
    if(state.fireStable&&fireTracker){
     const now=typeof performance!=="undefined"?performance.now():state.frame*16.667;
     choice=fireTracker.step(found.groups,now);
     groups=choice.slots.filter(slot=>slot.group).map(slot=>slot.group);
     state.fireStableSlots=choice.selected;
     state.fireStableGhosts=choice.ghosts;
     state.fireStableFading=choice.fading;
     state.fireStableSwaps=choice.swaps;
    }
    let results=FIRE_PERIMETER.buildPerimeters(groups,{
     maxGroups:3,sampleBudget:3500,
     threshold:(state.fireBody||state.fireHot)?.78:undefined,body:state.fireBody,hot:state.fireHot});
    if(choice){
     results=fireTracker.apply(results,choice);
     state.fireStableHeldHot=results.heldHot;
     state.fireStableCached=results.cachedShells;
    }
    state.fireShellGroups=choice?results.visibleShells:results.groups;
    state.fireShellPaths=results.paths;
    state.fireShellVertices=results.vertices;
    state.fireShellSamples=results.samples;
    state.fireShellWork=results.work;
    state.fireShellSkipped=results.skipped;
    state.fireHotPaths=results.hotPaths;
    state.firePeakPaths=results.peakPaths;
    drawFireBody(results);
    drawFireHot(results);
    drawFireGroupFlames(results,groups);
    if(state.fireShell)for(const cl of results.shells){
     const factor=cl.count>=4?1:.65;
     // Only soften the glowing capsule boundary in the new appearance.
     const rimStrength=state.fireGroupFlames&&cl.count>=8?
      (state.fireGroupStyle==="flow"?.15:.45):1;
     // Boundary ONLY in Pass B: no opaque fill and no bright interior.
     // Three feathered stroked bands suggest hot plasma around the
     // exact merged influence of neighboring agents.
     for(const path of cl.paths){
      const points=path.points;
      if(points.length<3)continue;
      for(const band of state.fireBody?[
       // Pull the previous floating capsule in toward the fire.
       {width:9,color:0xff5015,alpha:.03*factor},
       {width:4,color:0xff8d2d,alpha:.07*factor},
       {width:1.4,color:0xffc16b,alpha:.10*factor}
      ]:[
       {width:15,color:0xff5015,alpha:.045*factor},
       {width:7,color:0xff8d2d,alpha:.095*factor},
       {width:2.4,color:0xffc16b,alpha:.16*factor}
      ]){
       const g=fireShellGraphics;
       g.moveTo(points[0].x,points[0].y);
       for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
       if(path.closed)g.closePath();
       g.stroke({width:band.width,color:band.color,
        alpha:band.alpha*rimStrength*(cl.opacity??1),cap:"round",join:"round"});
      }
     }
    }
    state.fireShellMs=before?Math.round((performance.now()-before)*10)/10:0;
   }catch(error){
    console.warn("Nonfatal fire perimeter failure",error);
    setFireShell(false);setFireBody(false);setFireHot(false);setFireGroupFlames(false);
   }
  }
  function paintWaterStreams(){
   waterGraphics?.clear();state.waterStreamsDrawn=0;
   if(!state.waterStreams||!waterGraphics||!WATER_VFX?.collectStreams)return;
   try{
    const streams=WATER_VFX.collectStreams(state.records,{maxStreams:64});
    state.waterStreamsDrawn=WATER_VFX.drawStreams(waterGraphics,streams);
   }catch(error){
    console.warn("Optional water streams unavailable",error);
    setWaterStreams(false);
   }
  }
  function paintFireEffects(){
   if(!state.fireDebug&&!state.fireShell&&!state.fireBody&&!state.fireHot&&!state.fireGroupFlames)return;
   let found;
   try{
    // One clustering operation supplies BOTH the validated Pass A debug
    // and the new Pass B surface. Do not double-process 200 agents.
    found=FIRE_CLUSTERS.findClusters(state.records,{
     bounds:fireViewport(),radius:26,margin:36});
   }catch(error){
    console.warn("Nonfatal fire group failure",error);
    setFireShell(false);setFireBody(false);setFireHot(false);setFireGroupFlames(false);setFireDebug(false);return;
   }
   paintFireShells(found);
   paintFireDebug(found);
  }
  function fireViewport(){
   const cam=scene.cameras?.main;
   if(!cam?.getWorldPoint)return null;
   const a=cam.getWorldPoint(0,0),b=cam.getWorldPoint(W,0),
     c=cam.getWorldPoint(0,H),d=cam.getWorldPoint(W,H);
   return {minX:Math.min(a.x,b.x,c.x,d.x),maxX:Math.max(a.x,b.x,c.x,d.x),
    minY:Math.min(a.y,b.y,c.y,d.y),maxY:Math.max(a.y,b.y,c.y,d.y)};
  }
  function paintFireDebug(found){
   const g=fireDebugGraphics;if(!g)return;
   g.clear();
   if(!state.fireDebug||!FIRE_CLUSTERS?.findClusters)return;
   if(!found)return;
   state.fireCandidates=found.candidates;state.fireGroups=found.activeClusters;
   state.fireLargest=found.largest;state.fireSingles=found.singles;
   state.fireEdges=found.links;state.fireNeighborChecks=found.checks;
   // Debug only. Full detection remains uncapped; cap drawn geometry
   // to avoid turning the diagnostic into the performance bottleneck.
   const display=found.groups.slice(0,18);state.fireVisibleGroups=display.length;
   let linesLeft=150;
   for(const cl of display){
    const color=cl.debugColor,h=cl.hull;
    if(h.length>=3){
     g.moveTo(h[0].x,h[0].y);
     for(let k=1;k<h.length;k++)g.lineTo(h[k].x,h[k].y);
     g.closePath().fill({color,alpha:.08});
     // A separate explicit path keeps the perimeter visible even when
     // PixiJS consumes the fill path before its stroke pass.
     g.moveTo(h[0].x,h[0].y);
     for(let k=1;k<h.length;k++)g.lineTo(h[k].x,h[k].y);
     g.closePath().stroke({color,alpha:.88,width:1.5,join:"round"});
    }else if(h.length===2){
     g.moveTo(h[0].x,h[0].y).lineTo(h[1].x,h[1].y)
      .stroke({color,alpha:.9,width:2.5});
    }
    // Each connection represents an actual neighborhood union; these
    // links are diagnostic only and do not create damage or physics.
    const remaining=Math.min(linesLeft,Math.min(35,cl.edges.length));
    if(remaining){
     const stride=Math.max(1,Math.ceil(cl.edges.length/remaining));
     let taken=0;
     for(let j=0;j<cl.edges.length&&taken<remaining;j+=stride){
      const edge=cl.edges[j];
      g.moveTo(edge.a.x,edge.a.y).lineTo(edge.b.x,edge.b.y)
       .stroke({color,alpha:.26,width:.8});
      taken++;
     }
     linesLeft-=taken;
    }
    // Centroid anchor indicates a unique group in the overlay.
    g.circle(cl.x,cl.y,3).fill({color,alpha:.94});
   }
  }
  function paintFormations(){
   if(!shapeGraphics)return;
   shapeGraphics.clear();
   state.formations=0;state.formationSegments=0;
   if(state.look!=="formation"||!FORMATION?.analyze)return;
   const inferred=FORMATION.analyze(state.records,{maxFormations:10,maxPaths:64});
   for(const f of inferred){
    // A coherent shape without history should stay unaugmented. Its history
    // must arrive from the actual spell draw path, never a guessed centerline.
    if(!f.paths?.length)continue;
    state.formations++;
    state.formationSegments+=f.paths.reduce((n,path)=>n+Math.max(0,path.length-1),0);
    const color=f.color;
    const r=(color>>>16)&255,gr=(color>>>8)&255,blue=color&255;
    const hot=(Math.round(r+(255-r)*.55)<<16)|
     (Math.round(gr+(255-gr)*.55)<<8)|Math.round(blue+(255-blue)*.55);
    // Wide ambient band + narrow luminous core, both anchored to the same
    // historic line segments that the Phaser draw pass shows in orange.
    const width=Math.min(15,Math.max(3,Number(f.meanRadius||3)*2));
    tracePaths(shapeGraphics,f.paths,width,color,.06);
    tracePaths(shapeGraphics,f.paths,Math.max(1.1,width*.35),hot,.12);
   }
  }
  function getGroup(texture,key){
   let group=bulkGroups.get(key);
   if(!group){
    const pool=[];
    // PixiJS 8 ParticleContainer requires a shared texture source.
    // A separate container per material source keeps UVs static and fast.
    const container=new P.ParticleContainer({
     texture,
     dynamicProperties:{position:true,vertex:true,rotation:true,uvs:false,color:true}
    });
    container.blendMode="normal";
    world.addChildAt(container,world.children.indexOf(detailsLayer));
    group={pool,container,used:0,sourceKey:key};
    bulkGroups.set(key,group);
   }
   return group;
  }
  function allocateHero(){
   if(heroUsed<spritePool.length)return spritePool[heroUsed++];
   const sprite=new P.Sprite(textureSet[0][0]);
   sprite.anchor.set(.5);sprite.blendMode="add";
   detailsLayer.addChild(sprite);spritePool.push(sprite);heroUsed++;
   return sprite;
  }
  function takeParticle(texture,sourceKey){
   const batch=getGroup(texture,sourceKey),index=batch.used++;
   if(index<batch.pool.length)return batch.pool[index];
   const particle=new P.Particle({texture,
    x:0,y:0,anchorX:.5,anchorY:.5,rotation:0,scaleX:1,scaleY:1,alpha:0});
   batch.container.addParticle(particle);
   batch.pool.push(particle);
   return particle;
  }
  function setReference(x,y){
   if(!opts.alignDebug)return;
   registrationPoint=Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  }
  function drawReference(){
   if(!registrationGraphics)return;
   const g=registrationGraphics;
   g.clear();
   if(!registrationPoint)return;
   const {x,y}=registrationPoint;
   // Same world point is magenta on Phaser and cyan on Pixi.
   g.moveTo(x-11,y).lineTo(x+11,y).stroke({width:2,color:0x00ffff});
   g.moveTo(x,y-11).lineTo(x,y+11).stroke({width:2,color:0x00ffff});
   g.circle(x,y,6).stroke({width:1.5,color:0x00ffff});
  }
  function align(){
   if(!app||!app.canvas)return;
   const phaserCanvas=stage.querySelector("canvas:not(.wandrune-pixi-canvas)");
   if(!phaserCanvas)return;
   const a=phaserCanvas.getBoundingClientRect(),b=stage.getBoundingClientRect();
   const cv=app.canvas;
   cv.style.left=(a.left-b.left)+"px";cv.style.top=(a.top-b.top)+"px";
   cv.style.width=a.width+"px";cv.style.height=a.height+"px";
   if(opts.alignDebug&&state.frame%12===0){
    // Measure actual DOM compositing difference separately from world
    // transforms. If the two canvases disagree, we can identify the cause.
    const pr=app.canvas.getBoundingClientRect();
    state.canvasOffsetX=Math.round((pr.left-a.left)*10)/10;
    state.canvasOffsetY=Math.round((pr.top-a.top)*10)/10;
   }
   const cam=scene.cameras?.main;
   if(cam&&world){
    // Map the *actual Phaser camera inverse* to Pixi world transforms.
    // Accounts for follow, zoom and the game's phone-scale ENVELOP crop.
    const p0=cam.getWorldPoint(0,0);
    const px=cam.getWorldPoint(W,0);
    const py=cam.getWorldPoint(0,H);
    const scaleX=W/(px.x-p0.x),scaleY=H/(py.y-p0.y);
    if(Number.isFinite(scaleX)&&Number.isFinite(scaleY)&&Math.abs(scaleX)<50&&Math.abs(scaleY)<50){
     world.scale.set(scaleX,scaleY);
     world.position.set(-p0.x*scaleX,-p0.y*scaleY);
    }
   }
  }
  async function enable(){
   if(disposed)return false;
   if(state.ready&&app){state.active=true;app.canvas.style.display="block";announce("PIXI8 SWARM · ON");return true;}
   if(state.loading)return false;
   state.loading=true;state.error=null;announce("PIXI8 SWARM · LOADING");
   try{
    P=await loadPixi(win);
    if(disposed)return false;
    app=new P.Application();
    await app.init({width:W,height:H,resolution:Math.min(2,win.devicePixelRatio||1),
     autoDensity:true,backgroundAlpha:0,antialias:false,preference:"webgl",powerPreference:"high-performance"});
    if(disposed){app.destroy(true);return false;}
    app.stop();
    world=new P.Container();detailsLayer=new P.Container();
    shapeLayer=new P.Container();shapeLayer.blendMode="add";shapeGraphics=new P.Graphics();
    shapeLayer.addChild(shapeGraphics);
    accentGraphics=new P.Graphics();fireDebugGraphics=new P.Graphics();
    fireBodyGraphics=new P.Graphics();fireBodyGraphics.blendMode="normal";
    fireHotGraphics=new P.Graphics();fireHotGraphics.blendMode="add";
    fireShellGraphics=new P.Graphics();fireShellGraphics.blendMode="add";
    fireGroupGraphics=new P.Graphics();fireGroupGraphics.blendMode="normal";
    waterGraphics=new P.Graphics();waterGraphics.blendMode="normal";
    app.stage.addChild(world);world.addChild(shapeLayer,fireBodyGraphics,fireHotGraphics,fireShellGraphics,fireGroupGraphics,waterGraphics,detailsLayer,accentGraphics,fireDebugGraphics);
    if(opts.alignDebug){
     registrationGraphics=new P.Graphics();
     world.addChild(registrationGraphics);
    }
    textureSet=ELEMENTS.map((_,e)=>[0,1,2].map(v=>makeTexture(win,P,e,v)));
    // Three shared flame silhouettes, allocated ONCE. Subsequent frames
    // still submit exactly one visual per existing fire agent.
    if(FIRE_FLAME?.makeFlameTexture){
     try{
      const source=scene.textures?.get?.("wandrune-mat069-fire")?.getSourceImage?.();
      if(source?.width>0&&source?.height>0){
       flameTextures=[0,1,2].map(v=>FIRE_FLAME.makeFlameTexture(win,P,source,v));
      }
     }catch(error){console.warn("Optional fire appearance unavailable",error);flameTextures=[];}
    }
    state.fireFlames=state.fireFlames&&flameTextures.length===3&&flameTextures.every(Boolean);
    if(WATER_VFX?.makeDropTexture){
     try{
      const source=scene.textures?.get?.("wandrune-mat069-water")?.getSourceImage?.();
      if(source?.width>0&&source?.height>0)
       waterTextures=[0,1,2].map(v=>WATER_VFX.makeDropTexture(win,P,source,v));
     }catch(error){console.warn("Water droplet art unavailable",error);waterTextures=[];}
    }
    state.waterDrops=state.waterDrops&&waterTextures.length===3&&waterTextures.every(Boolean);
    const cv=app.canvas;cv.classList.add("wandrune-pixi-canvas");
    Object.assign(cv.style,{position:"absolute",pointerEvents:"none",zIndex:"2",display:"block",maxWidth:"none",maxHeight:"none"});
    stage.appendChild(cv);
    state.active=true;state.ready=true;state.loading=false;
    align();announce("PIXI8 SWARM · ON");
    return true;
   }catch(err){
    state.loading=false;state.active=false;state.error=String(err?.message||err);
    announce("PIXI UNAVAILABLE · PHASER SAFE");
    try{app?.destroy(true);}catch(_){}app=null;
    return false;
   }
  }
  function disable(reason){
   state.active=false;state.records.length=0;
   fireTracker?.reset();
   state.fireStableSlots=state.fireStableGhosts=state.fireStableFading=0;
   state.fireStableSwaps=state.fireStableHeldHot=state.fireStableCached=0;
   state.fireEmberBoosted=0;state.fireFlamesDrawn=0;
   state.fireMotionAligned=state.fireMotionDense=0;
   fireMotionTracker?.reset();
   state.fireGroupTongues=state.fireGroupTongueGroups=0;
   state.waterDropsDrawn=state.waterStreamsDrawn=0;
   if(app?.canvas)app.canvas.style.display="none";
   shapeGraphics?.clear();accentGraphics?.clear();fireDebugGraphics?.clear();fireShellGraphics?.clear();fireBodyGraphics?.clear();fireHotGraphics?.clear();fireGroupGraphics?.clear();waterGraphics?.clear();state.fireBodyLayers=state.fireBodyFills=0;state.fireHotFills=state.fireHotGlows=0;state.fireShellGroups=state.fireShellPaths=state.fireShellVertices=0;state.formations=0;state.formationSegments=0;state.ambientDrawn=0;
   if(reason)state.error=String(reason);
   announce("PHASER SWARM · SAFE FALLBACK");
  }
  function begin(){
   if(!state.active||!app)return;
   state.records.length=0;
  }
  function paint(record){
   if(!state.active)return false;
   if(!record||!Number.isFinite(record.x)||!Number.isFinite(record.y))return false;
   state.records.push(record);
   return true;
  }
  function end(){
   if(!state.active||!app)return;
   try{
    state.frame++;heroUsed=0;
    for(const group of bulkGroups.values())group.used=0;
    let detailed=0,bulk=0,materialDrawn=0,artFallback=0,emberBoosted=0,flamesDrawn=0;
    let motionAligned=0,motionDense=0,waterDropsDrawn=0;
    const neighborCounts=state.fireMotion&&state.fireFlames?
     FIRE_MOTION.countNearbyFire(state.records):null;
    if(neighborCounts)fireMotionTracker.beginFrame();
    for(const r of state.records){
     const elem=classify(r),index=Math.max(0,Number(r.agentIndex)||0);
     const hero=(index%10===0)||(r.r>9&&index%4===0);
     const variant=(Math.floor(index/3)+elem)%3;
     const radius=clamp(Number(r.r),.6,80);
     const texture=state.art==="soft"?null:materialTexture(r,elem);
     const useMaterial=!!texture;
     if(useMaterial)materialDrawn++;else if(state.art!=="soft")artFallback++;
     // Preserve native fire art and fade; small fragments remain legible.
     const size=fireEmberFootprint(radius,elem,useMaterial,hero,state.fireEmbers);
     if(elem===1&&useMaterial&&state.fireEmbers&&size>radius*3.2+.5)emberBoosted++;
     // Phaser's material response uses nonlinear opacity, without an
     // artificial floor that would prevent a fading agent disappearing.
     const alpha=useMaterial?exposedAlpha(r.alpha??.65,elem):
      clamp(clamp(r.alpha??.65)*
       (state.look==="original"?(hero?.86:.62):(hero?1.12:1.22)));
     const visualTint=useMaterial?0xffffff:
      typeof r.color==="number"&&Number.isFinite(r.color)?(r.color&0xffffff):0xffffff;
     const flame=elem===1&&useMaterial&&state.fireFlames&&!!flameTextures[variant];
     const idlePose=flame?FIRE_FLAME.flamePose(r,size):null;
     const neighborhood=flame&&neighborCounts?(neighborCounts.get(r)||0):0;
     const moving=flame&&neighborCounts?
      fireMotionTracker.sample(r,neighborhood,idlePose.rotation):null;
     const pose=flame&&moving?{
      width:idlePose.width*moving.width,
      height:idlePose.height*moving.stretch,
      rotation:moving.rotation
     }:idlePose;
     const water=elem===2&&useMaterial&&state.waterDrops&&!!waterTextures[variant];
     const waterPose=water?WATER_VFX.dropPose(r,size):null;
     if(water)waterDropsDrawn++;
     if(flame)flamesDrawn++;
     if(moving?.aligned)motionAligned++;
     if(flame&&neighborhood>=5)motionDense++;
     if(hero){
      const sprite=allocateHero();
      sprite.texture=water?waterTextures[variant]:(flame?flameTextures[variant]:(texture||textureSet[elem][variant]));
      sprite.position.set(r.x,r.y);
      sprite.rotation=water?waterPose.rotation:(flame?pose.rotation:(useMaterial?(elem===3?Math.sin(r.seed||0)*.1:elem===1?Math.sin((r.time||0)*.0008+(r.seed||0))*.12:0):(r.angle||0)));
      sprite.width=water?waterPose.width:(flame?pose.width:size);
      sprite.height=water?waterPose.height:(flame?pose.height:size*(useMaterial?1:1.55));
      sprite.alpha=alpha;sprite.visible=true;
      // Texture contains its own elemental glow, with bright hero accents.
      sprite.tint=visualTint;
      detailed++;
     }else{
      const selectedTexture=water?waterTextures[variant]:(flame?flameTextures[variant]:(texture||textureSet[elem][variant]));
      const sourceKey=water?"water091:"+variant:(flame?"flame087:"+variant:(useMaterial?"material:"+materialKey(r,elem):"soft:"+elem+":"+variant));
      const particle=takeParticle(selectedTexture,sourceKey);
      particle.x=r.x;particle.y=r.y;
      particle.rotation=water?waterPose.rotation:(flame?pose.rotation:(useMaterial?(elem===3?Math.sin(r.seed||0)*.1:0):(r.angle||0)));
      const sourceSide=water?WATER_VFX.SIDE:(flame?FIRE_FLAME.SIDE:(useMaterial?48:128));
      particle.scaleX=(water?waterPose.width:(flame?pose.width:size))/sourceSide;
      particle.scaleY=(water?waterPose.height:(flame?pose.height:size*(useMaterial?1:1.5)))/sourceSide;
      particle.alpha=alpha;
      particle.tint=visualTint;
      bulk++;
     }
    }
    // Never edits trajectory, collision, position or count: this is a
    // purely visual geometric interpretation of already-computed records.
    paintFormations();paintAccents();paintWaterStreams();paintFireEffects();
    state.materialDrawn=materialDrawn;state.artFallback=artFallback;
    state.fireEmberBoosted=emberBoosted;state.fireFlamesDrawn=flamesDrawn;
    state.fireMotionAligned=motionAligned;state.fireMotionDense=motionDense;
    state.waterDropsDrawn=waterDropsDrawn;
    for(let i=heroUsed;i<spritePool.length;i++)spritePool[i].visible=false;
    for(const group of bulkGroups.values())for(let i=group.used;i<group.pool.length;i++)group.pool[i].alpha=0;
    align();drawReference();app.render();
    state.drawn=state.records.length;state.details=detailed;state.bulk=bulk;
    state.records.length=0;
   }catch(err){console.error("Wandrune Pixi overlay failed; keeping gameplay intact",err);disable(err?.message||err);}
  }
  function destroy(){
   disposed=true;disable();
   try{app?.destroy(true,{children:true,texture:false,textureSource:false});}catch(_){}
   app=null;world=null;shapeLayer=null;shapeGraphics=null;accentGraphics=null;fireDebugGraphics=null;fireShellGraphics=null;fireBodyGraphics=null;fireHotGraphics=null;fireGroupGraphics=null;waterGraphics=null;registrationGraphics=null;registrationPoint=null;bulkGroups.clear();spritePool=[];restoredTextures.clear();flameTextures=[];waterTextures=[];state.ready=false;
  }
  return Object.assign(state,{enable,disable,begin,paint,end,destroy,align,setLook,setArt,setFireDebug,setFireShell,setFireBody,setFireHot,setFireStable,setFireEmbers,setFireFlames,setFireMotion,setFireGroupFlames,setFireGroupStyle,setWaterDrops,setWaterStreams,setReference,ratio:DETAIL_RATIO,version:VERSION});
 }
 return Object.freeze({VERSION,CDN,loadPixi,wantPixi,classify,fireEmberFootprint,createBridge});
});