/* WRKMAN Magic Lab 054 | Adaptive soundtrack controller.
 * Long-form MP3s remain compressed media elements (not huge decoded AudioBuffers).
 * Envelope: end fade → rewind → start fade. Scene change: independent 2.4s crossfade.
 * Game physics and the 60Hz rendering loop never depend on audio.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_MUSIC=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const KEYS=Object.freeze({main:"a-new-journey",battle:"wizard-life"});
 const FILES=Object.freeze({main:"./audio/a-new-journey.mp3?v=054",battle:"./audio/wizard-life.mp3?v=054"});
 const DB="wrkman-magic-lab-audio-v1",STORE="tracks",PREF="wrkman-magic-lab054-soundtrack";
 const CROSSFADE=2400,OUTRO=2.7,INTRO=1.35;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 function envelope(time,duration,outro=OUTRO,intro=INTRO){
   if(!(duration>0)||!(time>=0))return 0;
   const left=duration-time;
   return clamp(time/intro)*clamp(left/outro);
 }
 function threat(scene,range=310){
   if(!scene||!scene.player||!scene.combat?.enemies)return false;
   const p=scene.player;
   return scene.combat.enemies.some(e=>{
     if(!e.alive||e.type==="mossling"||!e.body?.position)return false;
     const q=e.body.position,dx=p.x-q.x,dy=p.y-q.y;
     return dx*dx+dy*dy<=range*range;
   });
 }
 function dbOpen(){
   return new Promise((resolve,reject)=>{
     if(typeof indexedDB==="undefined"){reject(Error("IndexedDB unavailable"));return;}
     const open=indexedDB.open(DB,1);
     open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(STORE))open.result.createObjectStore(STORE);};
     open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error||Error("DB open failed"));
   });
 }
 async function loadSaved(){
   const db=await dbOpen();
   try{return await new Promise((resolve,reject)=>{
     const transaction=db.transaction(STORE,"readonly"),store=transaction.objectStore(STORE);
     const results={};let done=0,failed=false;
     for(const [key,id] of Object.entries(KEYS)){
       const req=store.get(id);
       req.onsuccess=()=>{results[key]=req.result;done++;if(done===2)resolve(results);};
       req.onerror=()=>{failed=true;reject(req.error);};
     }
     transaction.onerror=()=>{if(!failed)reject(transaction.error);};
   });}finally{db.close();}
 }
 async function saveBlob(key,blob){
   const db=await dbOpen();
   try{return await new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,"readwrite");
     tx.objectStore(STORE).put(blob,KEYS[key]);
     tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error("Unable to store audio"));
     tx.onabort=()=>reject(tx.error||Error("Audio save aborted"));
   });}finally{db.close();}
 }
 function create(opts={}){
   const AudioCtor=opts.Audio||((typeof Audio!=="undefined")?Audio:null);
   if(!AudioCtor)throw Error("Browser audio is unavailable");
   const store=opts.storage||null;
   const onStatus=typeof opts.onStatus==="function"?opts.onStatus:()=>{};
   let volume=0.68,enabled=true,unlocked=false,mode="main",running=false,raf=0,interval=0,
     lastThreat=0,lastProximity=false,sourceReady={main:false,battle:false},
     urlByTrack={main:null,battle:null},generation=0;
   try{
     const pref=JSON.parse(store?.getItem(PREF)||"null");
     if(pref&&typeof pref==="object"){
       if(typeof pref.enabled==="boolean")enabled=pref.enabled;
       if(Number.isFinite(pref.volume))volume=clamp(pref.volume,0.05,1);
     }
   }catch(_){}
   const tracks={};
   for(const name of ["main","battle"]){
     const el=new AudioCtor();
     el.preload="auto";el.loop=false;el.volume=0;el.playsInline=true;
     el.addEventListener("error",()=>{
       const error=el.error?.code||"";
       if(el.src)onStatus("Music "+name+" unavailable"+(error?" (code "+error+")":"")+". Import MP3s in ☰.");
     });
     el.addEventListener("ended",()=>{
       if(!enabled||!unlocked||!running)return;
       try{el.currentTime=0;}catch(_){}
       if(mode===name)tryPlay(name);
     });
     tracks[name]={el,mix:0,from:0,to:0,at:0,until:0,lastAttempt:-3000};
   }
   function persist(){
     try{store?.setItem(PREF,JSON.stringify({enabled,volume}));}catch(_){}
   }
   function setSource(name,source,isObjectURL=false){
     if(!tracks[name])return;
     const track=tracks[name],wasPlaying=!track.el.paused;
     track.el.pause();
     if(isObjectURL&&urlByTrack[name])URL.revokeObjectURL(urlByTrack[name]);
     urlByTrack[name]=isObjectURL?source:null;
     track.el.src=source;track.el.load();
     sourceReady[name]=true;
     if(wasPlaying&&unlocked&&enabled)tryPlay(name);
   }
   async function initialize(){
     // Imported audio has precedence; hosted static assets work for all visitors.
     let local={};
     try{local=await loadSaved();}catch(_){}
     for(const name of ["main","battle"]){
       if(!sourceReady[name]&&local[name] instanceof Blob&&local[name].size>128){
         setSource(name,URL.createObjectURL(local[name]),true);
       }else{
         // Avoid an error event from an expected 404 when assets aren't hosted yet.
         try{
           const response=await fetch(FILES[name],{method:"HEAD",cache:"no-cache"});
           if(response.ok&&!sourceReady[name])setSource(name,FILES[name]);
         }catch(_){}
       }
     }
     onStatus(sourceReady.main&&sourceReady.battle?"Music library ready.":"Import both MP3s through ☰ → IMPORT MUSIC.");
     return {...sourceReady};
   }
   function tween(name,value,duration,now=performance.now()){
     const tr=tracks[name];
     tr.from=tr.mix;tr.to=clamp(value);tr.at=now;tr.until=now+Math.max(0,duration);
     if(duration<=0)tr.mix=tr.to;
   }
   function tryPlay(name){
     const tr=tracks[name];
     if(!sourceReady[name])return Promise.resolve(false);
     if(!tr.el.paused)return Promise.resolve(true);
     const now=performance.now();
     if(now-tr.lastAttempt<950)return Promise.resolve(false);
     tr.lastAttempt=now;
     try{
       const p=tr.el.play();
       if(p&&typeof p.then==="function"){
         return p.then(()=>true).catch(()=>{onStatus("Tap ♫ MUSIC to allow playback on this device.");return false;});
       }
       return Promise.resolve(true);
     }catch(_){onStatus("Tap ♫ MUSIC to allow playback.");return Promise.resolve(false);}
   }
   function setMode(next,instant=false){
     if(next!=="main"&&next!=="battle")return;
     if(mode===next&&!instant)return;
     mode=next;
     const now=performance.now();
     for(const name of ["main","battle"])tween(name,name===next?1:0,instant?0:CROSSFADE,now);
     if(enabled&&unlocked)tryPlay(next);
     if(!running&&enabled&&unlocked)startFrame();
   }
   function updateFrame(){
     raf=0;
     if(!running)return;
     const now=performance.now();
     for(const name of ["main","battle"]){
       const tr=tracks[name],a=tr.el;
       if(tr.until>tr.at){
         tr.mix=tr.to+(tr.from-tr.to)*(1-clamp((now-tr.at)/(tr.until-tr.at)));
         if(now>=tr.until){tr.mix=tr.to;tr.at=tr.until=0;}
       }
       if(!sourceReady[name])continue;
       const duration=Number.isFinite(a.duration)?a.duration:0;
       if(duration>0&&a.currentTime>=duration-0.10){
         try{a.currentTime=0;}catch(_){}
       }
       const fade=envelope(a.currentTime,duration);
       const gain=(enabled&&unlocked)?tr.mix*volume*fade:0;
       a.volume=clamp(gain);
       // Only the active track and any tail of a crossfade keep decoding.
       if(a.paused&&gain>0.0001)tryPlay(name);
       if(name!==mode&&tr.mix<0.0005&&!a.paused)a.pause();
     }
     if(typeof document==="undefined"||!document.hidden)raf=requestAnimationFrame(updateFrame);
   }
   function startFrame(){
     if(running)return;
     running=true;
     raf=requestAnimationFrame(updateFrame);
   }
   function stopFrame(){
     running=false;
     if(raf)cancelAnimationFrame(raf);
     raf=0;
   }
   function unlock(){
     unlocked=true;
     if(!enabled)return;
     const tr=tracks[mode];tr.mix=Math.max(tr.mix,0);
     const now=performance.now();
     tween(mode,1,1700,now);
     if(!running)startFrame();
     // Called synchronously from a tap; iOS allows this user-initiated play().
     tryPlay(mode);
   }
   function setEnabled(next){
     enabled=Boolean(next);persist();
     if(enabled){unlock();onStatus("Music on · "+(mode==="main"?"A New Journey":"Wizard Life"));}
     else{
       for(const key of ["main","battle"]){tracks[key].el.pause();tracks[key].el.volume=0;}
       stopFrame();unlocked=false;onStatus("Music off");
     }
     return enabled;
   }
   function setVolume(next){
     volume=clamp(Number(next)||0,0.05,1);persist();
   }
   function selectFiles(files){
     const incoming=Array.from(files||[]);
     let found=0,stored=[];
     for(const file of incoming){
       if(!(file instanceof Blob)||!file.size)continue;
       const name=(file.name||"").toLowerCase().replace(/[\s_]+/g,"-");
       const key=name.includes("wizard-life")?"battle":name.includes("new-journey")?"main":null;
       if(!key||!/^audio\//.test(file.type)&&!/\.mp3$/i.test(file.name||""))continue;
       setSource(key,URL.createObjectURL(file),true);
       found++;
       stored.push(saveBlob(key,file).catch(()=>false));
     }
     if(found){
       // Call play while handling the user file selection whenever possible.
       if(enabled){unlock();tryPlay(mode);}
       onStatus("Loaded "+found+" music file"+(found===1?"":"s")+". Saving for this browser…");
       Promise.all(stored).then(results=>onStatus(results.every(Boolean)?"Music saved for this device.":"Music loaded for this visit; export your original MP3s for backup."));
     }else onStatus("Choose files named a-new-journey.mp3 and wizard-life.mp3.");
     return found;
   }
   function updateWorld(scene,playing){
     if(!playing||!scene||!enabled||!unlocked||typeof performance==="undefined")return;
     const now=performance.now();
     const near=threat(scene,300);
     const engaged=near||scene.combat?.playerHurtAt>=0&&
       (scene.time?.now||0)-scene.combat.playerHurtAt<1600;
     if(engaged)lastThreat=now;
     // Enter quickly, leave gently. Moving between enemies won't restart music.
     if(engaged){lastProximity=true;setMode("battle");}
     else if(lastProximity&&now-lastThreat>6400){lastProximity=false;setMode("main");}
   }
   function suspend(){
     for(const key of ["main","battle"]){tracks[key].el.pause();tracks[key].el.volume=0;}
     stopFrame();
   }
   function resume(){
     if(enabled&&unlocked){startFrame();tryPlay(mode);}
   }
   function destroy(){
     suspend();
     for(const k of ["main","battle"]){
       tracks[k].el.removeAttribute("src");tracks[k].el.load();
       if(urlByTrack[k])URL.revokeObjectURL(urlByTrack[k]);
     }
   }
   return {initialize,unlock,setEnabled,setVolume,selectFiles,setMode,updateWorld,
     suspend,resume,destroy,get enabled(){return enabled;},get volume(){return volume;},
     get mode(){return mode;},get sources(){return {...sourceReady};}};
 }
 return Object.freeze({KEYS,FILES,PREF,envelope,threat,create});
});
