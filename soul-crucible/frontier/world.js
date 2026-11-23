// WRKMAN Frontier World Engine. Generated geography adapted from the Pixel World prototype.
// 1,000 x 1,000 ground/water cells; 125 x 125 atmospheric cells. No animal logic here.
(function(root){
'use strict';
const W=1000,H=1000,N=W*H,C=125,CN=C*C,SEA=109,STEP=10,NAV=100,TAU=Math.PI*2;
function rng(n){let s=n>>>0;return function(){s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function layer(scale,r){let nx=Math.ceil(W/scale)+2,ny=Math.ceil(H/scale)+2,a=new Float32Array(nx*ny);for(let i=0;i<a.length;i++)a[i]=r();return {scale,nx,a};}
function n2(q,x,y){let a=x/q.scale,b=y/q.scale,i=a|0,j=b|0,u=a-i,v=b-j;u=u*u*(3-2*u);v=v*v*(3-2*v);let k=j*q.nx+i,p=q.a;return (p[k]*(1-u)+p[k+1]*u)*(1-v)+(p[k+q.nx]*(1-u)+p[k+q.nx+1]*u)*v;}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function canvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function create(seed){
 let random=rng((seed^0x3279af91)>>>0),layers=[layer(440,random),layer(195,random),layer(89,random),layer(39,random),layer(16,random),layer(160,random)];
 let ground=canvas(W,H),atmosphere=canvas(C,C),g=ground.getContext('2d',{alpha:false}),cg=atmosphere.getContext('2d');
 let img=g.createImageData(W,H),cloudImage=cg.createImageData(C,C);
 let f={seed,ready:false,progress:0,ground,atmosphere,elev:new Uint8Array(N),temp:new Int8Array(N),top:new Int16Array(N),
  clouds:new Float32Array(CN),cloudNext:new Float32Array(CN),tick:0,drawPending:true,changed:0,
  stats:{evap:0,rain:0,flow:0,freeze:0},nav:null,landCount:0,iceCount:0,waterCount:0};
 const idx=(x,y)=>clamp(Math.round(y),0,999)*W+clamp(Math.round(x),0,999);
 const navIdx=(x,y)=>clamp(Math.floor(y/STEP),0,99)*NAV+clamp(Math.floor(x/STEP),0,99);
 function at(x,y){let i=idx(x,y),v=f.top[i];return {elev:f.elev[i],temp:f.temp[i],water:Math.max(0,v),ice:Math.max(0,-v)};}
 function walk(x,y){
  if(x<8||x>=W-8||y<8||y>=H-8)return false;
  let i=idx(x,y);return f.top[i]<=3&&f.elev[i]<198;
 }
 function buildNav(){
  let walkable=new Uint8Array(10000),nearest=new Int16Array(10000),distance=new Uint16Array(10000);
  nearest.fill(-1);distance.fill(65535);
  for(let y=0;y<NAV;y++)for(let x=0;x<NAV;x++)walkable[y*NAV+x]=walk(x*STEP+5,y*STEP+5)?1:0;
  let queue=new Int16Array(10000),head=0,tail=0;
  for(let y=1;y<99;y++)for(let x=1;x<99;x++){
   let i=y*100+x;if(!walkable[i])continue;
   const neighbors=[i-1,i+1,i-100,i+100];
   if(neighbors.some(j=>!walkable[j]&&f.top[idx(j%100*10+5,Math.floor(j/100)*10+5)]>1)){
    distance[i]=0;nearest[i]=i;queue[tail++]=i;
   }
  }
  while(head<tail){
   let i=queue[head++],x=i%100,y=Math.floor(i/100),list=[x>0?i-1:-1,x<99?i+1:-1,y>0?i-100:-1,y<99?i+100:-1];
   for(let j of list){if(j<0||!walkable[j]||distance[j]!==65535)continue;
    distance[j]=distance[i]+1;nearest[j]=nearest[i];queue[tail++]=j;
   }
  }
  // Components distinguish reachable prey from animals on separate islands.
  let component=new Int16Array(10000);component.fill(-1);
  let count=0,queued=new Int16Array(10000);
  for(let i=0;i<10000;i++){
   if(!walkable[i]||component[i]!==-1)continue;
   let head=0,tail=0;queued[tail++]=i;component[i]=count;
   while(head<tail){
    let node=queued[head++],x=node%100,y=(node/100)|0;
    for(let n of [x>0?node-1:-1,x<99?node+1:-1,y>0?node-100:-1,y<99?node+100:-1]){
     if(n<0||!walkable[n]||component[n]!==-1)continue;component[n]=count;queued[tail++]=n;
    }
   }
   count++;
  }
  f.nav={walkable,nearest,distance,component,revision:(f.nav?.revision||0)+1};
 }

 function nodeAt(x,y){
  let cx=clamp(Math.floor(x/STEP),0,99),cy=clamp(Math.floor(y/STEP),0,99),i=cy*100+cx;
  if(!f.nav)return -1;
  if(f.nav.walkable[i])return i;
  for(let rad=1;rad<=3;rad++)for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){
   if(Math.max(Math.abs(xx),Math.abs(yy))!==rad)continue;
   let ax=cx+xx,ay=cy+yy;if(ax<0||ay<0||ax>99||ay>99)continue;
   let j=ay*100+ax;if(f.nav.walkable[j])return j;
  }
  return -1;
 }
 function sameLand(x,y,tx,ty){
  let a=nodeAt(x,y),b=nodeAt(tx,ty);
  return a>=0&&b>=0&&f.nav.component[a]===f.nav.component[b];
 }
 function clearLand(x,y,tx,ty){
  if(!walk(x,y)||!walk(tx,ty))return false;
  let d=Math.hypot(tx-x,ty-y),steps=Math.ceil(d/5),height=at(x,y).elev;
  for(let i=1;i<=steps;i++){
   let px=x+(tx-x)*i/steps,py=y+(ty-y)*i/steps;
   if(!walk(px,py))return false;
   let h=at(px,py).elev;if(Math.abs(height-h)>14)return false;height=h;
  }
  return true;
 }
 function landRoute(x,y,tx,ty){
  if(!f.nav)return null;
  let start=nodeAt(x,y),goal=nodeAt(tx,ty);
  if(start<0||goal<0||f.nav.component[start]!==f.nav.component[goal])return null;
  if(clearLand(x,y,tx,ty))return [];
  const nav=f.nav,g=new Float32Array(10000),parent=new Int16Array(10000),
   closed=new Uint8Array(10000),heap=[],delta=[-101,-100,-99,-1,1,99,100,101];
  g.fill(Infinity);parent.fill(-1);
  const heuristic=i=>10*Math.hypot(i%100-goal%100,Math.floor(i/100)-Math.floor(goal/100));
  function push(node,score){
   let at=heap.length;heap.push({node,score});
   while(at>0){let parentIndex=(at-1)>>1;if(heap[parentIndex].score<=score)break;heap[at]=heap[parentIndex];at=parentIndex;}
   heap[at]={node,score};
  }
  function pop(){
   let root=heap[0],last=heap.pop();if(heap.length){
    let at=0,length=heap.length;
    while(true){let child=at*2+1;if(child>=length)break;
     if(child+1<length&&heap[child+1].score<heap[child].score)child++;
     if(heap[child].score>=last.score)break;
     heap[at]=heap[child];at=child;
    }heap[at]=last;
   }return root;
  }
  g[start]=0;push(start,heuristic(start));
  let loops=0;
  while(heap.length&&loops++<10000){
   let cur=pop().node;if(closed[cur])continue;
   if(cur===goal){
    let trail=[],pos=goal;
    while(pos!==start&&trail.length<10000){
     trail.push({x:pos%100*10+5,y:Math.floor(pos/100)*10+5});
     pos=parent[pos];if(pos<0)return null;
    }
    trail.reverse();
    // Let steering replace grid stair-steps when there is a verified clear shortcut.
    let result=[],from={x,y},idx=0;
    while(idx<trail.length){
     let end=Math.min(trail.length-1,idx+9),pick=idx;
     for(let k=end;k>=idx;k--)if(clearLand(from.x,from.y,trail[k].x,trail[k].y)){pick=k;break;}
     result.push(trail[pick]);from=trail[pick];idx=pick+1;
    }
    if(clearLand(from.x,from.y,tx,ty))result.push({x:tx,y:ty});
    return result;
   }
   closed[cur]=1;
   let cx=cur%100,cy=(cur/100)|0;
   for(let change of delta){
    let next=cur+change,nx=next%100,ny=(next/100)|0;
    if(next<0||next>=10000||Math.abs(nx-cx)>1||Math.abs(ny-cy)>1||!nav.walkable[next]||closed[next])continue;
    // Forbid corners that would cross a water/rock cell diagonally.
    let diagonal=Math.abs(nx-cx)===1&&Math.abs(ny-cy)===1;
    if(diagonal&&(!nav.walkable[cy*100+nx]||!nav.walkable[ny*100+cx]))continue;
    let penalty=Math.abs(f.elev[idx(nx*10+5,ny*10+5)]-f.elev[idx(cx*10+5,cy*10+5)])*.3;
    let candidate=g[cur]+(diagonal?14.142:10)+penalty;
    if(candidate>=g[next])continue;
    g[next]=candidate;parent[next]=cur;
    push(next,candidate+heuristic(next));
   }
  }
  return null;
 }

 function shore(x,y){
  let i=f.nav?f.nav.nearest[navIdx(x,y)]:-1;
  return i===undefined||i<0?null:{x:i%100*10+5,y:Math.floor(i/100)*10+5};
 }
 function waterDistance(x,y){
  let i=f.nav?f.nav.distance[navIdx(x,y)]:65535;return i===undefined||i===65535?1e5:i*STEP;
 }
 function liquidNear(x,y){
  for(let dy=-24;dy<=24;dy+=8)for(let dx=-24;dx<=24;dx+=8){
   if(dx*dx+dy*dy>576)continue;
   let xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;
   if(f.top[idx(xx,yy)]>1)return true;
  }
  return false;
 }
 function safe(x,y){
  x=clamp(x,15,985);y=clamp(y,15,985);
  if(walk(x,y))return {x,y};
  for(let r=10;r<=220;r+=10)for(let k=0;k<16;k++){
   let a=k*TAU/16,xx=clamp(x+Math.cos(a)*r,15,985),yy=clamp(y+Math.sin(a)*r,15,985);
   if(walk(xx,yy))return {x:xx,y:yy};
  }
  return null;
 }
 function biome(x,y){let t=at(x,y),d=waterDistance(x,y);
  return t.ice>0||t.temp<-12?'frozen':t.water>4?'water':t.elev>180?'rock':t.temp>29&&d>90?'arid':t.temp>4&&t.temp<28&&d<120?'fertile':'scrub';
 }
 function growth(x,y){
  let t=at(x,y);if(!walk(x,y)||t.temp<-8||t.elev>180)return 0;
  return clamp((t.temp+10)/25,.04,1)*clamp(1.25-waterDistance(x,y)/220,.08,1)*(t.temp>34?.38:1);
 }
 function palette(mode){
  let p=img.data;
  for(let i=0,k=0;i<N;i++,k+=4){
   let e=f.elev[i],T=f.temp[i],v=f.top[i],r,b,h;
   if(mode==='Elevation'){r=35+e*.73;h=40+e*.79;b=50+e*.79;}
   else if(mode==='Temperature'){let u=clamp((T+38)/80,0,1);r=35+u*212;h=105+Math.sin(u*Math.PI)*108-u*28;b=235-u*198;}
   else if(mode==='Water'){
    if(v>0){r=22;h=84+Math.min(80,v);b=140+Math.min(80,v);}
    else if(v<0){r=194;h=226;b=243;}
    else{r=27+e*.24;h=29+e*.35;b=38+e*.21;}
   }else{
    if(e<SEA-30){r=27;h=53;b=66;}
    else if(e<SEA){r=41;h=88;b=93;}
    else if(e<SEA+5){r=171;h=149;b=102;}
    else if(e<137){r=51;h=111;b=68;}
    else if(e<157){r=52;h=99;b=70;}
    else if(e<182){r=101;h=104;b=82;}
    else{r=132;h=137;b=134;}
    if(T<0&&e>=SEA){r=r*.55+185*.45;h=h*.55+204*.45;b=b*.55+215*.45;}
    if(v>0){let q=Math.min(1,.55+v*.012);r=r*(1-q)+23*q;h=h*(1-q)+118*q;b=b*(1-q)+190*q;}
    else if(v<0){let q=Math.min(1,.75-v*.01);r=r*(1-q)+211*q;h=h*(1-q)+233*q;b=b*(1-q)+243*q;}
   }
   let light=.69+e/255*.54;p[k]=Math.min(255,r*light)|0;p[k+1]=Math.min(255,h*light)|0;p[k+2]=Math.min(255,b*light)|0;p[k+3]=255;
  }
  g.putImageData(img,0,0);f.drawPending=false;
 }
 function paintClouds(){
  let p=cloudImage.data,k=0;
  for(let i=0;i<CN;i++){p[k++]=224;p[k++]=238;p[k++]=246;p[k++]=clamp((f.clouds[i]-6)*15,0,150);}
  cg.putImageData(cloudImage,0,0);
 }
 function cold(i){return f.temp[i]<=0||f.elev[i]>=172;}
 function weather(){
  for(let n=0;n<3000;n++){
   let i=(random()*N)|0,a=f.top[i];if(!a)continue;
   let e=f.elev[i],T=f.temp[i],x=i%W,y=Math.floor(i/W);
   if(a>0){
    if(cold(i)){if(random()<.24){f.top[i]=-a;f.stats.freeze++;}continue;}
    if(T>4&&a>1&&random()<.003+Math.max(0,T)*.00027){f.top[i]--;f.clouds[Math.floor(y/8)*C+Math.floor(x/8)]++;f.stats.evap++;a--;if(!a)continue;}
    let best=-1,head=e+a,lowest=head,list=[x>0?i-1:i+W-1,x<999?i+1:i-W+1,y>0?i-W:-1,y<999?i+W:-1];
    for(let j of list){if(j<0||f.top[j]<0)continue;let other=f.elev[j]+f.top[j];if(other<lowest){lowest=other;best=j;}}
    if(best>=0&&head-lowest>1){let move=Math.min(a,8,Math.max(1,Math.floor((head-lowest)*.37)));if(f.top[best]+move<=300){f.top[i]-=move;f.top[best]+=move;f.stats.flow++;}}
   }else{
    let ice=-a;
    if(ice>9&&random()<.15){let chosen=-1,low=e+ice,list=[x>0?i-1:i+W-1,x<999?i+1:i-W+1,y>0?i-W:-1,y<999?i+W:-1];
     for(let j of list){if(j<0)continue;let surface=f.elev[j]+Math.abs(f.top[j]);if(surface<low){low=surface;chosen=j;}}
     if(chosen>=0&&e+ice-low>5){let shift=Math.min(4,Math.max(1,Math.floor((e+ice-low)*.18)),ice);
      f.top[i]+=shift;if(f.top[chosen]<=0)f.top[chosen]-=shift;else f.top[chosen]+=shift;continue;}
    }
    if(T>1&&e<172&&random()<Math.min(.48,.025+T*.012))f.top[i]=ice;
   }
  }
  if(++f.tick%2===0){
   for(let y=0;y<C;y++)for(let x=0;x<C;x++){
    let k=y*C+x,u=y*C+(x+C-1)%C,d=y*C+(x+1)%C;
    let mix=.096,v=f.clouds[k]*(1-mix)+f.clouds[u]*mix;
    v=v*.992+f.clouds[d]*.006+f.clouds[k]*.002;
    let i=(y*8+4)*W+x*8+4,threshold=16+(f.temp[i]>22?2:0)-(f.elev[i]>150?3:0);
    if(v>threshold){
     let drops=Math.min(3,Math.floor((v-threshold)*.29)+1);
     for(let q=0;q<drops;q++){
      let xx=x*8+Math.floor(random()*8),yy=y*8+Math.floor(random()*8),j=yy*W+xx;
      if(f.top[j]<0)f.top[j]--;
      else if(cold(j)){if(f.top[j]>0)f.top[j]=-f.top[j]-1;else f.top[j]=-1;}
      else f.top[j]=Math.min(300,f.top[j]+1);
     }
     v=Math.max(0,v-drops);f.stats.rain+=drops;
    }
    f.cloudNext[k]=clamp(v,0,60);
   }
   let swap=f.clouds;f.clouds=f.cloudNext;f.cloudNext=swap;
  }
  if(f.tick%18===0)buildNav();
  f.drawPending=true;f.changed++;
 }
 function generate(done){
  let y=0;
  function chunk(){
   const end=Math.min(H,y+24);
   for(;y<end;y++){
    let lat=Math.abs((y/999)*2-1),base=33-59*Math.pow(lat,1.36),row=y*W;
    for(let x=0;x<W;x++){
     let n0=n2(layers[0],x,y),n1=n2(layers[1],x,y),n2v=n2(layers[2],x,y),n3=n2(layers[3],x,y),n4=n2(layers[4],x,y);
     let ridge=Math.pow(1-Math.abs(2*n2v-1),3)*Math.max(0,n0-.48)*66;
     let e=clamp(Math.round(SEA+100*(n0-.5)+65*(n1-.5)+28*(n2v-.5)+12*(n3-.5)+5*(n4-.5)+ridge),0,255);
     let i=row+x,T=base-(e-SEA)*.21+(n2(layers[5],x,y)-.5)*7;
     f.elev[i]=e;f.temp[i]=clamp(Math.round(T),-90,80);
     if(e<SEA){let d=Math.min(105,SEA-e);f.top[i]=T<=0?-d:d;}
    }
   }
   f.progress=y/H;
   if(y<H){requestAnimationFrame(chunk);return;}
   for(let cy=0;cy<C;cy++)for(let cx=0;cx<C;cx++){
    let i=(cy*8+4)*W+cx*8+4,k=cy*C+cx,T=f.temp[i];
    f.clouds[k]=Math.max(0,4+random()*8+(f.elev[i]<SEA?5:0)+(T>22?3:0));
   }
   buildNav();
   f.ready=true;palette('Surface');paintClouds();
   f.landCount=0;f.waterCount=0;f.iceCount=0;
   for(let i=0;i<N;i+=10){if(f.top[i]>0)f.waterCount+=10;else if(f.top[i]<0)f.iceCount+=10;else f.landCount+=10;}
   done(f);
  }
  requestAnimationFrame(chunk);
 }
 f.at=at;f.idx=idx;f.walk=walk;f.shore=shore;f.waterDistance=waterDistance;f.liquidNear=liquidNear;f.safe=safe;
 f.biome=biome;f.growth=growth;f.generate=generate;f.weather=weather;f.palette=palette;f.paintClouds=paintClouds;f.buildNav=buildNav;
 f.nodeAt=nodeAt;f.sameLand=sameLand;f.clearLand=clearLand;f.route=landRoute;
 return f;
}
root.FrontierWorld={create,W,H,SEA};
})(window);
