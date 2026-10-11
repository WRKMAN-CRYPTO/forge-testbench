/* WRKMAN ARCANE LAB 036 / in-game Spell Forge with spell delivery
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
  let undo=[],activePointer=null,dragStart=null,painting=false,particles=[],prevFrame=0,rafId=0,opened=false;
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
#forgeOverlay .sf-preview{width:100%;max-width:300px;aspect-ratio:1/1;display:block;margin:auto;background:#101822;border:1px solid #465967;border-radius:6px}
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
   <div class="sf-header"><div class="sf-title" id="sfHeading">W / SPELL FORGE <small>036 · SHAPE + DELIVERY</small></div><span class="sf-badge" id="sfDirty">READY</span><button id="sfDone" type="button">BACK TO WORLD ✕</button></div>
   <div class="sf-grid">
    <section class="sf-box"><h3>01 / PAINT INSTRUCTIONS</h3><canvas id="sfMap" width="320" height="320" class="sf-canvas" aria-label="32 by 32 instruction field; drag to draw"></canvas>
     <div class="sf-tools" id="sfTools"><button data-brush="white" class="active" title="White, high instruction value">⬜</button><button data-brush="gray" title="Gray, adjustable value">◧</button><button data-brush="black" title="Black, low instruction value">⬛</button><button data-brush="mask" title="Magenta, no instruction">🟪</button><button data-brush="line" title="Drag a white-to-black gradient line">↘</button></div>
     <div class="sf-flex"><label>GRAY <span id="sfGrayVal">128</span><input type="range" id="sfGray" min="1" max="254" value="128"/></label><label>BRUSH SIZE <span id="sfRadiusVal">1</span><input type="range" id="sfRadius" min="1" max="4" value="1"/></label></div>
     <div class="sf-actions"><button id="sfUndo">↶ UNDO</button><button id="sfClear">CLEAR TO MAGENTA</button><button id="sfRing">◯ RING STARTER</button><button id="sfCurtain">☷ CURTAIN STARTER</button></div>
     <div class="sf-caption">White starts · gray guides · black sinks · magenta releases. Gradient tool: drag a line from white toward black.</div>
    </section>
    <section class="sf-box"><h3>02 / SHAPE & LINK</h3><canvas id="sfPreview" width="300" height="300" class="sf-preview" aria-label="Animated preview of the field"></canvas>
     <label>SPELL NAME <input id="sfName" maxlength="48" autocomplete="off" spellcheck="false" placeholder="Name your creation"></label>
     <div class="sf-flex"><label>PALETTE<select id="sfPalette"><option value="flame">🔥 FLAME</option><option value="arcane">✦ ARCANE</option><option value="healing">♥ HEALING</option><option value="void">◈ VOID</option></select></label><label>MATERIAL<select id="sfTexture"><option value="flat">⬡ FLAT HEX</option><option value="leaf">🍃 LEAF</option></select></label></div>
     <label>DELIVERY<select id="sfDelivery"><option value="aura">◯ AURA · FOLLOW ME</option><option value="projectile">➤ PROJECTILE · FLY TOWARD AIM</option><option value="placed">⌖ PLACED FIELD · TAP LOCATION</option></select></label>
     <div class="sf-caption">Delivery moves the entire 32×32 field through the world. Aura follows you (14s), projectile travels and lingers (5.3s), placed field stays at the tap point (9s). Hex contacts can hurt enemies and fracture stones.</div>
     <div class="sf-flex"><label>BEHAVIOR<select id="sfMode"><option value="ab">A+B FIELD + BEHAVIOR</option><option value="a">A FOLLOW FIELD</option></select></label><label>AGENTS<select id="sfPopulation"><option value="200">200</option><option value="600">600</option><option value="1200">1200</option><option value="2400">2400</option><option value="6000">6000</option></select></label></div>
     <div class="sf-flex"><label>SWIRL <span id="sfSwirlVal"></span><input id="sfSwirl" type="range" min="0" max="100"></label><label>MOMENTUM <span id="sfMomentumVal"></span><input id="sfMomentum" type="range" min="0" max="100"></label></div>
     <label>LIGHT <span id="sfLightVal"></span><input id="sfLight" type="range" min="0" max="100"></label>
     <div class="sf-link"><label><input id="sfHeal" type="checkbox"> ♥ LINK MINOR HEAL</label><small>Every 3s · self-anchor</small></div>
     <button class="primary" id="sfEquip">✓ SAVE & EQUIP AS BOUND FIELD</button>
    </section>
    <section class="sf-box sf-library-box"><h3>03 / YOUR SPELLS <span id="sfCount">0</span></h3><div class="sf-library" id="sfLibrary" role="group" aria-label="Saved crafted spells"></div>
     <div class="sf-actions"><button id="sfNew">+ NEW BLANK</button><button id="sfDuplicate">⧉ DUPLICATE</button><button id="sfSave">↧ SAVE</button><button id="sfExport">⇩ EXPORT JSON</button><button id="sfImport">↥ IMPORT JSON</button><button class="danger" id="sfDelete">× DELETE</button></div>
     <input id="sfFile" type="file" accept="application/json,.json" hidden>
     <div class="sf-status" id="sfStatus" role="status" aria-live="polite">Paint your instructions, then save and equip the result.</div>
     <div class="sf-caption">Up to 24 named spells on this device. Only one Bound Field is equipped at a time. Saved spells survive travel and reloads; active auras keep their cast-time snapshot.</div>
    </section>
   </div>
  </div>`;
  document.body.append(overlay);
  const map=$('sfMap'),preview=$('sfPreview'),mc=map.getContext('2d'),pc=preview.getContext('2d');
  function status(msg){$('sfStatus').textContent=msg}
  function mark(){dirty=true;$('sfDirty').textContent='UNSAVED';$('sfDirty').style.color='#ffc7a0';resetParticles()}
  function checkpoint(){undo.push(draft.values.slice());if(undo.length>24)undo.shift()}
  function setCell(x,y,v){if(x>=0&&y>=0&&x<N&&y<N)draft.values[y*N+x]=v}
  function stamp(cx,cy,v){for(let dy=-brushRadius+1;dy<brushRadius;dy++)for(let dx=-brushRadius+1;dx<brushRadius;dx++)if(dx*dx+dy*dy<(brushRadius-.15)**2)setCell(cx+dx,cy+dy,v)}
  function value(){return brush==='white'?255:brush==='black'?0:brush==='mask'?-1:gray}
  function line(x1,y1,x2,y2,gradient){const steps=Math.max(1,Math.max(Math.abs(x2-x1),Math.abs(y2-y1))*2);for(let i=0;i<=steps;i++){const t=i/steps;stamp(Math.round(x1+(x2-x1)*t),Math.round(y1+(y2-y1)*t),gradient?Math.round(255*(1-t)):value())}}
  function paintMap(){const w=map.width/N;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=draft.values[y*N+x];mc.fillStyle=v<0?'#ff00ff':`rgb(${v},${v},${v})`;mc.fillRect(x*w,y*w,w+.1,w+.1)}mc.strokeStyle='#17232933';mc.lineWidth=.5;mc.beginPath();for(let n=1;n<N;n++){mc.moveTo(n*w,0);mc.lineTo(n*w,map.height);mc.moveTo(0,n*w);mc.lineTo(map.width,n*w)}mc.stroke()}
  function pointerCell(e){const r=map.getBoundingClientRect();return {x:clamp(Math.floor((e.clientX-r.left)/r.width*N),0,N-1),y:clamp(Math.floor((e.clientY-r.top)/r.height*N),0,N-1)}}
  function down(e){if(e.button!==undefined&&e.button!==0)return;e.preventDefault();if(activePointer!==null)return;const p=pointerCell(e);activePointer=e.pointerId;dragStart=p;checkpoint();painting=true;try{map.setPointerCapture(e.pointerId)}catch(_){}if(brush!=='line'){stamp(p.x,p.y,value());paintMap();mark()}}
  function move(e){if(activePointer!==e.pointerId||!painting)return;e.preventDefault();const p=pointerCell(e);if(brush==='line'){paintMap();mc.strokeStyle='#ffdc74';mc.lineWidth=3;mc.beginPath();mc.moveTo((dragStart.x+.5)*10,(dragStart.y+.5)*10);mc.lineTo((p.x+.5)*10,(p.y+.5)*10);mc.stroke()}else{line(dragStart.x,dragStart.y,p.x,p.y,false);dragStart=p;paintMap();mark()}}
  function up(e){if(activePointer!==e.pointerId)return;e.preventDefault();if(brush==='line'){const p=pointerCell(e);line(dragStart.x,dragStart.y,p.x,p.y,true);paintMap();mark()}activePointer=null;dragStart=null;painting=false;try{map.releasePointerCapture(e.pointerId)}catch(_){}}
  map.addEventListener('pointerdown',down);map.addEventListener('pointermove',move);map.addEventListener('pointerup',up);map.addEventListener('pointercancel',up);
  function refreshFields(){const s=draft.settings;$('sfName').value=draft.name;$('sfPalette').value=s.palette;$('sfTexture').value=s.texture;$('sfMode').value=s.mode;$('sfDelivery').value=s.delivery||'aura';$('sfPopulation').value=String([200,600,1200,2400,6000].reduce((a,b)=>Math.abs(b-s.population)<Math.abs(a-s.population)?b:a));for(const n of ['Swirl','Momentum','Light']){$('sf'+n).value=s[n.toLowerCase()];$('sf'+n+'Val').textContent=String(s[n.toLowerCase()])}$('sfHeal').checked=heal;paintMap();resetParticles();$('sfDirty').textContent='SAVED';$('sfDirty').style.color='#9be6b7'}
  function refreshLibrary(){const el=$('sfLibrary');el.replaceChildren();$('sfCount').textContent=library.items.length+'/'+MAX_SPELLS;for(const v of library.items){const b=document.createElement('button');b.type='button';b.className=v.id===library.selected?'active':'';const icon=document.createElement('span');icon.style.flex='0 0 auto';icon.textContent='⬡';const title=document.createElement('span');title.textContent=v.recipe.name;const link=document.createElement('small');link.textContent=(v.recipe.settings.delivery==='projectile'?'➤':v.recipe.settings.delivery==='placed'?'⌖':'◯')+(v.heal?' ♥':'');b.append(icon,title,link);b.addEventListener('click',()=>select(v.id));el.append(b)}}
  function storeDraft(){draft=engine.normalize(draft);item.recipe=clone(draft);item.heal=heal;dirty=false;const good=saveLibrary();$('sfDirty').textContent=good?'SAVED':'SESSION';$('sfDirty').style.color=good?'#9be6b7':'#ffd89b';refreshLibrary();return good}
  function select(id){if(dirty)storeDraft();library.selected=id;item=find();draft=clone(item.recipe);heal=item.heal;undo=[];saveLibrary();refreshFields();refreshLibrary();status('Loaded '+item.recipe.name+'. Edit it or equip it.')}
  function add(recipe,label){if(library.items.length>=MAX_SPELLS){status('Library full: delete a spell before adding more.');return false}if(dirty)storeDraft();const entry={id:uid(),recipe:engine.normalize(recipe),heal:heal};library.items.push(entry);library.selected=entry.id;item=entry;draft=clone(entry.recipe);undo=[];dirty=false;saveLibrary();refreshLibrary();refreshFields();status(label||'New spell ready.');return true}
  function resetParticles(){particles=[];prevFrame=0}
  const pals={flame:['#dc4329','#fc9135','#ffe0a3'],arcane:['#5d8ff4','#bd82ef','#f0d4ff'],healing:['#49c7a0','#aee989','#f4f2a2'],void:['#63449e','#b54acb','#ff90d1']};
  function particle(){let starts=[];for(let i=0;i<1024;i++)if(draft.values[i]>=205)starts.push(i);const i=starts.length?starts[Math.floor(Math.random()*starts.length)]:Math.floor(Math.random()*1024);const a=Math.random()*TAU;return {x:(i%N+.1+Math.random()*.8)/N,y:(Math.floor(i/N)+.1+Math.random()*.8)/N,vx:Math.cos(a)*.0017,vy:Math.sin(a)*.0017,phase:Math.random()*TAU}}
  function tick(now){if(!opened)return;const dt=clamp((now-(prevFrame||now))/16.667,.25,2);prevFrame=now;pc.fillStyle='#081724';pc.fillRect(0,0,300,300);pc.strokeStyle='#34535d88';pc.lineWidth=1;pc.beginPath();pc.arc(150,150,123,0,TAU);pc.stroke();const s=draft.settings,cols=pals[s.palette]||pals.flame;while(particles.length<140)particles.push(particle());for(const a of particles){const x=a.x,y=a.y,eps=.018,sample=engine.sample;const center=sample(draft.values,x,y);if(center!==null){const left=sample(draft.values,x-eps,y),right=sample(draft.values,x+eps,y),top=sample(draft.values,x,y-eps),bottom=sample(draft.values,x,y+eps);let gx=(right??center)-(left??center),gy=(bottom??center)-(top??center),l=Math.hypot(gx,gy)||1;const swirl=s.swirl/100,guide=.00017;const cx=-gx/l,cy=-gy/l;a.vx+=(cx-cy*swirl)*guide*dt;a.vy+=(cy+cx*swirl)*guide*dt;}const drag=.91+s.momentum*.00085;a.vx*=Math.pow(drag,dt);a.vy*=Math.pow(drag,dt);a.x+=a.vx*dt;a.y+=a.vy*dt;if(a.x<-.16||a.x>1.16||a.y<-.16||a.y>1.16)Object.assign(a,particle());let t=clamp(1-(center??128)/255,0,1);pc.fillStyle=cols[t<.34?0:t<.7?1:2];pc.globalAlpha=.35+.45*s.light/100;pc.beginPath();const px=a.x*300,py=a.y*300,rad=s.texture==='leaf'?2.4:2;if(s.texture==='leaf'){pc.ellipse(px,py,rad*1.2,rad*.55,Math.atan2(a.vy,a.vx),0,TAU)}else{for(let n=0;n<6;n++){const th=n*TAU/6;const xx=px+Math.cos(th)*rad,yy=py+Math.sin(th)*rad;if(n===0)pc.moveTo(xx,yy);else pc.lineTo(xx,yy)}pc.closePath()}pc.fill()}pc.globalAlpha=1;rafId=requestAnimationFrame(tick)}
  $('sfTools').addEventListener('click',e=>{const b=e.target.closest('button[data-brush]');if(!b)return;brush=b.dataset.brush;for(const n of $('sfTools').querySelectorAll('button'))n.classList.toggle('active',n===b)});
  $('sfGray').addEventListener('input',e=>{gray=Number(e.target.value);$('sfGrayVal').textContent=gray});
  $('sfRadius').addEventListener('input',e=>{brushRadius=Number(e.target.value);$('sfRadiusVal').textContent=brushRadius});
  $('sfName').addEventListener('input',e=>{draft.name=e.target.value.slice(0,48);mark()});
  for(const [id,key] of [['sfPalette','palette'],['sfTexture','texture'],['sfMode','mode'],['sfDelivery','delivery'],['sfPopulation','population'],['sfSwirl','swirl'],['sfMomentum','momentum'],['sfLight','light']]){
   $(id).addEventListener(id.startsWith('sf')&&['swirl','momentum','light'].includes(key)?'input':'change',e=>{draft.settings[key]=['population','swirl','momentum','light'].includes(key)?Number(e.target.value):e.target.value;const label=$('sf'+key[0].toUpperCase()+key.slice(1)+'Val');if(label)label.textContent=e.target.value;mark()});
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