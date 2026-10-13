/* WANDRUNE 055 | First-paint title gate. Independent of Phaser/Matter.
 * Hosted art: assets/wandrune-title.jpg. User's original can also be imported
 * once and stored in this browser's IndexedDB without changing gameplay.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_TITLE=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const DB="wrkman-wandrune-title-055",STORE="images",KEY="title";
 function openStore(){
  return new Promise((resolve,reject)=>{
   if(typeof indexedDB==="undefined"){reject(Error("Image storage unavailable"));return;}
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{
    if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);
   };
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error("Image storage error"));
  });
 }
 async function storedImage(file=null){
  const db=await openStore();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,file?"readwrite":"readonly");
   const operation=file?tx.objectStore(STORE).put(file,KEY):tx.objectStore(STORE).get(KEY);
   if(file)tx.oncomplete=()=>resolve(true);
   else operation.onsuccess=()=>resolve(operation.result||null);
   operation.onerror=()=>reject(operation.error||Error("Image read failed"));
   tx.onerror=()=>reject(tx.error||Error("Image transaction failed"));
  });}finally{db.close();}
 }
 function mount(opts={}){
  if(typeof document==="undefined")return null;
  const find=id=>document.getElementById(id);
  const overlay=find("titleOverlay"),art=find("titleArtwork"),pick=find("titleArtPick"),
        file=find("titleArtFile"),start=find("enterTitle");
  if(!overlay||!art||!start||!file||!pick)return null;
  const onEnter=typeof opts.onEnter==="function"?opts.onEnter:()=>{};
  let entered=false,objectUrl=null;
  function loaded(){
   overlay.classList.add("art-ready");
   pick.hidden=true;
  }
  function failed(){
   if(!overlay.classList.contains("art-ready"))pick.hidden=false;
  }
  function setBlob(blob){
   if(!(blob instanceof Blob)||!blob.size)return false;
   const url=URL.createObjectURL(blob);
   if(objectUrl)URL.revokeObjectURL(objectUrl);
   objectUrl=url;art.src=url;loaded();return true;
  }
  art.addEventListener("load",loaded);
  art.addEventListener("error",failed);
  if(art.complete){if(art.naturalWidth)loaded();else failed();}
  storedImage().then(blob=>{
   if(blob instanceof Blob&&blob.size>100)setBlob(blob);
   else if(!art.naturalWidth)failed();
  }).catch(()=>{if(!art.naturalWidth)failed();});
  pick.addEventListener("click",()=>file.click());
  file.addEventListener("change",async()=>{
   const selected=file.files?.[0];file.value="";
   if(!selected||!/^image\/(jpeg|png|webp|avif)$/.test(selected.type)||selected.size>18000000)return;
   setBlob(selected);
   try{await storedImage(selected);}
   catch(_){pick.textContent="IMPORT AGAIN NEXT VISIT";pick.hidden=false;}
  });
  function enter(){
   if(entered)return;
   entered=true;
   // Called directly from the button gesture; iPhone audio unlock must be synchronous.
   try{onEnter();}
   catch(e){entered=false;throw e;}
   overlay.classList.add("exiting");
   const finish=()=>{overlay.hidden=true;};
   overlay.addEventListener("transitionend",finish,{once:true});
   setTimeout(finish,780);
  }
  start.addEventListener("click",enter);
  // Avoid Enter key reaching Phaser while the title is in focus.
  overlay.addEventListener("keydown",e=>{
   if(e.key==="Escape")e.stopPropagation();
  });
  return {enter,isEntered:()=>entered,hasArtwork:()=>overlay.classList.contains("art-ready")};
 }
 return Object.freeze({DB,KEY,storedImage,mount});
});
