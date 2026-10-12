/* WRKMAN ARCANE LAB 043 / adjustable lifespan + death fade
 * Field geometry remains the same portable WRKMAN_AGENT_FIELD_V1 recipe.
 * Editor and spell library never require Phaser; the game supplies pause/equip hooks.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_SPELL_FORGE=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const Motion=typeof globalThis==='object'?globalThis.WRKMAN_FIELD_PHYSICS:null;
 if(!Motion)throw Error('Shared field physics 037 missing');
 const Viewport=typeof globalThis==='object'?globalThis.WRKMAN_FIELD_VIEWPORT:null;
 if(!Viewport)throw Error('Precision field viewport 040 missing');
 const Precision=typeof globalThis==='object'?globalThis.WRKMAN_FIELD_PRECISION:null;
 if(!Precision)throw Error('Precision touch editor 040 missing');
 const KEY='wrkman-arcane-lab035-spell-library-v1',N=32,TAU=Math.PI*2,MAX_SPELLS=24;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const $=(id)=>document.getElementById(id);
 function makeBlank(engine){const r=engine.starter();r.name='UNTITLED SPELL';r.values.fill(-1);return engine.normalize(r)}
 function clone(recipe){return JSON.parse(JSON.stringify(recipe))}
 function checkedLibrary(raw,engine,fallback){
  if(!raw||!Array.isArray(raw.items)||!raw.items.length)throw Error('Missing spell library');
  const ids=new Set(),items=[];
  for(const item of raw.items.slice(0,MAX_SPELLS)){
   try{
    if(!item||typeof item.id!=='string'||item.id.length>64||ids.has(item.id))continue;
    const recipe=engine.normalize(item.recipe);ids.add(item.id);
    items.push({id:item.id,recipe,heal:item.heal!==false});
   }catch(_){/* A corrupted entry must not break unrelated spells. */}
  }
  if(!items.length)throw Error('No valid spells');
  return {selected:items.some(v=>v.id===raw.selected)?raw.selected:items[0].id,items};
 }
 function create(options){
  if(typeof document==='undefined')throw Error('Spell Forge requires a page');
  const {engine,storage,onEquip,onClose,getCurrent,getHealLinked}=options;
  if(!engine||typeof engine.normalize!=='function'||typeof onEquip!=='function')throw Error('Missing craft engine');
  let library;try{library=checkedLibrary(JSON.parse(storage.getItem(KEY)||'null'),engine)}catch(_){
   library={selected:'starter',items:[{id:'starter',recipe:engine.normalize(getCurrent()||engine.starter()),heal:getHealLinked()!==false}]};
  }
  const uid=()=> 's'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  const find=()=>library.items.find(i=>i.id===library.selected)||library.items[0];
  const saveLibrary=()=>{try{storage.setItem(KEY,JSON.stringify(library));return true}catch(_){return false}};
  let item=find(),draft=clone(item.recipe),heal=item.heal,dirty=false,brush='white',brushRadius=1,gray=128;
  let undo=[],activePointer=null,dragStart=null,painting=false,particles=[],previewGhosts=[],previewSeeded=false,previewDeath=0,previewStarts=[],previewClock=0,prevFrame=0,rafId=0,opened=false,previewPopulation=600,previewFrames=0;
   const view=Viewport.create();let panMode=false,selectedCell={x:16,y:16},gesture=null,strokeBefore=null,strokeWasDirty=false,strokeChanged=false;
   const pointers=new Map();
  const style=document.createElement('style');style.textContent=`
#forgeOverlay[hidden]{display:none!important}#forgeOverlay{position:fixed;inset:0;z-index:90;background:#030911f2;color:#f6ead2;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;font:13px/1.35 system-ui,-apple-system,sans-serif}
#forgeOverlay *,#forgeOverlay *:before{box-sizing:border-box}#forgeOverlay button,#forgeOverlay select,#forgeOverlay input{font:inherit}#forgeOverlay button{cursor:pointer;touch-action:manipulation}
#forgeOverlay .sf-shell{max-width:1090px;margin:auto;min-height:100%;padding:calc(8px + env(safe-area-inset-top)) max(9px,env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(9px,env(safe-area-inset-left));display:grid;align-content:start;gap:9px}
#forgeOverlay .sf-header{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#11232e;border:1px solid #426777;border-radius:12px;padding:9px 11px;position:sticky;top:0;z-index:2}
#forgeOverlay .sf-title{font-weight:950;letter-spacing:.11em;color:#f7d38f;font-size:14px}#forgeOverlay .sf-title small{display:block;letter-spacing:.04em;color:#9ec5c6;font:10px system-ui}
#forgeOverlay button{color:#e4f6e9;background:#1e3a40;border:1px solid #527b7f;border-radius:9px;padding:8px 10px;min-height:34px;font-weight:780}#forgeOverlay button:active{filter:brightness(1.24)}#forgeOverlay button.active{background:#58733c;border-color:#c8e19a;color:#fff8d9}#forgeOverlay button.primary{background:#80603e;border-color:#f8ce80;color:#fff1c6}#forgeOverlay button.danger{border-color:#915b5b;color:#ffd9d2;background:#40282b}
#forgeOverlay .sf-grid{display:grid;grid-template-columns:minmax(240px,1.05fr) minmax(240px,1fr) minmax(180px,.82fr);align-items:start;gap:9px}
#forgeOverlay .sf-box{background:#101f2ddf;border:1px solid #3f596b;border-radius:12px;padding:10px;display:grid;gap:9px;min-width:0}
#forgeOverlay h3{font:950 11px/1.2 ui-monospace,monospace;letter-spacing:.12em;color:#c4e7d2;margin:0}#forgeOverlay label{display:grid;gap:3px;font:800 10px system-ui;color:#c4d9d8}
#forgeOverlay input,#forgeOverlay select{width:100%;min-width:0;border:1px solid #52707d;border-radius:7px;padding:7px;color:#f4f0e4;background:#162a38;outline-offset:2px}
#forgeOverlay input[type=range]{padding:0;accent-color:#cfdb99}#forgeOverlay input[type=checkbox]{width:auto;accent-color:#bcd89b}
#forgeOverlay .sf-canvas{width:100%;max-width:300px;aspect-ratio:1/1;display:block;margin:auto;background:#ff00ff;border-radius:6px;border:1px solid #697c81;image-rendering:pixelated;touch-action:none;cursor:crosshair}
#forgeOverlay .sf-map-heading{display:flex;justify-content:space-between;gap:6px;align-items:center;font:800 11px/1.3 ui-monospace,monospace;color:#d9f1dc}
#forgeOverlay .sf-map-heading strong{color:#ffe2aa}
#forgeOverlay .sf-zoom{display:grid;grid-template-columns:43px 1fr 43px minmax(86px,1.1fr);gap:5px}
#forgeOverlay .sf-zoom button{min-height:40px;padding:5px 3px;white-space:nowrap}
#forgeOverlay .sf-precise{display:flex;gap:9px;align-items:stretch}
#forgeOverlay .sf-overview{width:88px;height:88px;flex:0 0 88px;touch-action:manipulation;image-rendering:pixelated;background:#ff00ff;border:1px solid #829ca4;border-radius:5px;cursor:crosshair}
#forgeOverlay .sf-nudge{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;flex:1}
#forgeOverlay .sf-nudge button{min-height:40px;padding:3px;font:850 15px system-ui}
#forgeOverlay .sf-nudge .sf-stamp{grid-column:span 2;font:800 10px system-ui;background:#746343;color:#fff0c3;border-color:#e0c18b}
#forgeOverlay .sf-nudge .sf-empty{pointer-events:none;opacity:0}
#forgeOverlay .sf-preview{width:100%;max-width:300px;aspect-ratio:360/500;display:block;margin:auto;background:#101822;border:1px solid #465967;border-radius:6px}
#forgeOverlay .sf-tools{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
#forgeOverlay .sf-tools button{padding:5px 1px;font-size:11px;min-height:32px}
#forgeOverlay .sf-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
#forgeOverlay .sf-flex{display:flex;align-items:center;gap:7px}#forgeOverlay .sf-flex>*{flex:1;min-width:0}
#forgeOverlay .sf-library{max-height:min(350px,57vh);overflow:auto;display:grid;gap:5px;padding-right:3px}
#forgeOverlay .sf-library button{display:flex;gap:7px;text-align:left;align-items:center;padding:6px;min-height:38px;white-space:normal;font-size:11px}
#forgeOverlay .sf-library button span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
#forgeOverlay .sf-status{font:11px/1.35 system-ui;color:#b5d5c6;min-height:30px;border-left:3px solid #90ba9d;padding:5px 8px;background:#132e2c}
#forgeOverlay .sf-caption{font-size:10px;color:#8fb6b5}#forgeOverlay .sf-link{display:flex;align-items:center;gap:7px;background:#172d29;border:1px solid #527963;border-radius:9px;padding:8px}
#forgeOverlay .sf-link label{display:flex;align-items:center;flex:1;gap:6px;font-size:11px}
#forgeOverlay .sf-badge{font:800 10px monospace;color:#f6d590}
@media(max-width:760px){#forgeOverlay .sf-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}#forgeOverlay .sf-library-box{grid-column:1/-1}#forgeOverlay .sf-library{display:flex;max-height:95px;overflow:auto;gap:5px}#forgeOverlay .sf-library button{min-width:133px;max-width:180px;flex:0 0 auto}}
@media(max-width:500px) and (orientation:portrait){#forgeOverlay .sf-grid{grid-template-columns:1fr}#forgeOverlay .sf-library-box{grid-column:auto}#forgeOverlay .sf-library{max-height:140px}#forgeOverlay .sf-canvas,#forgeOverlay .sf-preview{max-width:285px}}
@media(pointer:coarse) and (orientation:landscape) and (max-height:420px){#forgeOverlay .sf-header{padding:4px 8px}#forgeOverlay .sf-shell{gap:5px}#forgeOverlay .sf-box{padding:7px;gap:6px}#forgeOverlay .sf-canvas,#forgeOverlay .sf-preview{max-width:min(37vh,190px)}}
`;
  document.head.append(style);
  const overlay=document.createElement('div');overlay.id='forgeOverlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','sfHeading');
  overlay.innerHTML=`<div class="sf-shell">
   <div class="sf-header"><div class="sf-title" id="sfHeading">W / SPELL FORGE <small>043 · LIFESPAN FORGE</small></div><span class="sf-badge" id="sfDirty">READY</span><button id="sfDone" type="button">BACK TO WORLD ✕</button></div>
   <div class="sf-grid">
    <section class="sf-box"><h3>01 / PAINT INSTRUCTIONS</h3><div class="sf-map-heading"><span id="sfMapCoords">CELL 16,16 · MAGENTA</span><strong id="sfZoomValue">1×</strong></div>
     <canvas id="sfMap" width="320" height="320" tabindex="0" class="sf-canvas" aria-label="32 by 32 instruction field. Zoom in, draw, or use arrows and Stamp Cell for exact placement"></canvas>
     <div class="sf-zoom"><button id="sfZoomOut" type="button" aria-label="Zoom out">−</button><button id="sfZoomReset" type="button">1× RESET</button><button id="sfZoomIn" type="button" aria-label="Zoom in">＋</button><button id="sfPanMode" type="button" aria-pressed="false">✥ MOVE</button></div>
     <div class="sf-precise"><canvas id="sfOverview" width="96" height="96" class="sf-overview" aria-label="Full field overview; tap to center zoomed map"></canvas>
      <div class="sf-nudge"><span class="sf-empty"></span><button data-nudge="0,-1" type="button" aria-label="Select cell above">↑</button><span class="sf-empty"></span><span class="sf-empty"></span><button data-nudge="-1,0" type="button" aria-label="Select cell left">←</button><button class="sf-stamp" id="sfStamp" type="button">⬡ STAMP CELL</button><button data-nudge="1,0" type="button" aria-label="Select cell right">→</button><span class="sf-empty"></span><button data-nudge="0,1" type="button" aria-label="Select cell below">↓</button><span class="sf-empty"></span><span class="sf-empty"></span></div>
     </div>
     <div class="sf-caption">ZOOM with +/− or pinch. Drag to paint, switch to MOVE to pan, or tap the overview to jump. Nudge arrows choose one exact cell; STAMP paints it. Nothing changes in your saved 32×32 field until you paint.</div>
     <div class="sf-tools" id="sfTools"><button data-brush="white" class="active" title="White, high instruction value">⬜</button><button data-brush="gray" title="Gray, adjustable value">◧</button><button data-brush="black" title="Black, low instruction value">⬛</button><button data-brush="mask" title="Magenta, no instruction">🟪</button><button data-brush="line" title="Drag a white-to-black gradient line">↘</button></div>
     <div class="sf-flex"><label>GRAY <span id="sfGrayVal">128</span><input type="range" id="sfGray" min="1" max="254" value="128"/></label><label>BRUSH SIZE <span id="sfRadiusVal">1</span><input type="range" id="sfRadius" min="1" max="4" value="1"/></label></div>
     <div class="sf-actions"><button id="sfUndo">↶ UNDO</button><button id="sfClear">CLEAR TO MAGENTA</button><button id="sfRing">◯ RING STARTER</button><button id="sfCurtain">☷ CURTAIN STARTER</button></div>
     <div class="sf-caption">White starts · gray guides · black sinks · magenta releases. Gradient tool: drag a line from white toward black.</div>
    </section>
    <section class="sf-box"><h3>02 / SHAPE & LINK</h3><canvas id="sfPreview" width="360" height="500" class="sf-preview" aria-label="Animated preview of the field"></canvas><div class="sf-flex"><span class="sf-caption" id="sfPreviewMeta">PHYSICS 037</span><button id="sfReseed" type="button">↻ RESEED PREVIEW</button></div><label>PREVIEW SIMULATION<select id="sfPreviewCount"><option value="140">140 · LIGHT</option><option value="600" selected>600 · STANDARD</option><option value="1200">1,200</option><option value="2400">2,400 · HEAVY</option><option value="6000">6,000 · EXPERIMENTAL</option></select></label>
     <label>SPELL NAME <input id="sfName" maxlength="48" autocomplete="off" spellcheck="false" placeholder="Name your creation"></label>
     <div class="sf-flex"><label>PALETTE<select id="sfPalette"><option value="flame">🔥 FLAME</option><option value="arcane">✦ ARCANE</option><option value="healing">♥ HEALING</option><option value="void">◈ VOID</option></select></label><label>MATERIAL<select id="sfTexture"><option value="flat">⬡ FLAT HEX</option><option value="leaf">🍃 LEAF</option></select></label></div>
     <label>DELIVERY<select id="sfDelivery"><option value="aura">◯ AURA · FOLLOW ME</option><option value="world">↗ WORLD EMISSION · RELEASE AT AIM</option><option value="placed">⌖ PLACED FIELD · TAP LOCATION</option></select></label>
     <div class="sf-caption">WORLD EMISSION has no moving container. The center of your white starting region launches near the caster. The field rotates so DOWN on your map points along your aim. Every agent follows your instructions until impact or its individually chosen lifespan ends. All delivery modes share this rule. The original Agent·Field movement physics remains unchanged.</div>
     <div class="sf-flex"><label>BEHAVIOR<select id="sfMode"><option value="ab">A+B FIELD + BEHAVIOR</option><option value="a">A FOLLOW FIELD</option></select></label><label>SIMULATED AGENTS<select id="sfPopulation"><option value="200">200</option><option value="600">600</option><option value="1200">1200</option><option value="2400">2400</option><option value="6000">6000</option></select></label></div>
     <label>VISIBLE AGENTS / FRAME<select id="sfRenderLimit"><option value="600">600 · FAST</option><option value="1200">1,200 · BALANCED</option><option value="2400">2,400 · HIGH</option><option value="6000">6,000 · ALL (HEAVY)</option></select></label>
     <label>HEX LIFESPAN <strong id="sfLifespanVal">5.5s</strong><input id="sfLifespan" type="range" min="0.5" max="30" step="0.5" value="5.5"></label>
      <div class="sf-caption">Set each hex's active life (0.5–30 seconds). At its limit, it stops moving and interacting, then softly disappears over 0.8 seconds. Fading agents won't occupy casting capacity.</div>
      <div class="sf-caption">Every agent obeys the original field physics. Impacts consume hexes. Survivors fade after their lifespan without dealing more damage. Display density controls drawing only. 6,000 simulated is experimental and may slow phones.</div>
     <div class="sf-flex"><label>SWIRL <span id="sfSwirlVal"></span><input id="sfSwirl" type="range" min="0" max="100"></label><label>MOMENTUM <span id="sfMomentumVal"></span><input id="sfMomentum" type="range" min="0" max="100"></label></div>
     <label>LIGHT <span id="sfLightVal"></span><input id="sfLight" type="range" min="0" max="100"></label>
     <div class="sf-link"><label><input id="sfHeal" type="checkbox"> ♥ LINK MINOR HEAL</label><small>Every 3s · self-anchor</small></div>
     <button class="primary" id="sfEquip">✓ SAVE & EQUIP AS BOUND FIELD</button>
    </section>
    <section class="sf-box sf-library-box"><h3>03 / YOUR SPELLS <span id="sfCount">0</span></h3><div class="sf-library" id="sfLibrary" role="group" aria-label="Saved crafted spells"></div>
     <div class="sf-actions"><button id="sfNew">+ NEW BLANK</button><button id="sfDuplicate">⧉ DUPLICATE</button><button id="sfSave">↧ SAVE</button><button id="sfExport">⇩ EXPORT JSON</button><button id="sfImport">↥ IMPORT JSON</button><button class="danger" id="sfDelete">× DELETE</button></div>
     <input id="sfFile" type="file" accept="application/json,.json" hidden>
     <div class="sf-status" id="sfStatus" role="status" aria-live="polite">Paint your instructions, choose AURA, WORLD EMISSION or PLACED FIELD, then save and equip.</div>
     <div class="sf-caption">Up to 24 named spells on this device. One crafted spell is equipped at a time. Saved spells survive travel and reloads; active casts keep their snapshot. Old projectile recipes automatically become World Emission. Preview population is separate from spell population.</div>
    </section>
   </div>
  </div>`;
  document.body.append(overlay);
  const map=$('sfMap'),overview=$('sfOverview'),preview=$('sfPreview'),mc=map.getContext('2d'),oc=overview.getContext('2d'),pc=preview.getContext('2d');
  function status(msg){$('sfStatus').textContent=msg}
  function mark(){dirty=true;$('sfDirty').textContent='UNSAVED';$('sfDirty').style.color='#ffc7a0';resetParticles()}
  function checkpoint(){undo.push(draft.values.slice());if(undo.length>24)undo.shift()}
  function setCell(x,y,v){if(x>=0&&y>=0&&x<N&&y<N)draft.values[y*N+x]=v}
  function stamp(cx,cy,v){for(let dy=-brushRadius+1;dy<brushRadius;dy++)for(let dx=-brushRadius+1;dx<brushRadius;dx++)if(dx*dx+dy*dy<(brushRadius-.15)**2)setCell(cx+dx,cy+dy,v)}
  function value(){return brush==='white'?255:brush==='black'?0:brush==='mask'?-1:gray}
  function line(x1,y1,x2,y2,gradient){const steps=Math.max(1,Math.max(Math.abs(x2-x1),Math.abs(y2-y1))*2);for(let i=0;i<=steps;i++){const t=i/steps;stamp(Math.round(x1+(x2-x1)*t),Math.round(y1+(y2-y1)*t),gradient?Math.round(255*(1-t)):value())}}
  // Precision editor owns viewport, pinch/pan and hit-testing; recipe
  // mutation stays in this file. The old 1x brush workflow remains intact.
  const editor=Precision.install({
   map,overview,root:overlay,values:()=>draft.values,
   stamp,line,value,brush:()=>brush,checkpoint,undo,mark,status
  });
  function paintMap(){editor.paintMap()}
  function refreshFields(){const s=draft.settings;$('sfName').value=draft.name;$('sfPalette').value=s.palette;$('sfTexture').value=s.texture;$('sfMode').value=s.mode;$('sfDelivery').value=s.delivery||'aura';$('sfLifespan').value=String(s.lifespan??5.5);$('sfLifespanVal').textContent=Number(s.lifespan??5.5).toFixed(1)+'s';$('sfRenderLimit').value=String([600,1200,2400,6000].reduce((a,b)=>Math.abs(b-s.renderLimit)<Math.abs(a-s.renderLimit)?b:a));$('sfPopulation').value=String([200,600,1200,2400,6000].reduce((a,b)=>Math.abs(b-s.population)<Math.abs(a-s.population)?b:a));for(const n of ['Swirl','Momentum','Light']){$('sf'+n).value=s[n.toLowerCase()];$('sf'+n+'Val').textContent=String(s[n.toLowerCase()])}$('sfHeal').checked=heal;paintMap();resetParticles();$('sfDirty').textContent='SAVED';$('sfDirty').style.color='#9be6b7'}
  function refreshLibrary(){const el=$('sfLibrary');el.replaceChildren();$('sfCount').textContent=library.items.length+'/'+MAX_SPELLS;for(const v of library.items){const b=document.createElement('button');b.type='button';b.className=v.id===library.selected?'active':'';const icon=document.createElement('span');icon.style.flex='0 0 auto';icon.textContent='⬡';const title=document.createElement('span');title.textContent=v.recipe.name;const link=document.createElement('small');link.textContent=(v.recipe.settings.delivery==='world'?'↗':v.recipe.settings.delivery==='placed'?'⌖':'◯')+(v.heal?' ♥':'');b.append(icon,title,link);b.addEventListener('click',()=>select(v.id));el.append(b)}}
  function storeDraft(){draft=engine.normalize(draft);item.recipe=clone(draft);item.heal=heal;dirty=false;const good=saveLibrary();$('sfDirty').textContent=good?'SAVED':'SESSION';$('sfDirty').style.color=good?'#9be6b7':'#ffd89b';refreshLibrary();return good}
  function select(id){if(dirty)storeDraft();library.selected=id;item=find();draft=clone(item.recipe);heal=item.heal;undo=[];saveLibrary();refreshFields();refreshLibrary();status('Loaded '+item.recipe.name+'. Edit it or equip it.')}
  function add(recipe,label){if(library.items.length>=MAX_SPELLS){status('Library full: delete a spell before adding more.');return false}if(dirty)storeDraft();const entry={id:uid(),recipe:engine.normalize(recipe),heal:heal};library.items.push(entry);library.selected=entry.id;item=entry;draft=clone(entry.recipe);undo=[];dirty=false;saveLibrary();refreshLibrary();refreshFields();status(label||'New spell ready.');return true}
  // Preview and world use the identical 32x32 interpreter. Lower preview
  // population changes density, never steering, momentum or lifetimes.
  function resetParticles(){
   particles=[];previewGhosts=[];previewSeeded=false;previewDeath=0;previewStarts=Motion.startingCells(draft.values);
   previewClock=0;previewFrames=0;prevFrame=0;
   $('sfPreviewMeta').textContent='PHYSICS '+Motion.VERSION+' · '+previewPopulation+' AGENTS';
  }
  const pals={flame:['#dc4329','#fc9135','#ffe0a3'],arcane:['#5d8ff4','#bd82ef','#f0d4ff'],healing:['#49c7a0','#aee989','#f4f2a2'],void:['#63449e','#b54acb','#ff90d1']};
  function tick(now){
   if(!opened)return;
   const dt=prevFrame?clamp((now-prevFrame)/1000,0,.05):1/60;
   prevFrame=now;previewClock+=dt;
   const cfg=draft.settings,colors=pals[cfg.palette]||pals.flame;
   const total=previewPopulation;
   if(!previewSeeded){
    for(let i=0;i<total;i++)particles.push(Motion.spawn(draft.values,previewStarts));
    previewSeeded=true;
   }
   // Same birth/death timing as a cast, but visual only.
   const life=Number(cfg.lifespan??5.5);
   let stats={offscreen:0};
   if(particles.length&&previewClock<life){
    stats=Motion.stepSwarm(particles,draft.values,cfg,dt,360,500,previewClock);
    if(++previewFrames%3===0)for(const a of particles){
     a.tail.push([a.x,a.y]);if(a.tail.length>5)a.tail.shift();
    }
   }else if(particles.length){
    previewDeath=previewClock;
    const stride=Math.max(1,Math.ceil(particles.length/1400));
    previewGhosts=particles.filter((_,i)=>i%stride===0);
    particles=[];
   }
   if(previewGhosts.length&&previewClock-previewDeath>=.8)previewGhosts=[];
      const w=preview.width,h=preview.height;
   pc.fillStyle='#081724';pc.fillRect(0,0,w,h);
   pc.strokeStyle='#34535d88';pc.lineWidth=1;pc.beginPath();pc.ellipse(w*.5,h*.5,w*.42,h*.42,0,0,TAU);pc.stroke();
   const visible=particles.length?particles:previewGhosts;
   const step=Math.max(1,Math.ceil(visible.length/1400));
   const fading=particles.length?1:previewGhosts.length?Math.pow(clamp(1-(previewClock-previewDeath)/.8,0,1),1.35):0;
   for(let ix=0;ix<visible.length;ix+=step){
    const a=visible[ix];
        // Don't recycle travelers; pixels that escape remain alive offscreen.
    if(a.x<-.08||a.x>1.08||a.y<-.08||a.y>1.08)continue;
    const t=clamp(a.progress||0,0,1),shade=cfg.mode==='ab'?t:.44;
    pc.fillStyle=colors[shade<.34?0:shade<.7?1:2];
    pc.globalAlpha=(.35+.45*cfg.light/100)*fading;
    const px=a.x*w,py=a.y*h,rad=cfg.texture==='leaf'?2.4:2;
    if(a.tail.length){pc.strokeStyle=colors[shade<.34?0:shade<.7?1:2];pc.lineWidth=.65;pc.globalAlpha=.085*fading;
     pc.beginPath();pc.moveTo(a.tail[0][0]*w,a.tail[0][1]*h);
     for(const pt of a.tail)pc.lineTo(pt[0]*w,pt[1]*h);
     pc.lineTo(px,py);pc.stroke();pc.globalAlpha=(.35+.45*cfg.light/100)*fading;
    }
    pc.beginPath();
    if(cfg.texture==='leaf'){
     pc.ellipse(px,py,rad*1.2,rad*.55,Math.atan2(a.vy,a.vx),0,TAU);
    }else{
     for(let i=0;i<6;i++){
      const th=i*TAU/6,xx=px+Math.cos(th)*rad,yy=py+Math.sin(th)*rad;
      if(i===0)pc.moveTo(xx,yy);else pc.lineTo(xx,yy);
     }
     pc.closePath();
    }
    pc.fill();
   }
   pc.globalAlpha=1;
   $('sfPreviewMeta').textContent='PHYSICS '+Motion.VERSION+' · '+particles.length+' LIVE / '+previewGhosts.length+' FADING · '+(particles.length?stats.offscreen+' OUT':'RESEED TO REPLAY');
   rafId=requestAnimationFrame(tick);
  }
  $('sfReseed').addEventListener('click',()=>{resetParticles();status('Fresh agents seeded. Preview runs for your chosen lifespan, then fades and stops.')});
  $('sfPreviewCount').addEventListener('change',e=>{previewPopulation=Number(e.target.value)||600;resetParticles();status('Preview: '+previewPopulation+' independently simulated agents. No recycling.')});
   $('sfLifespan').addEventListener('change',()=>{resetParticles();status('Preview replaying with '+Number(draft.settings.lifespan).toFixed(1)+'s of active life, then an 0.8s fade.')});
  $('sfTools').addEventListener('click',e=>{const b=e.target.closest('button[data-brush]');if(!b)return;brush=b.dataset.brush;for(const n of $('sfTools').querySelectorAll('button'))n.classList.toggle('active',n===b)});
  $('sfGray').addEventListener('input',e=>{gray=Number(e.target.value);$('sfGrayVal').textContent=gray});
  $('sfRadius').addEventListener('input',e=>{brushRadius=Number(e.target.value);$('sfRadiusVal').textContent=brushRadius});
  $('sfName').addEventListener('input',e=>{draft.name=e.target.value.slice(0,48);mark()});
  for(const [id,key] of [['sfPalette','palette'],['sfTexture','texture'],['sfMode','mode'],['sfDelivery','delivery'],['sfRenderLimit','renderLimit'],['sfPopulation','population'],['sfLifespan','lifespan'],['sfSwirl','swirl'],['sfMomentum','momentum'],['sfLight','light']]){
   $(id).addEventListener(id.startsWith('sf')&&['swirl','momentum','light','lifespan'].includes(key)?'input':'change',e=>{draft.settings[key]=['population','renderLimit','lifespan','swirl','momentum','light'].includes(key)?Number(e.target.value):e.target.value;const label=$('sf'+key[0].toUpperCase()+key.slice(1)+'Val');if(label)label.textContent=key==='lifespan'?Number(e.target.value).toFixed(1)+'s':e.target.value;mark()});
  }
  $('sfHeal').addEventListener('change',e=>{heal=!!e.target.checked;mark()});
  $('sfUndo').addEventListener('click',()=>{if(!undo.length){status('Nothing to undo.');return}draft.values=undo.pop();mark();paintMap()});
  $('sfClear').addEventListener('click',()=>{checkpoint();draft.values.fill(-1);paintMap();mark();status('The field is now free magenta space. Paint a new instruction.')});
  $('sfRing').addEventListener('click',()=>{checkpoint();draft.values=engine.starter().values.slice();paintMap();mark();status('Ring template applied. You can repaint any cell.')});
  $('sfCurtain').addEventListener('click',()=>{checkpoint();draft.values.fill(-1);for(let x=0;x<N;x+=3){draft.values[x]=255;draft.values[N+x]=128;draft.values[2*N+x]=0}paintMap();mark();status('Curtain template applied. Experiment with the teeth.')});
  $('sfSave').addEventListener('click',()=>{storeDraft();status('Saved '+item.recipe.name+' to this device.')});
  $('sfEquip').addEventListener('click',()=>{storeDraft();onEquip(clone(item.recipe),heal);status(item.recipe.name+' equipped. Close Forge, select ⬡ BOUND FIELD on your wheel, then cast.')});
  $('sfNew').addEventListener('click',()=>add(makeBlank(engine),'Blank field created. Paint, name, then save & equip.'));
  $('sfDuplicate').addEventListener('click',()=>{const copy=clone(draft);copy.name=(copy.name+' COPY').slice(0,48);add(copy,'Duplicated spell. Edit this copy without overwriting the original.')});
  $('sfDelete').addEventListener('click',()=>{if(library.items.length<=1){status('Keep at least one spell. Use NEW BLANK to start fresh.');return}const deleted=find().recipe.name;library.items=library.items.filter(v=>v.id!==library.selected);library.selected=library.items[0].id;item=find();draft=clone(item.recipe);heal=item.heal;undo=[];dirty=false;saveLibrary();refreshFields();refreshLibrary();status('Deleted '+deleted+'. Your equipped aura is unchanged.')});
  $('sfExport').addEventListener('click',()=>{try{const cfg=engine.normalize(draft),blob=new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(cfg.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'wrkman-spell')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);status('Portable 32×32 field exported.')}catch(e){status('Export failed: '+e.message)}});
  $('sfImport').addEventListener('click',()=>$('sfFile').click());
  $('sfFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const raw=JSON.parse(await file.text());add(engine.normalize(raw),'Imported '+file.name+'. Save & equip to use it in combat.')}catch(err){status('Import failed: '+String(err.message||err))}finally{e.target.value=''}});
  $('sfDone').addEventListener('click',()=>{close();onClose?.()});
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();onClose?.()}});
  function open(){if(opened)return;opened=true;overlay.hidden=false;item=find();draft=clone(item.recipe);heal=item.heal;dirty=false;undo=[];refreshFields();refreshLibrary();status('Forge open. Cast-time spells use saved snapshots, not live edits.');rafId=requestAnimationFrame(tick);$('sfDone').focus({preventScroll:true})}
  function close(){if(!opened)return;if(dirty){storeDraft();status('Changes auto-saved before leaving Forge.')}opened=false;overlay.hidden=true;cancelAnimationFrame(rafId);rafId=0;prevFrame=0}
  function adopt(recipe,linked){const cfg=engine.normalize(recipe);const same=find();if(same.recipe.name===cfg.name){same.recipe=clone(cfg);same.heal=linked!==false;saveLibrary();return true}if(library.items.length>=MAX_SPELLS)return false;library.items.push({id:uid(),recipe:clone(cfg),heal:linked!==false});library.selected=library.items[library.items.length-1].id;item=find();saveLibrary();return true}
  saveLibrary();refreshLibrary();refreshFields();
  return Object.freeze({open,close,adopt,KEY,list:()=>library.items.map(v=>({id:v.id,name:v.recipe.name})),snapshot:()=>({opened,selected:library.selected,count:library.items.length,dirty,heal})});
 }
 return Object.freeze({KEY,MAX_SPELLS,checkedLibrary,makeBlank,create});
});