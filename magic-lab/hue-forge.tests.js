/* Run: node magic-lab/hue-forge.tests.js
 * Offline, deterministic tests. No browser or live combat required. */
"use strict";
const Forge=require("./hue-forge.js");
let passed=0;
function test(name,expect){if(!expect)throw Error("FAILED: "+name);passed++;}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
test("finalists are numbered correctly",equal(Forge.FINALISTS,[3,6,8,16]));
test("three real fabric channels",equal(Forge.CHANNELS,["robe","scarf","trim"]));
test("24 starter hues",Forge.HUES.length===24);
test("8 locked future slots",Forge.FUTURE.length===8);
test("originals not dyeable",Forge.validSkin(4)===false);
test("valid Hue",Forge.color("violet")?.hex==="#6b429d");
test("rejects inherited hue names",Forge.color("__proto__")===null&&Forge.color("constructor")===null);
test("separate default palettes",Object.values(Forge.normalize(null)).every(p=>!Forge.hasDye(p)));
const source=Uint8ClampedArray.from([
  210,206,218,255, 32,78,155,255, 187,137,70,255, 255,255,255,0
]);
const masks=Uint8ClampedArray.from([
  255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,0
]);
const frozen=Array.from(source);
const dyes={robe:"violet",scarf:"teal",trim:"sun"};
const out=Forge.recolorPixels(source,masks,dyes);
test("robe color changes white fabric",out[0]!==source[0]);
test("scarf color changes blue fabric",out[4]!==source[4]);
test("trim color changes gold pigment",out[8]!==source[8]);
test("original alpha preserved",out[3]===255&&out[7]===255&&out[11]===255&&out[15]===0);
test("source data not mutated",equal(Array.from(source),frozen));
test("clear palette returns original",equal(Array.from(Forge.recolorPixels(source,masks,{})),frozen));
const blankMasks=Uint8ClampedArray.from([
  0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255
]);
test("nondye material never tinted",equal(Array.from(Forge.recolorPixels(source,blankMasks,dyes)),frozen));
test("deterministic recoloring",equal(Array.from(out),Array.from(Forge.recolorPixels(source,masks,dyes))));
let error=false;try{Forge.recolorPixels(source,Uint8ClampedArray.from([0,1]),dyes)}catch(_){error=true}
test("rejects mismatched dimensions",error);
const attempts=Forge.normalize({3:{robe:"violet"},6:{scarf:"teal"},8:{trim:"bronze"},16:{robe:"__proto__",scarf:"constructor"}});
test("independent looks",attempts[3].robe==="violet"&&attempts[6].robe===null&&attempts[8].trim==="bronze");
test("bad IDs filtered from saved palettes",attempts[16].robe===null&&attempts[16].scarf===null);
const storage={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};
test("writes local palettes",Forge.write(storage,attempts)===true);
test("reads independent local palettes",equal(Forge.read(storage),attempts));
storage.data='not JSON!';
test("malformed storage safely resets",!Forge.hasDye(Forge.read(storage)[8]));
test("share code stable",Forge.shareCode(8,{robe:"violet",scarf:"teal",trim:null})==="WRKMAN-HUE/011|08|robe:violet|scarf:teal|trim:original");
error=false;try{Forge.shareCode(19,{})}catch(_){error=true}
test("no code from unsupported skin",error);
function fakeCanvasDocument(){
 const canvases=[];
 return {
  canvases,
  createElement(kind){
   if(kind!=="canvas")throw Error("unexpected element");
   let mode="atlas",last=null;
   const canvas={
    width:0,height:0,
    getContext(){
     return {
      drawImage(img){mode=img.mask?"mask":"atlas"},
      getImageData(x,y,w,h){
       const b=new Uint8ClampedArray(w*h*4);
       for(let i=0;i<b.length;i+=4){
        if(mode==="atlas"){b[i]=210;b[i+1]=206;b[i+2]=218;b[i+3]=255}
        else{b[i]=255;b[i+3]=255}
       }
       return {data:b};
      },
      putImageData(im){last=im.data.slice()}
     };
    },
    extract(){return last}
   };
   canvases.push(canvas);return canvas;
  }
 };
}
const doc=fakeCanvasDocument();
const canvas=Forge.makeCanvas(8,{robe:"violet"}, {mask:false},{mask:true},doc);
test("masked frame canvas is 56×68",canvas.width===56&&canvas.height===68);
test("only one isolated frame recolored",canvas.extract().length===56*68*4&&canvas.extract()[0]!==210);
test("two canvases used; original atlas not mutated",doc.canvases.length===2);
console.log("Hue Forge offline tests: "+passed+" passed.");
