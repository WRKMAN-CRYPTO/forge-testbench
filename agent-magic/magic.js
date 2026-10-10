(()=>{
'use strict';
const $=s=>document.querySelector(s), canvas=$('#view'),ctx=canvas.getContext('2d',{alpha:false}),stage=$('#stage');
const PI=Math.PI,TAU=PI*2,PHI=PI*(3-Math.sqrt(5));
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)), mix=(a,b,x)=>a+(b-a)*x, smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const hexX=Array.from({length:6},(_,i)=>Math.cos(i*TAU/6+PI/6));
const hexY=Array.from({length:6},(_,i)=>Math.sin(i*TAU/6+PI/6));
const palettes={
 arcane:[[115,189,242],[153,105,224],[184,158,238],[74,205,190]],
 healing:[[76,220,160],[136,228,113],[234,200,97],[128,206,173]],
 void:[[92,81,165],[166,80,210],[228,103,177],[70,50,130]],
 solar:[[238,187,92],[237,126,97],[237,209,150],[238,108,145]]
};
const PHASES=[
 ['disturbance',1.2,'01 / DISTURBANCE','Loose hexes wake, sensing a shape that does not yet exist.'],
 ['gathering',3.4,'02 / GATHERING','Fragments converge. A core and an outer shell begin to appear.'],
 ['formation',5.8,'03 / FORMATION','Hexes find their lanes, filaments, and boundaries.'],
 ['resolution',8.3,'04 / RESOLUTION','The spell holds its shape, but its agents keep moving.'],
 ['dissolution',10.7,'05 / DISSOLUTION','Hexes physically scatter, shrink, and lose their light.']
];
const DISSOLVE_AT=8.3,CYCLE=10.7;
const st={spell:'orb',tint:'arcane',phaseClock:0,casting:true,auto:false,pointer:null,agents:[],budget:2200,
 cohesion:60,shimmer:55,intensity:70,freedom:35,light:55,structure:70,density:0,stability:0,castCount:0,
 cooldown:0};
let W=0,H=0,last=0,fps=0,paused=false,resizeTimer=0,lastUI=0,frame=0,dragStart=null;
const random=()=>Math.random(), fract=x=>x-Math.floor(x), center=()=>[W*.5,H*.48];
const radius=()=>Math.min(W,H)*(.14+st.intensity*.0007);
const stageGrowth=()=>{const t=st.phaseClock;return t<1.2?.03+smooth(t/1.2)*.10:t<3.4?.13+smooth((t-1.2)/2.2)*.50:t<5.8?.63+smooth((t-3.4)/2.4)*.31:.94+smooth((t-5.8)/2.5)*.06};
const releaseProgress=()=>smooth((st.phaseClock-DISSOLVE_AT)/(CYCLE-DISSOLVE_AT));
function phaseInfo(){for(const p of PHASES){if(st.phaseClock<p[1])return p;}return PHASES[4];}
function spawn(i){const [cx,cy]=center(),angle=i*PHI+random()*.35, rr=(.24+Math.sqrt(random())*.92)*Math.max(W,H)*.52;
  const role=(i%20<5)?0:(i%20<12)?1:(i%20<17)?2:3; // 25% core, 35% shell, 25% filaments, 15% free fragments
  const z=fract(i*.6180339887+random()*.22), theta=angle, c=Math.cos(theta),d=Math.sin(theta);
  return {i,role,z,theta,c,d,seed:random()*TAU,spin:random()<.5?-1:1,
   x:cx+c*rr,y:cy+d*rr,vx:0,vy:0,radius:3.4,lit:0,color:0,opacity:0,scatterX:0,scatterY:0,released:false};
}
function ensureAgents(){while(st.agents.length<st.budget)st.agents.push(spawn(st.agents.length));if(st.agents.length>st.budget)st.agents.length=st.budget;}
function resize(){const r=stage.getBoundingClientRect(),nw=Math.max(260,Math.round(r.width)),nh=Math.max(320,Math.round(r.height));if(nw===W&&nh===H)return;
  const ow=W,oh=H;W=nw;H=nh;canvas.width=nw;canvas.height=nh;
  if(ow&&oh){const sx=nw/ow,sy=nh/oh;for(const a of st.agents){a.x*=sx;a.y*=sy;a.vx*=sx;a.vy*=sy;}if(st.pointer){st.pointer.x*=sx;st.pointer.y*=sy;}}
}
function cast(){ensureAgents();st.phaseClock=0;st.casting=true;st.cooldown=0;st.castCount++;
  for(const a of st.agents){a.released=false;a.opacity=Math.min(a.opacity,.14);a.lit*=.35;
    // Restart from where the agents ended, not a canned fade or sprite.
    if(!a.vx&&!a.vy){a.vx=Math.cos(a.theta)*.3;a.vy=Math.sin(a.theta)*.3;}}
  $('#statusText').textContent='SPELL ACTIVE';
}
function dissolve(){if(st.phaseClock>=CYCLE){return;}st.phaseClock=DISSOLVE_AT+.02;st.casting=true;for(const a of st.agents)a.released=false;}
function changeSpell(name){st.spell=name;$('#spellNote').textContent=name.toUpperCase();cast();}
function shape(a,t,r){ // Dynamic spatial objectives; the visible image is still made solely of agents.
  const c=a.c,d=a.d,z=a.z,role=a.role;
  let x=0,y=0;
  if(st.spell==='orb'){
    const rot=.1*Math.sin(t*.45+a.seed),rr=role===0?r*(.02+Math.sqrt(z)*.43):role===1?r*(.78+z*.22):role===2?r*(.45+z*.43):r*(1.15+z*.55);
    const th=a.theta+rot+(role===2?Math.sin(t*.65+a.seed)*.16:0);
    x=Math.cos(th)*rr;y=Math.sin(th)*rr;
    if(role===2){x+=Math.cos(th+PI/2)*r*.09*Math.sin(z*24+t*.7);y+=Math.sin(th+PI/2)*r*.09*Math.sin(z*24+t*.7);}
  }else if(st.spell==='ward'){
    const th=a.theta+t*(role===2?.1:.014)*a.spin;
    const rr=role===0?r*(.42+z*.17):role===1?r*(.94+z*.13):role===2?r*(.75+z*.23):r*(1.23+z*.5);
    x=Math.cos(th)*rr;y=Math.sin(th)*rr;
    if(role===2){x+=Math.cos(th)*r*.12*Math.cos(th*8);y+=Math.sin(th)*r*.12*Math.cos(th*8);}
  }else if(st.spell==='sigil'){
    const rot=t*.06, th=a.theta+rot;
    if(role===0||role===1){const rr=role===0?r*(.49+z*.06):r*(.90+z*.08);x=Math.cos(th)*rr;y=Math.sin(th)*rr;}
    else if(role===2){const sector=Math.floor(z*6),a1=sector*TAU/6+rot,offset=fract(z*6);
      const rr=r*(.51+.4*offset);x=Math.cos(a1)*rr;y=Math.sin(a1)*rr;}
    else{const rr=r*(1.1+z*.6);x=Math.cos(th)*rr;y=Math.sin(th)*rr;}
  }else{ // Summon a tiny spirit-familiar silhouette out of agent populations.
    const th=a.theta, t2=fract(z*3.7);
    if(role===0){const rr=r*Math.sqrt(z)*.39;x=Math.cos(th)*rr*.92;y=-r*.27+Math.sin(th)*rr*.86;}
    else if(role===1){const rr=r*Math.sqrt(z)*.49;x=Math.cos(th)*rr*.75;y=r*.23+Math.sin(th)*rr*.95;}
    else if(role===2){const ear=a.i%2===0?-1:1;const yy=r*(-.35-.48*t2);x=ear*r*(.26-.08*t2)+Math.cos(th)*r*.065;y=yy+Math.sin(th)*r*.05;}
    else{const yy=r*(.35+.13*Math.sin(th+z*7));x=-r*(.42+z*.46);y=yy-r*.24*Math.sin(z*TAU+t*.3);}
  }
  return [x,y];
}
function step(dt){ensureAgents();if(st.casting){st.phaseClock=Math.min(CYCLE,st.phaseClock+dt);
    if(st.phaseClock>=CYCLE){st.casting=false;st.cooldown=0;$('#statusText').textContent='SPELL DISSOLVED';}}
  else if(st.auto){st.cooldown+=dt;if(st.cooldown>1.1)cast();}
  const [cx,cy]=center(),r=radius(),g=stageGrowth(),release=releaseProgress(),
    structure=st.structure*.01,cohesion=st.cohesion*.01,shimmer=st.shimmer*.01,freedom=st.freedom*.01,
    t=st.phaseClock,dt60=Math.min(dt*60,2.5), basePull=.0026+.008*structure+.012*cohesion,
    pull=basePull*(.3+g*1.35);
  let ene=0,stable=0;
  for(let i=0;i<st.agents.length;i++){
    const a=st.agents[i];
    const [shapeX,shapeY]=shape(a,t,r),destX=cx+shapeX,destY=cy+shapeY;
    const aura=Math.sin(t*2.7+a.seed+shapeX*.015)*(.25+shimmer*.75);
    const arc=a.theta+t*.11*a.spin;
    const swirl=(.006+freedom*.03+shimmer*.014)*(a.role===1?1.2:.6);
    if(release>0){
      if(!a.released){a.released=true;const dx=a.x-cx,dy=a.y-cy,len=Math.hypot(dx,dy)||1;
        const blast=2.2+4*st.intensity*.01+(a.role===3?3:0);
        a.scatterX=dx/len*blast-Math.sin(arc)*2.1*a.spin;
        a.scatterY=dy/len*blast+Math.cos(arc)*2.1*a.spin;
        a.vx+=a.scatterX; a.vy+=a.scatterY;}
      a.vx=(a.vx + a.scatterX*.016*dt60 + Math.cos(a.seed+t*3)*.02*dt60)*.985;
      a.vy=(a.vy + a.scatterY*.016*dt60 + Math.sin(a.seed+t*2)*.02*dt60)*.985;
    }else{
      const wander=(1-g)*.60 + freedom*.18+shimmer*.27;
      let fx=(destX-a.x)*pull + Math.cos(arc+a.seed)*wander + Math.cos(arc+PI/2)*swirl*r*.01;
      let fy=(destY-a.y)*pull + Math.sin(arc+a.seed)*wander + Math.sin(arc+PI/2)*swirl*r*.01;
      if(st.pointer){const dx=st.pointer.x-a.x,dy=st.pointer.y-a.y,dist=Math.hypot(dx,dy)||1;
        fx+=dx/dist*.9;fy+=dy/dist*.9;}
      a.vx=(a.vx+fx*dt60)*(.77+.13*cohesion);
      a.vy=(a.vy+fy*dt60)*(.77+.13*cohesion);
    }
    a.x+=a.vx*dt60;a.y+=a.vy*dt60;
    // During dissolution agents are allowed to leave the stage. No wrap-around or replacement.
    if(!release){a.x=clamp(a.x,-30,W+30);a.y=clamp(a.y,-30,H+30);}
    const fromTarget=Math.hypot(a.x-destX,a.y-destY);
    const closeness=Math.exp(-fromTarget/(r*.65+10));
    const phaseLight=(.10+.80*g)*(1-release)*(1-release);
    const zone=(a.role===0?.60:a.role===1?.93:a.role===2?.76:.48);
    const phaseShimmer=.84+Math.sin(t*3.6+a.seed+aura)*shimmer*.18;
    a.opacity=clamp((.035+closeness*.38+g*.12)*phaseLight*zone*phaseShimmer,0,.53);
    a.lit=closeness*zone*phaseLight;
    const targetR=(a.role===1?3.5:a.role===0?3.0:a.role===2?2.7:2.4) * (.35+g*.65)*(1-release*.95);
    a.radius=mix(a.radius,targetR,.16);
    ene+=a.lit;
    stable+=1-clamp(Math.hypot(a.vx,a.vy)/15,0,1);
  }
  st.density=ene/st.agents.length;
  st.stability=stable/st.agents.length;
}
function hex(x,y,r){ctx.beginPath();ctx.moveTo(x+hexX[0]*r,y+hexY[0]*r);
 for(let j=1;j<6;j++)ctx.lineTo(x+hexX[j]*r,y+hexY[j]*r);ctx.closePath();}
function backdrop(){ctx.fillStyle='#09131c';ctx.fillRect(0,0,W,H);
  const [cx,cy]=center(),r=radius();const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,r*3.6);
  gradient.addColorStop(0,'rgba(17,30,42,.86)');gradient.addColorStop(1,'rgba(9,19,28,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
}
function draw(){backdrop();const release=releaseProgress(),g=stageGrowth();
  const light=st.light*.01,p=palettes[st.tint];
  const coreRGB=p.map(rgb=>rgb.map(v=>Math.round(mix(v*.58,v*.97,.10+.85*light))));
  const [cx,cy]=center(),r=radius();
  // A single bounded, source-over glow underneath agents. No additive accumulation.
  const glowPower=(.033+.19*light)*g*(1-release)*(1-release),color=p[0];
  if(glowPower>.001){const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,r*1.6);
    glow.addColorStop(0,`rgba(${color[0]},${color[1]},${color[2]},${glowPower})`);
    glow.addColorStop(.6,`rgba(${color[0]},${color[1]},${color[2]},${glowPower*.35})`);glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r*1.6,0,TAU);ctx.fill();}
  // Pixel count does not increase the color's maximum brightness. Source-over composites bounded RGB values.
  // Glow is a soft background only. Every visible spell contour is built from hexagonal agents.
  for(const a of st.agents){if(a.opacity<.004||a.radius<.3||a.x<-20||a.y<-20||a.x>W+20||a.y>H+20)continue;
    const rgb=coreRGB[a.role];const v=.85+(.12*st.shimmer*.01)*Math.sin(a.seed+st.phaseClock*4);
    const alpha=clamp(a.opacity*(.68+1.10*light)*v,0,.66);
    ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`;
    hex(a.x,a.y,a.radius);ctx.fill();
  }
}
function refreshUI(){const p=phaseInfo(),pct=Math.round(st.phaseClock/CYCLE*100);
  $('#phaseLabel').textContent=p[2];$('#phasePct').textContent=pct+'%';$('#phaseBar').style.width=pct+'%';
  $('#phaseDesc').textContent=st.casting?p[3]:'Dissolved. All hexes have scattered. Cast again to regather them.';
  $('#agentCount').textContent=st.agents.length.toLocaleString();$('#fps').textContent=Math.round(fps);
  $('#densityValue').textContent=Math.round(st.density*100)+'%';$('#stabilityValue').textContent=Math.round(st.stability*100)+'%';
  $('#readout').textContent=`${st.spell.toUpperCase()} · ${st.agents.length.toLocaleString()} hexes · light budget ${st.light}% · structure ${st.structure}% · casting #${st.castCount}. Core, shell, filaments and free fragments never accumulate unlimited brightness.`;
  $('#pulseBtn').textContent=st.auto?'◉ AUTO CAST ON':'◌ AUTO CAST OFF';$('#pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
}
function tick(now){if(!last)last=now;const dt=Math.min((now-last)*.001,.045);last=now;
  if(!paused)step(dt);fps=fps*.90+(dt>0?1/dt:60)*.10;draw();if(now-lastUI>220){refreshUI();lastUI=now;}
  frame++;requestAnimationFrame(tick);}
for(const id of ['budget','light','structure','cohesion','shimmer','intensity','freedom']){
  const el=$('#'+id),out=$('#'+id+'Out');el.addEventListener('input',()=>{st[id]=+el.value;out.textContent=id==='budget'?Number(el.value).toLocaleString():el.value+'%';if(id==='budget')ensureAgents();});}
$('#tint').addEventListener('change',e=>st.tint=e.target.value);
$('#castBtn').addEventListener('click',()=>{paused=false;cast();});
$('#dissolveBtn').addEventListener('click',()=>{paused=false;dissolve();});
$('#pulseBtn').addEventListener('click',()=>{st.auto=!st.auto;refreshUI();});
$('#pauseBtn').addEventListener('click',()=>{paused=!paused;refreshUI();});
for(const btn of document.querySelectorAll('.tab'))btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));changeSpell(btn.dataset.spell);});
function pointerPos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
stage.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY};if(e.pointerType!=='touch'){stage.setPointerCapture?.(e.pointerId);st.pointer=pointerPos(e);}});
stage.addEventListener('pointermove',e=>{if(!dragStart)return;
  if(e.pointerType!=='touch'||Math.abs(e.clientX-dragStart.x)>Math.abs(e.clientY-dragStart.y)*1.4+9)st.pointer=pointerPos(e);});
stage.addEventListener('pointerup',e=>{if(dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<16){const at=pointerPos(e);for(let i=0;i<st.agents.length;i+=4){const a=st.agents[i],dx=a.x-at.x,dy=a.y-at.y,d=Math.hypot(dx,dy)||1;
  if(d<95){a.vx+=dx/d*1.5;a.vy+=dy/d*1.5;}}}st.pointer=null;dragStart=null;});
stage.addEventListener('pointercancel',()=>{st.pointer=null;dragStart=null;});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,150)});
window.addEventListener('visibilitychange',()=>{last=performance.now()});
// Read-only metrics for reproducible browser tests; no external dependencies or network requests.
window.AgentMagicDiagnostics=()=>({version:'0.2',spell:st.spell,phase:phaseInfo()[0],clock:st.phaseClock,agents:st.agents.length,brightness:st.light,autocast:st.auto,casting:st.casting,fps:fps,density:st.density});
resize();ensureAgents();cast();requestAnimationFrame(tick);
})();
