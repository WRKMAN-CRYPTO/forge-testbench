/* WRKMAN Forge 050 / precise cell painting UI. No spell-physics coupling. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_FIELD_PRECISION=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const Viewport=typeof globalThis==='object'?globalThis.WRKMAN_FIELD_VIEWPORT:null;
 const N=32,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function install(opts){
  if(!Viewport)throw Error('Field viewport 040 missing');
  const {map,overview,root,values,stamp,line,value,brush,checkpoint,undo,mark,status,
   sources,sourceColor,sourceName,runes,runeColor,runeName,runeSymbol,capture,restore}=opts;
  const view=Viewport.create(),mc=map.getContext('2d'),oc=overview.getContext('2d');
  const $=id=>root.querySelector('#'+id);
  let panMode=false,selected={x:16,y:16},gesture=null,strokeBefore=null,strokeChanged=false;
  const pointers=new Map();
  function current(){
   const v=values()[selected.y*N+selected.x];
   const element=sources?.()[selected.y*N+selected.x]||0;
   const rune=runes?.()[selected.y*N+selected.x]||0;
    const tone=v<0?'MAGENTA / FREE':v===0?'BLACK / SINK':v===255?'WHITE / SOURCE':'GRAY '+v;
    return (rune?'RUNE '+(runeName?.(rune)||rune)+' · ':'')+
    (element?'ELEMENT '+(sourceName?.(element)||element)+' · ':'')+tone;
  }
  function overviewDraw(){
   const w=overview.width/N;oc.clearRect(0,0,overview.width,overview.height);
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const v=values()[y*N+x];oc.fillStyle=v<0?'#ff00ff':'rgb('+v+','+v+','+v+')';
    oc.fillRect(x*w,y*w,w+.15,w+.15);
    const element=sources?.()[y*N+x]||0;
    if(element&&sourceColor){oc.fillStyle=sourceColor(element);oc.fillRect(x*w,y*w,w+.15,w+.15)}
    const rune=runes?.()[y*N+x]||0;
    if(rune){oc.fillStyle=runeColor?.(rune)||'#ffffff';oc.fillRect(x*w+.65,y*w+.65,Math.max(.8,w-1.3),Math.max(.8,w-1.3))}
   }
   const z=view.view,c=N/z.zoom;
   oc.strokeStyle='#64ffd0';oc.lineWidth=1.7;
   oc.strokeRect(z.x*w+.8,z.y*w+.8,c*w-1.6,c*w-1.6);
   oc.strokeStyle='#ffd28a';oc.lineWidth=1.7;
   oc.strokeRect(selected.x*w,selected.y*w,w,w);
  }
  function paintMap(){
   const dim=map.width,z=view.view,side=dim*z.zoom/N;
   mc.fillStyle='#071421';mc.fillRect(0,0,dim,map.height);
   const x0=Math.max(0,Math.floor(z.x)),y0=Math.max(0,Math.floor(z.y));
   const x1=Math.min(31,Math.ceil(z.x+N/z.zoom));
   const y1=Math.min(31,Math.ceil(z.y+N/z.zoom));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const v=values()[y*N+x];
    mc.fillStyle=v<0?'#ff00ff':'rgb('+v+','+v+','+v+')';
    mc.fillRect((x-z.x)*side,(y-z.y)*side,side+.15,side+.15);
     const element=sources?.()[y*N+x]||0;
     if(element&&sourceColor){mc.fillStyle=sourceColor(element);mc.fillRect((x-z.x)*side,(y-z.y)*side,side+.15,side+.15)}
     const rune=runes?.()[y*N+x]||0;
     if(rune){
      const px=(x-z.x)*side,py=(y-z.y)*side;
      mc.lineWidth=side>15?Math.max(2,side*.07):1.3;
      mc.strokeStyle='#07121c';mc.strokeRect(px+1,py+1,Math.max(1,side-2),Math.max(1,side-2));
      mc.fillStyle=runeColor?.(rune)||'#fff';
      if(side>=9){
       mc.font='bold '+Math.max(8,Math.min(22,side*.66))+'px ui-monospace,monospace';
       mc.textAlign='center';mc.textBaseline='middle';
       mc.strokeStyle='#06111a';mc.lineWidth=Math.max(2,side*.13);
       const sym=runeSymbol?.(rune)||'◆';
       mc.strokeText(sym,px+side/2,py+side/2);
       mc.fillText(sym,px+side/2,py+side/2);
      }else mc.fillRect(px+side*.3,py+side*.3,side*.4,side*.4);
     }
   }
   mc.strokeStyle=z.zoom>=4?'#162e3dac':'#1723294b';mc.lineWidth=z.zoom>=4?1:.5;
   mc.beginPath();
   for(let x=x0;x<=x1+1;x++){let p=(x-z.x)*side;mc.moveTo(p,0);mc.lineTo(p,dim)}
   for(let y=y0;y<=y1+1;y++){let p=(y-z.y)*side;mc.moveTo(0,p);mc.lineTo(dim,p)}
   mc.stroke();
   const pt=view.px(selected.x,selected.y,dim);
   if(pt.x+side>0&&pt.x<dim&&pt.y+side>0&&pt.y<dim){
    mc.strokeStyle='#ffd278';mc.lineWidth=2;
    mc.strokeRect(pt.x+1,pt.y+1,Math.max(1,side-2),Math.max(1,side-2));
    if(z.zoom>=4){
     mc.strokeStyle='#fffbe7';mc.lineWidth=1;mc.beginPath();
     const cx=pt.x+side/2,cy=pt.y+side/2;
     mc.moveTo(cx-4,cy);mc.lineTo(cx+4,cy);mc.moveTo(cx,cy-4);mc.lineTo(cx,cy+4);mc.stroke();
    }
   }
   $('sfMapCoords').textContent='CELL '+String(selected.x).padStart(2,'0')+','+
    String(selected.y).padStart(2,'0')+' · '+current();
   $('sfZoomValue').textContent=(Math.round(z.zoom*10)/10)+'× '+(panMode?'MOVE':'PAINT');
   overviewDraw();
  }
  function coord(e){
   const r=map.getBoundingClientRect();
   return {nx:clamp((e.clientX-r.left)/Math.max(1,r.width),0,1),
    ny:clamp((e.clientY-r.top)/Math.max(1,r.height),0,1)};
  }
  function cell(e){const p=coord(e);return view.cell(p.nx,p.ny)}
  function select(x,y){
   selected={x:clamp(x,0,31),y:clamp(y,0,31)};
   view.keepVisible(selected.x,selected.y);paintMap();
  }
  function exactStamp(){
   checkpoint();stamp(selected.x,selected.y,brush()==='line'?255:value());
   mark();paintMap();
   status?.('Painted cell '+selected.x+','+selected.y+' exactly.');
  }
  function undoUnfinished(){
   if(strokeBefore){if(restore)restore(strokeBefore);else values().splice(0,1024,...strokeBefore);
    undo.pop();strokeBefore=null;strokeChanged=false;}
  }
  function point(e){return {x:e.clientX,y:e.clientY}}
  function down(e){
   if(e.button!==undefined&&e.button!==0)return;
   e.preventDefault();pointers.set(e.pointerId,point(e));
   try{map.setPointerCapture(e.pointerId)}catch(_){}
   if(pointers.size===2){
    if(gesture?.kind==='paint')undoUnfinished();
    const p=[...pointers.values()],r=map.getBoundingClientRect();
    const nx=clamp(((p[0].x+p[1].x)/2-r.left)/Math.max(1,r.width),0,1);
    const ny=clamp(((p[0].y+p[1].y)/2-r.top)/Math.max(1,r.height),0,1);
    gesture={kind:'pinch',startZoom:view.view.zoom,
     startDist:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),
     anchor:view.normalized(nx,ny)};
    paintMap();return;
   }
   if(pointers.size!==1)return;
   const c=cell(e);selected=c;
   if(panMode)gesture={kind:'pan'};
   else{
    strokeBefore=capture?capture():values().slice();checkpoint();strokeChanged=false;
    gesture={kind:'paint',first:c,last:c};
    if(brush()!=='line'){stamp(c.x,c.y,value());strokeChanged=true;}
   }
   paintMap();
  }
  function move(e){
   if(!pointers.has(e.pointerId))return;
   e.preventDefault();const prev=pointers.get(e.pointerId);
   pointers.set(e.pointerId,point(e));
   if(gesture?.kind==='pinch'&&pointers.size>=2){
    const p=[...pointers.values()],r=map.getBoundingClientRect();
    const nx=clamp(((p[0].x+p[1].x)/2-r.left)/Math.max(1,r.width),0,1);
    const ny=clamp(((p[0].y+p[1].y)/2-r.top)/Math.max(1,r.height),0,1);
    const dist=Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y));
    const z=clamp(gesture.startZoom*dist/gesture.startDist,1,8);
    view.view.zoom=z;view.view.x=gesture.anchor.x-nx*N/z;
    view.view.y=gesture.anchor.y-ny*N/z;view.fit();paintMap();return;
   }
   if(pointers.size!==1||!gesture)return;
   if(gesture.kind==='pan'){
    const rect=map.getBoundingClientRect();
    view.panPixels(e.clientX-prev.x,e.clientY-prev.y,rect.width,rect.height);
    paintMap();return;
   }
   if(gesture.kind!=='paint')return;
   const c=cell(e);selected=c;
   if(brush()==='line'){
    paintMap();const a=view.px(gesture.first.x+.5,gesture.first.y+.5,map.width);
    const b=view.px(c.x+.5,c.y+.5,map.width);
    mc.lineWidth=3;mc.strokeStyle='#ffdc74';mc.beginPath();
    mc.moveTo(a.x,a.y);mc.lineTo(b.x,b.y);mc.stroke();
   }else{
    if(c.x!==gesture.last.x||c.y!==gesture.last.y){
     line(gesture.last.x,gesture.last.y,c.x,c.y,false);strokeChanged=true;
    }
    gesture.last=c;paintMap();
   }
  }
  function up(e){
   if(!pointers.has(e.pointerId))return;
   e.preventDefault();
   if(gesture?.kind==='paint'&&pointers.size===1){
    if(e.type==='pointercancel')undoUnfinished();
    else{
     if(brush()==='line'){
      const c=cell(e);selected=c;line(gesture.first.x,gesture.first.y,c.x,c.y,true);strokeChanged=true;
     }
     if(strokeChanged)mark();else undoUnfinished();
    }
    strokeBefore=null;
   }
   pointers.delete(e.pointerId);
   try{map.releasePointerCapture(e.pointerId)}catch(_){}
   if(pointers.size===0)gesture=null;
   paintMap();
  }
  map.addEventListener('pointerdown',down);
  map.addEventListener('pointermove',move);
  map.addEventListener('pointerup',up);
  map.addEventListener('pointercancel',up);
  map.addEventListener('wheel',e=>{
   e.preventDefault();const p=coord(e);
   view.zoomStep(e.deltaY<0?1:-1,p.nx,p.ny);paintMap();
  },{passive:false});
  $('sfZoomIn').addEventListener('click',()=>{view.zoomStep(1);paintMap()});
  $('sfZoomOut').addEventListener('click',()=>{view.zoomStep(-1);paintMap()});
  $('sfZoomReset').addEventListener('click',()=>{view.reset();paintMap()});
  $('sfPanMode').addEventListener('click',()=>{
   panMode=!panMode;$('sfPanMode').classList.toggle('active',panMode);
   $('sfPanMode').setAttribute('aria-pressed',String(panMode));
   $('sfPanMode').textContent=panMode?'✥ MOVING':'✥ MOVE';paintMap();
  });
  $('sfStamp').addEventListener('click',exactStamp);
  root.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>{
   const [dx,dy]=btn.dataset.nudge.split(',').map(Number);
   select(selected.x+dx,selected.y+dy);
  }));
  overview.addEventListener('pointerdown',e=>{
   e.preventDefault();const r=overview.getBoundingClientRect();
   const x=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1)*N;
   const y=clamp((e.clientY-r.top)/Math.max(1,r.height),0,1)*N;
   selected={x:clamp(Math.floor(x),0,31),y:clamp(Math.floor(y),0,31)};
   view.centerOn(x,y);paintMap();
  });
  map.addEventListener('keydown',e=>{
   const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];
   if(direction){e.preventDefault();select(selected.x+direction[0],selected.y+direction[1])}
   else if(e.key==='Enter'||e.key===' '){e.preventDefault();exactStamp()}
   else if(e.key==='+'||e.key==='='){e.preventDefault();view.zoomStep(1);paintMap()}
   else if(e.key==='-'){e.preventDefault();view.zoomStep(-1);paintMap()}
  });
  paintMap();
  return Object.freeze({paintMap,snapshot:()=>({zoom:view.view.zoom,x:view.view.x,y:view.view.y,
   selected:{...selected},panMode,pointers:pointers.size}),viewport:view});
 }
 return Object.freeze({install});
});
