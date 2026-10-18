/* WANDRUNE 087 | FIRE SILHOUETTE | isolated renderer-only trial
 * Static cached canvas flame atlas, deterministic geometry animation.
 * No spell physics, agent duplication, lifespan/fade or cast modification.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_FLAME=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="087-tongue-silhouette";
 const SIDE=64;
 function clamp(x,a,b){return Math.max(a,Math.min(b,Number.isFinite(x)?x:a));}
 // Shape is not a circle or a rescaled shard. Tip + asymmetric licks + hot root.
 // All variants are painted ONCE, never in the per-frame draw loop.
 function makeFlameTexture(win,P,nativeSource,variant=0){
  const canvas=win?.document?.createElement?.("canvas");
  if(!canvas)return null;
  canvas.width=canvas.height=SIDE;
  const g=canvas.getContext?.("2d");
  if(!g)return null;
  const v=((variant%3)+3)%3;
  const lean=[-0.13,0.02,0.14][v],offset=[-3,0,3][v];
  g.clearRect(0,0,SIDE,SIDE);
  g.save();g.translate(32,35);g.rotate(lean);g.translate(-32,-35);

  // A restrained ambient flame aura, with the visible root below its tip.
  const aura=g.createRadialGradient(33,42,3,33,42,26);
  aura.addColorStop(0,"rgba(255,122,27,0.39)");
  aura.addColorStop(.5,"rgba(245,75,14,0.12)");
  aura.addColorStop(1,"rgba(255,62,10,0)");
  g.fillStyle=aura;g.fillRect(4,14,56,49);

  // Outer tongue: uneven silhouette with three distinct upward licks.
  const skin=g.createLinearGradient(0,7,0,59);
  skin.addColorStop(0,"rgba(235,68,14,0.45)");
  skin.addColorStop(.22,"rgba(255,92,16,0.95)");
  skin.addColorStop(.65,"rgba(255,122,19,1)");
  skin.addColorStop(1,"rgba(229,63,12,0.96)");
  g.fillStyle=skin;
  g.beginPath();
  g.moveTo(31,59);
  g.bezierCurveTo(13,57,11,44,21,34);
  g.bezierCurveTo(25,29,23,20,18+offset,17);
  g.bezierCurveTo(28,18,30,29,33+offset,5);
  g.bezierCurveTo(40,17,44,22,41,33);
  g.bezierCurveTo(47,29,50,23,52,22);
  g.bezierCurveTo(55,40,51,52,42,57);
  g.bezierCurveTo(38,59,34,60,31,59);g.closePath();g.fill();

  // Amber lick inside the orange fire. It twists rather than being a disc.
  const amber=g.createLinearGradient(0,19,0,60);
  amber.addColorStop(0,"rgba(255,170,40,0.10)");
  amber.addColorStop(.36,"rgba(255,177,37,0.78)");
  amber.addColorStop(1,"rgba(255,206,65,0.99)");
  g.fillStyle=amber;g.beginPath();
  g.moveTo(31,57);
  g.bezierCurveTo(21,54,22,45,28,36);
  g.bezierCurveTo(31,31,30,25,35+offset*.45,20);
  g.bezierCurveTo(40,33,37,36,43,41);
  g.bezierCurveTo(45,50,40,57,31,57);g.closePath();g.fill();

  // Off-centre white-yellow base makes it read HOT, not simply yellow.
  g.fillStyle="rgba(255,248,185,0.91)";
  g.beginPath();g.moveTo(32,58);
  g.bezierCurveTo(25,56,27,51,30,47);
  g.bezierCurveTo(33,44,32,40,34,38);
  g.bezierCurveTo(39,45,41,53,35,57);
  g.bezierCurveTo(34,58,33,58,32,58);g.closePath();g.fill();

  // Original ElementVFX 069 ember material remains embedded as the hot coal,
  // not a separate frame-time particle. Failure to draw the source is nonfatal.
  if(nativeSource&&typeof g.drawImage==="function"){
   g.save();g.globalAlpha=.38;
   try{g.drawImage(nativeSource,22,42,20,17);}catch(_){}
   g.restore();
  }
  g.restore();
  return P.Texture.from(canvas);
 }
 // Identical pose for hero Sprite and batched Particle: jittered movement
 // of the existing visual ONLY. Original alpha is *never* multiplied.
 function flamePose(record,displaySize){
  const t=(Number(record?.time)||0)*.001;
  const seed=(Number(record?.seed)||0)*.73+
   (Number(record?.agentIndex)||0)*.23;
  const breathing=Math.sin(t*10.9+seed);
  const second=Math.sin(t*7.1+seed*1.37);
  const drift=Math.sin(t*6.5+seed*.83);
  return {
   width:displaySize*(.82+.07*second),
   height:displaySize*(1.38+.15*breathing),
   rotation:drift*.16+
    Math.sin(Number(record?.angle)||0)*.08
  };
 }
 return Object.freeze({VERSION,SIDE,makeFlameTexture,flamePose});
});
