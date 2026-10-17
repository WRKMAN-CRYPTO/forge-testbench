/* WRKMAN / Physics 038 grid-center symmetry regression.
 * Run: node field-physics-symmetry.tests.js
 * No Phaser, PixiJS, DOM, wall-clock randomness or browser required.
 */
"use strict";
const Motion=require("./field-physics.js");
let count=0;
function expect(ok,message){if(!ok)throw Error("FAIL: "+message);count++;}
const approx=(a,b,eps=1e-7)=>Math.abs(a-b)<=eps;
const N=32, field=Array.from({length:N*N},(_,i)=>{
 const dx=i%N-15.5,dy=Math.floor(i/N)-15.5;
 return Math.max(0,Math.round(255-Math.hypot(dx,dy)*19));
});
expect(Motion.VERSION==="038","new physics version is visible to the Forge");
expect(Motion.N===32&&Motion.MASK===-1,"unchanged grid and mask semantics");
// Equally bright/gray samples mirrored about the 32x32 center must match.
for(let yi=0;yi<11;yi++)for(let xi=0;xi<11;xi++){
 const x=.28+xi*.043,y=.28+yi*.043;
 const a=Motion.sample(field,x,y),b=Motion.sample(field,1-x,1-y);
 expect(a.valid&&b.valid&&approx(a.value,b.value,1e-6),"mirrored interpolation "+xi+","+yi);
 const [gx,gy]=Motion.gradient(field,x,y,a.value);
 const [hx,hy]=Motion.gradient(field,1-x,1-y,b.value);
 expect(approx(gx,-hx,1e-6)&&approx(gy,-hy,1e-6),"mirrored gradient "+xi+","+yi);
}
// A bright central pixel with equally dark N/S/E/W neighbors must not
// generate an artificial diagonal. Physics 037 returned (+.707,+.707).
const cross=Array(N*N).fill(0),c=16,idx=c*N+c;
cross[idx]=255;cross[idx-1]=64;cross[idx+1]=64;
cross[idx-N]=64;cross[idx+N]=64;
const center=(c+.5)/N,point=Motion.sample(cross,center,center);
const direction=Motion.gradient(cross,center,center,point.value);
expect(point.value===255,"painted center retains its authored intensity");
expect(direction[0]===0&&direction[1]===0,"no right/down drift at a symmetric pixel center");
const masked=Array(N*N).fill(-1);masked[idx]=255;
expect(Motion.sample(masked,center,center).value===255,"isolated live pixel samples itself");
expect(!Motion.sample(masked,center-1/N,center).valid,"magenta mask still has no influence");
expect(!Motion.sample(masked,-.001,.5).valid&&!Motion.sample(masked,1,.5).valid,"outside remains free");
// Mirrored velocities, headings, and wave phases must stay mirrored in the
// neutral (no-rune) interpreter for 100 frames.
const samples=[];
for(let i=0;i<50;i++){
 const ang=i*Math.PI*2/50,r=.004+.06*(i%7)/7;
 const x=.5+Math.cos(ang)*r,y=.5+Math.sin(ang)*r;
 const seed=i*.3926990817,vx=Math.cos(seed)*1.4,vy=Math.sin(seed)*1.4;
 samples.push([{x,y,vx,vy,seed,age:0,progress:0},
  {x:1-x,y:1-y,vx:-vx,vy:-vy,seed:seed+Math.PI,age:0,progress:0}]);
}
for(let tick=0;tick<100;tick++)for(const [a,b] of samples){
 Motion.stepAgent(a,field,{swirl:0,momentum:58,mode:"ab"},1/60,360,500,tick/60);
 Motion.stepAgent(b,field,{swirl:0,momentum:58,mode:"ab"},1/60,360,500,tick/60);
 expect(approx(a.x+b.x,1,1e-8)&&approx(a.y+b.y,1,1e-8)&&
  approx(a.vx,-b.vx,1e-8)&&approx(a.vy,-b.vy,1e-8),
 "mirrored trajectories remain paired at "+tick);
}
expect(Motion.startingCells(masked).length===1&&Motion.startingCells(masked)[0]===idx,
 "spawn choices still select unchanged brightest pixels");
console.log("Physics 038 symmetry: "+count+" assertions passed.");
