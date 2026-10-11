/* WRKMAN Spell Forge 040 / pixel-precise map viewport
 * Pure 32x32 viewport math. Zoom and pan never mutate field data.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_FIELD_VIEWPORT=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const N=32,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(){
  const view={zoom:1,x:0,y:0};
  function fit(){
   const visible=N/view.zoom;
   view.x=clamp(view.x,0,N-visible);view.y=clamp(view.y,0,N-visible);
   return view;
  }
  function normalized(nx,ny){
   return {x:view.x+clamp(nx,0,1)*N/view.zoom,
    y:view.y+clamp(ny,0,1)*N/view.zoom};
  }
  function cell(nx,ny){
   const v=normalized(nx,ny);
   return {x:clamp(Math.floor(v.x),0,N-1),y:clamp(Math.floor(v.y),0,N-1)};
  }
  function setZoom(level,nx=.5,ny=.5){
   const z=clamp(Number(level)||1,1,8);
   const anchor=normalized(nx,ny);
   view.zoom=z;
   view.x=anchor.x-nx*N/z;view.y=anchor.y-ny*N/z;
   return fit();
  }
  function zoomStep(direction,nx=.5,ny=.5){
   const options=[1,2,4,8];
   const level=direction>0?(options.find(z=>z>view.zoom+1e-6)??8):
    (options.filter(z=>z<view.zoom-1e-6).pop()??1);
   return setZoom(level,nx,ny);
  }
  function panPixels(dx,dy,width,height){
   view.x-=dx/Math.max(1,width)*(N/view.zoom);
   view.y-=dy/Math.max(1,height)*(N/view.zoom);
   return fit();
  }
  function centerOn(x,y){
   const visible=N/view.zoom;
   view.x=x-visible*.5;view.y=y-visible*.5;
   return fit();
  }
  function keepVisible(cx,cy){
   const visible=N/view.zoom;
   if(cx<view.x)view.x=cx;
   if(cy<view.y)view.y=cy;
   if(cx+1>view.x+visible)view.x=cx+1-visible;
   if(cy+1>view.y+visible)view.y=cy+1-visible;
   return fit();
  }
  function px(cx,cy,size=320){
   const scale=size*view.zoom/N;
   return {x:(cx-view.x)*scale,y:(cy-view.y)*scale,cell:scale};
  }
  function reset(){view.zoom=1;view.x=0;view.y=0;return view}
  return Object.freeze({view,fit,normalized,cell,setZoom,zoomStep,panPixels,centerOn,keepVisible,px,reset});
 }
 return Object.freeze({N,create});
});
