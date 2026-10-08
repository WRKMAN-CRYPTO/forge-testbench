/* WRKMAN HUE FORGE / 011
 * Material-mask dye renderer. This has no dependency on combat or Spell-Language.
 * Only wizard skin IDs 03, 06, 08, and 16 have material masks.
 * Mask PNG channels: R=robe, G=scarf, B=trim; original alpha preserved.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_HUE_FORGE=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const FINALISTS=Object.freeze([3,6,8,16]);
 const CHANNELS=Object.freeze(["robe","scarf","trim"]);
 const STORAGE_KEY="wrkman-arcane-lab011-hues";
 const HUES=Object.freeze([
  {id:"mooncloth",name:"Mooncloth",hex:"#eee9e0"},
  {id:"snowglass",name:"Snowglass",hex:"#c5e9ea"},
  {id:"pearl",name:"Pearl",hex:"#b5b8cc"},
  {id:"slate",name:"Storm Slate",hex:"#52647b"},
  {id:"obsidian",name:"Obsidian",hex:"#292f46"},
  {id:"midnight",name:"Midnight",hex:"#202852"},
  {id:"royal",name:"Royal Cobalt",hex:"#315bb0"},
  {id:"astral",name:"Astral Blue",hex:"#3c82ce"},
  {id:"ice",name:"Iceglass",hex:"#73c5df"},
  {id:"teal",name:"Deep Current",hex:"#1b7981"},
  {id:"seafoam",name:"Seafoam",hex:"#64b6a7"},
  {id:"jade",name:"Viridian",hex:"#26725c"},
  {id:"moss",name:"Mossheart",hex:"#53704a"},
  {id:"olive",name:"Old Olive",hex:"#929355"},
  {id:"sun",name:"Sunmetal",hex:"#d9a854"},
  {id:"amber",name:"Amberfall",hex:"#c78038"},
  {id:"rust",name:"Iron Rust",hex:"#934b38"},
  {id:"rose",name:"Bloodrose",hex:"#a04962"},
  {id:"coral",name:"Coral Ember",hex:"#d37b69"},
  {id:"wine",name:"Elderwine",hex:"#783f65"},
  {id:"violet",name:"Voidbloom",hex:"#6b429d"},
  {id:"lilac",name:"Dusk Lilac",hex:"#a089c7"},
  {id:"orchid",name:"Orchid",hex:"#9d58a6"},
  {id:"bronze",name:"Ancient Bronze",hex:"#a88450"}
 ]);
 const FUTURE=Object.freeze(["HUE-025","HUE-026","HUE-027","HUE-028","HUE-029","HUE-030","HUE-031","HUE-032"]);
 const byId=Object.freeze(Object.assign(Object.create(null),Object.fromEntries(HUES.map((h,i)=>[h.id,Object.freeze({...h,index:i+1})]))));
 const validSkin=n=>FINALISTS.includes(Number(n));
 const empty=()=>({robe:null,scarf:null,trim:null});
 function normalize(looks){
  const result={};
  for(const n of FINALISTS){
   const p=looks&&looks[n];
   result[n]=empty();
   if(p&&typeof p==="object"&&!Array.isArray(p))
    for(const ch of CHANNELS)if(typeof p[ch]==="string"&&byId[p[ch]])result[n][ch]=p[ch];
  }
  return result;
 }
 function hasDye(p){return CHANNELS.some(ch=>Boolean(p&&byId[p[ch]]));}
 function read(storage){
  try{
   const raw=storage?.getItem(STORAGE_KEY);
   if(!raw)return normalize(null);
   const saved=JSON.parse(raw);
   return normalize(saved);
  }catch(_){return normalize(null);}
 }
 function write(storage,looks){
  const p=normalize(looks);
  try{storage?.setItem(STORAGE_KEY,JSON.stringify(p));return true;}
  catch(_){return false;}
 }
 function color(id){
  if(typeof id!=="string"||!byId[id])return null;
  return byId[id];
 }
 function rgb(hex){
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
 }
 // Input buffers represent a 56×68 cutout from atlas + corresponding
 // mask cutout. Entire function can run in Node with plain typed arrays.
 // Original image and alpha channel are never mutated.
 function recolorPixels(base,mask,palette){
  if(!base||!mask||base.length!==mask.length||base.length%4)
   throw Error("image and mask buffers must have equal RGBA dimensions");
  const result=new Uint8ClampedArray(base);
  const chosen=CHANNELS.map(ch=>color(palette?.[ch])?.hex||null);
  const target=chosen.map(hex=>hex?rgb(hex):null);
  if(!target.some(Boolean))return result;
  for(let i=0;i<base.length;i+=4){
   if(base[i+3]===0)continue;
   let r=base[i],g=base[i+1],b=base[i+2];
   const lum=(r*.2126+g*.7152+b*.0722)/255;
   const shade=Math.min(1.25,Math.max(.33,.44+lum*.80));
   for(let j=0;j<3;j++){
    if(!target[j])continue;
    const weight=(mask[i+j]/255)*.94;
    if(weight<.002)continue;
    const c=target[j];
    r=r*(1-weight)+Math.min(255,c[0]*shade)*weight;
    g=g*(1-weight)+Math.min(255,c[1]*shade)*weight;
    b=b*(1-weight)+Math.min(255,c[2]*shade)*weight;
   }
   result[i]=r;result[i+1]=g;result[i+2]=b;
   result[i+3]=base[i+3]; // no halo artifacts
  }
  return result;
 }
 // Source images must already be loaded by Phaser (or normal Image objects).
 function makeCanvas(skin,palette,atlasImage,maskImage,documentObject){
  if(!validSkin(skin)||!atlasImage||!maskImage||!documentObject)
   throw Error("Hue Forge assets unavailable or unsupported skin");
  const SIZE_X=56,SIZE_Y=68;
  const x=((skin-1)%5)*SIZE_X,y=Math.floor((skin-1)/5)*SIZE_Y;
  const base=documentObject.createElement("canvas");
  const mask=documentObject.createElement("canvas");
  base.width=mask.width=SIZE_X;
  base.height=mask.height=SIZE_Y;
  const bctx=base.getContext("2d",{willReadFrequently:true});
  const mctx=mask.getContext("2d",{willReadFrequently:true});
  if(!bctx||!mctx)throw Error("2D canvas unavailable");
  bctx.drawImage(atlasImage,x,y,SIZE_X,SIZE_Y,0,0,SIZE_X,SIZE_Y);
  mctx.drawImage(maskImage,x,y,SIZE_X,SIZE_Y,0,0,SIZE_X,SIZE_Y);
  const original=bctx.getImageData(0,0,SIZE_X,SIZE_Y);
  const weights=mctx.getImageData(0,0,SIZE_X,SIZE_Y);
  const result=recolorPixels(original.data,weights.data,palette);
  original.data.set(result);
  bctx.putImageData(original,0,0);
  return base;
 }
 function shareCode(skin,palette){
  if(!validSkin(skin))throw Error("skin has no supported dye mask");
  const p=normalize({[skin]:palette})[skin];
  return "WRKMAN-HUE/011|"+String(skin).padStart(2,"0")+
   "|"+CHANNELS.map(ch=>ch+":"+(p[ch]||"original")).join("|");
 }
 return Object.freeze({FINALISTS,CHANNELS,STORAGE_KEY,HUES,FUTURE,validSkin,
  normalize,hasDye,read,write,color,recolorPixels,makeCanvas,shareCode});
});
