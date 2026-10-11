(()=>{
const $=q=>document.querySelector(q), canvas=$('#view'), ctx=canvas.getContext('2d'), stage=$('#stage');
const PI=Math.PI, TAU=PI*2, PHI=PI*(3-Math.sqrt(5));
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)), mix=(a,b,x)=>a+(b-a)*x, smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)}, easeOut=x=>1-Math.pow(1-clamp(x,0,1),3);
const hexX=Array.from({length:6},(_,i)=>Math.cos(i*TAU/6+PI/6));
const hexY=Array.from({length:6},(_,i)=>Math.sin(i*TAU/6+PI/6));
const palettes={
 arcane:[[115,189,242],[153,105,224],[184,158,238],[74,205,190]],
 healing:[[76,220,160],[136,228,113],[234,200,97],[128,206,173]],
 void:[[92,81,165],[166,80,210],[228,103,177],[70,50,130]],
 solar:[[238,187,92],[237,126,97],[237,209,150],[238,108,145]],
 flame:[[255,156,72],[255,92,44],[255,214,94],[255,84,54]]
};
const PHASES=[
 ['disturbance',1.2,'01 / DISTURBANCE','Loose hexes wake, sensing a shape that does not yet exist.'],
 ['gathering',3.4,'02 / GATHERING','Fragments converge. A core and an outer shell begin to appear.'],
 ['formation',5.8,'03 / FORMATION','Hexes find their lanes, filaments, and boundaries.'],
 ['resolution',8.3,'04 / RESOLUTION','The spell holds its shape while the swarm keeps moving.'],
 ['dissolution',10.7,'05 / DISSOLUTION','Hexes physically scatter, shrink, and lose their light.']
];
const DISSOLVE_AT=8.3, CYCLE=10.7;
let W=0,H=0,last=0,fps=0,paused=false,resizeTimer=0;
const st={spell:'orb',tint:'arcane',phaseClock:0,casting:true,auto:false,pointer:null,agents:[],budget:2200,
  cohesion:60,shimmer:55,intensity:70,freedom:35,light:55,structure:70,density:0,stability:0,castCount:0,cooldown:0,
  activated:false,holdReady:false,holdElapsed:0,fireStart:{x:0,y:0},fireTarget:{x:0,y:0}};
const AgentMagicDiagnostics={state:st, cast:()=>cast(), activate:()=>activate(), dissolve:()=>dissolve(), step:dt=>step(dt), changeSpell:name=>changeSpell(name)}; window.AgentMagicDiagnostics=AgentMagicDiagnostics;
const center=()=>[W*.5,H*.48];
const baseRadius=()=>Math.min(W,H)*(st.spell==='fireball' ? (.09+st.intensity*.0006) : (.14+st.intensity*.0007));
const releaseProgress=()=>smooth((st.phaseClock-DISSOLVE_AT)/(CYCLE-DISSOLVE_AT));
const stageGrowth=()=>{const t=st.phaseClock;if(t<1.2)return .03+smooth(t/1.2)*.10; if(t<3.4)return .13+smooth((t-1.2)/2.2)*.50; if(t<5.8)return .63+smooth((t-3.4)/2.4)*.31; return .94+smooth((Math.min(t,8.3)-5.8)/2.5)*.06;};
// Formation completes at 54% of the old timeline for Fireball and 78% for all other spells.
// These are HOLD points, not automatic stop/dissolve commands.
function holdThreshold(){ return st.spell==='fireball' ? 5.8 : DISSOLVE_AT; }
function phaseInfo(){for(const p of PHASES){if(st.phaseClock<p[1])return p;}return PHASES[4];}
function spawn(i){
  const [cx,cy]=center(), angle=i*PHI+Math.random()*.35, rr=(.24+Math.sqrt(Math.random())*.92)*Math.max(W,H)*.52;
  const role=(i%20<5)?0:(i%20<12)?1:(i%20<17)?2:3;
  const z=(i*.6180339887+Math.random()*.22)%1, theta=angle;
  return {i,role,z,theta,seed:Math.random()*TAU,spin:Math.random()<.5?-1:1,x:cx+Math.cos(theta)*rr,y:cy+Math.sin(theta)*rr,vx:0,vy:0,radius:3.4,lit:0,opacity:0,color:[0,0,0],released:false,scatterX:0,scatterY:0};
}
function ensureAgents(){while(st.agents.length<st.budget)st.agents.push(spawn(st.agents.length));if(st.agents.length>st.budget)st.agents.length=st.budget;}
function resize(){const r=stage.getBoundingClientRect(), nw=Math.max(260,Math.round(r.width)), nh=Math.max(320,Math.round(r.height)); if(nw===W&&nh===H)return; const ow=W,oh=H; W=nw; H=nh; canvas.width=nw; canvas.height=nh; if(ow&&oh){const sx=nw/ow, sy=nh/oh; for(const a of st.agents){a.x*=sx;a.y*=sy;a.vx*=sx;a.vy*=sy;} if(st.pointer){st.pointer.x*=sx;st.pointer.y*=sy;} st.fireStart.x*=sx;st.fireStart.y*=sy;st.fireTarget.x*=sx;st.fireTarget.y*=sy;}}
function setupFireballAim(){ st.fireStart={x:W*.28,y:H*.60}; st.fireTarget=st.pointer ? {x:st.pointer.x,y:st.pointer.y} : {x:W*.78,y:H*.34}; }
function cast(){
  ensureAgents(); st.phaseClock=0; st.casting=true; st.cooldown=0; st.castCount++; st.holdReady=false; st.holdElapsed=0;
  st.activated=false; if(st.spell==='fireball') setupFireballAim();
  for(const a of st.agents){a.released=false;a.opacity=Math.min(a.opacity,.14);a.lit*=.35; if(!a.vx&&!a.vy){a.vx=Math.cos(a.theta)*.3;a.vy=Math.sin(a.theta)*.3;}}
  $('#statusText').textContent='SPELL ACTIVE'; updateActivateBtn();
}
function activate(){
  // Deliberate final activation: Fireball launches, every other spell releases.
  if(st.activated || !st.casting) return;
  st.activated=true; st.holdReady=false; st.holdElapsed=0;
  st.phaseClock=Math.max(st.phaseClock,holdThreshold());
  $('#statusText').textContent=st.spell==='fireball'?'FIREBALL LAUNCHED':'SPELL ACTIVATED'; updateActivateBtn();
}
function dissolve(){ if(st.phaseClock>=CYCLE)return; st.phaseClock=Math.max(DISSOLVE_AT+.02, st.phaseClock); st.casting=true; st.activated=true; st.holdReady=false; st.holdElapsed=0; for(const a of st.agents)a.released=false; updateActivateBtn(); }
function changeSpell(name){ st.spell=name; $('#spellNote').textContent=name.toUpperCase(); if(name==='fireball' && ['arcane','healing','void','solar'].includes(st.tint)){$('#tint').value='flame'; st.tint='flame';} cast(); }
function currentSpellCenter(){
  if(st.spell!=='fireball') return center();
  const t=st.phaseClock, launch=clamp((t-5.8)/(DISSOLVE_AT-5.8),0,1), [sx,sy]=[st.fireStart.x,st.fireStart.y], [tx,ty]=[st.fireTarget.x,st.fireTarget.y];
  if(!st.activated || t<5.8) return [sx,sy];
  const arcY=Math.sin(launch*PI) * Math.min(H*.20, Math.hypot(tx-sx,ty-sy)*.18);
  return [mix(sx,tx,easeOut(launch)), mix(sy,ty,easeOut(launch)) - arcY];
}
function fireDirection(){const dx=st.fireTarget.x-st.fireStart.x, dy=st.fireTarget.y-st.fireStart.y, d=Math.hypot(dx,dy)||1; return {ux:dx/d, uy:dy/d};}
function shape(a,t,r){
  const role=a.role, z=a.z, th=a.theta; let x=0,y=0;
  if(st.spell==='orb'){
    const rot=.1*Math.sin(t*.45+a.seed), rr=role===0?r*(.02+Math.sqrt(z)*.43):role===1?r*(.78+z*.22):role===2?r*(.45+z*.43):r*(1.15+z*.55);
    const ang=th+rot+(role===2?Math.sin(t*.65+a.seed)*.16:0); x=Math.cos(ang)*rr; y=Math.sin(ang)*rr; if(role===2){x+=Math.cos(ang+PI/2)*r*.09*Math.sin(z*24+t*.7); y+=Math.sin(ang+PI/2)*r*.09*Math.sin(z*24+t*.7);} 
  } else if(st.spell==='ward'){
    const ang=th+t*(role===2?.1:.014)*a.spin, rr=role===0?r*(.42+z*.17):role===1?r*(.94+z*.13):role===2?r*(.75+z*.23):r*(1.23+z*.5); x=Math.cos(ang)*rr; y=Math.sin(ang)*rr; if(role===2){x+=Math.cos(ang)*r*.12*Math.cos(ang*8); y+=Math.sin(ang)*r*.12*Math.cos(ang*8);}
  } else if(st.spell==='sigil'){
    const rot=t*.06, ang=th+rot; if(role===0||role===1){const rr=role===0?r*(.49+z*.06):r*(.90+z*.08); x=Math.cos(ang)*rr; y=Math.sin(ang)*rr;}
    else if(role===2){const sector=Math.floor(z*6), a1=sector*TAU/6+rot, off=(z*6)%1, rr=r*(.51+.4*off); x=Math.cos(a1)*rr; y=Math.sin(a1)*rr;}
    else{const rr=r*(1.1+z*.6); x=Math.cos(ang)*rr; y=Math.sin(ang)*rr;}
  } else if(st.spell==='summon'){
    if(role===0){const rr=r*Math.sqrt(z)*.39; x=Math.cos(th)*rr*.92; y=-r*.27+Math.sin(th)*rr*.86;}
    else if(role===1){const rr=r*Math.sqrt(z)*.49; x=Math.cos(th)*rr*.75; y=r*.23+Math.sin(th)*rr*.95;}
    else if(role===2){const ear=a.i%2===0?-1:1, yy=r*(-.35-.48*((z*3.7)%1)); x=ear*r*(.26-.08*((z*3.7)%1))+Math.cos(th)*r*.065; y=yy+Math.sin(th)*r*.05;}
    else{const yy=r*(.35+.13*Math.sin(th+z*7)); x=-r*(.42+z*.46); y=yy-r*.24*Math.sin(z*TAU+t*.3);}    
  } else { // fireball
    const dir=fireDirection(), ux=dir.ux, uy=dir.uy, tx=-uy, ty=ux; const launch=st.activated?clamp((t-5.8)/(DISSOLVE_AT-5.8),0,1):0; const charge=clamp(t/5.8,0,1);
    if(role===0){ const rr=r*(.02+Math.sqrt(z)*.26); const ang=th+t*2.6*a.spin; x=Math.cos(ang)*rr; y=Math.sin(ang)*rr; }
    else if(role===1){ const rr=r*(.42+z*.16); const ang=th+t*(1.4+launch*4.2)*a.spin; x=Math.cos(ang)*rr; y=Math.sin(ang)*rr; }
    else if(role===2){ const trail=r*(.25 + z*.95)*(launch*.9 + charge*.25); const sway=Math.sin(z*21+t*8+a.seed)*r*.12; x = -ux*trail + tx*sway; y = -uy*trail + ty*sway; }
    else { const burst = launch>0? launch : charge*.2; const rr=r*(.8+z*.75)*burst; const ang=th+t*2.4*a.spin; x=Math.cos(ang)*rr+(-ux)*r*.2*launch; y=Math.sin(ang)*rr+(-uy)*r*.2*launch; }
  }
  return [x,y];
}
function step(dt){
  ensureAgents();
  const holdAt=holdThreshold();
  if(st.casting){
    if(!st.activated){
      // All forms have a stable charging phase. No more surprise dissolves at 78%.
      st.phaseClock=Math.min(holdAt, st.phaseClock+dt);
      if(st.phaseClock>=holdAt){
        st.phaseClock=holdAt;
        st.holdReady=true;
        $('#statusText').textContent=st.spell==='fireball'?'FIREBALL CHARGED':`${st.spell.toUpperCase()} HELD`;
        if(st.auto){
          st.holdElapsed+=dt;
          if(st.holdElapsed>=2.2) activate();
        }
      }
    } else {
      st.phaseClock=Math.min(CYCLE,st.phaseClock+dt);
      if(st.phaseClock>=CYCLE){st.casting=false;st.cooldown=0;$('#statusText').textContent='SPELL DISSOLVED';}
    }
  } else if(st.auto){st.cooldown+=dt;if(st.cooldown>1.1)cast();}
  const [cx,cy]=currentSpellCenter(), r=baseRadius(), g=stageGrowth(), release=releaseProgress(), structure=st.structure*.01, cohesion=st.cohesion*.01, shimmer=st.shimmer*.01, freedom=st.freedom*.01, intensity=st.intensity*.01;
  const t=st.phaseClock, dt60=Math.min(dt*60,2.5), basePull=.0026+.008*structure+.012*cohesion, pull=basePull*(.3+g*1.35);
  let ene=0, stable=0;
  for(const a of st.agents){
    const [sx,sy]=shape(a,t,r), destX=cx+sx, destY=cy+sy, aura=Math.sin(t*2.7+a.seed+sx*.015)*(.25+shimmer*.75), arc=a.theta+t*.11*a.spin, swirl=(.006+freedom*.03+shimmer*.014)*(a.role===1?1.2:.6);
    if(release>0){
      if(!a.released){ a.released=true; const dx=a.x-cx, dy=a.y-cy, len=Math.hypot(dx,dy)||1, blast=2.2+4*intensity+(a.role===3?3:0); a.scatterX=dx/len*blast-Math.sin(arc)*2.1*a.spin; a.scatterY=dy/len*blast+Math.cos(arc)*2.1*a.spin; a.vx+=a.scatterX; a.vy+=a.scatterY; }
      a.vx=(a.vx+a.scatterX*.016*dt60+Math.cos(a.seed+t*3)*.02*dt60)*.985; a.vy=(a.vy+a.scatterY*.016*dt60+Math.sin(a.seed+t*2)*.02*dt60)*.985;
    } else {
      const wander=(1-g)*.60 + freedom*.18 + shimmer*.27; let fx=(destX-a.x)*pull + Math.cos(arc+a.seed)*wander + Math.cos(arc+PI/2)*swirl*r*.01; let fy=(destY-a.y)*pull + Math.sin(arc+a.seed)*wander + Math.sin(arc+PI/2)*swirl*r*.01;
      if(st.pointer && st.spell!=='fireball'){ const dx=st.pointer.x-a.x, dy=st.pointer.y-a.y, dist=Math.hypot(dx,dy)||1; fx+=dx/dist*.9; fy+=dy/dist*.9; }
      a.vx=(a.vx+fx*dt60)*(.77+.13*cohesion); a.vy=(a.vy+fy*dt60)*(.77+.13*cohesion);
    }
    a.x+=a.vx*dt60; a.y+=a.vy*dt60; if(!release){ a.x=clamp(a.x,-30,W+30); a.y=clamp(a.y,-30,H+30); }
    const fromTarget=Math.hypot(a.x-destX, a.y-destY), closeness=Math.exp(-fromTarget/(r*.65+10)), phaseLight=(.10+.80*g)*(1-release)*(1-release), zone=(a.role===0?.68:a.role===1?.94:a.role===2?.78:.52), phaseShimmer=.84+Math.sin(t*3.6+a.seed+aura)*shimmer*.18;
    a.opacity=clamp((.035+closeness*.38+g*.12)*phaseLight*zone*phaseShimmer,0,.58); a.lit=closeness*zone*phaseLight; const targetR=(a.role===1?3.5:a.role===0?3.0:a.role===2?2.7:2.4)*(.35+g*.65)*(1-release*.95); a.radius=mix(a.radius,targetR,.16);
    ene+=a.lit; stable += 1 - clamp(Math.hypot(a.vx,a.vy)/15,0,1);
  }
  st.density=ene/st.agents.length; st.stability=stable/st.agents.length;
}
function hex(x,y,r){ ctx.beginPath(); ctx.moveTo(x+hexX[0]*r,y+hexY[0]*r); for(let j=1;j<6;j++)ctx.lineTo(x+hexX[j]*r,y+hexY[j]*r); ctx.closePath(); }
function backdrop(){ ctx.fillStyle='#09131c'; ctx.fillRect(0,0,W,H); const [cx,cy]=currentSpellCenter(), r=baseRadius(); const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,r*3.6); gradient.addColorStop(0,'rgba(17,30,42,.86)'); gradient.addColorStop(1,'rgba(9,19,28,0)'); ctx.fillStyle=gradient; ctx.fillRect(0,0,W,H); }
function draw(){
  backdrop(); const release=releaseProgress(), g=stageGrowth(), light=st.light*.01, p=palettes[st.tint], [cx,cy]=currentSpellCenter(), r=baseRadius(); const coreRGB=p.map(rgb=>rgb.map(v=>Math.round(mix(v*.58,v*.97,.10+.85*light))));
  const glowPower=(.04+.21*light)*g*(1-release)*(1-release), color=p[0]; if(glowPower>.001){ const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,r*1.8); glow.addColorStop(0,`rgba(${color[0]},${color[1]},${color[2]},${glowPower})`); glow.addColorStop(.55,`rgba(${color[0]},${color[1]},${color[2]},${glowPower*.35})`); glow.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(cx,cy,r*1.8,0,TAU); ctx.fill(); }
  if(st.spell==='fireball'){
    const dir=fireDirection(), launch=st.activated?clamp((st.phaseClock-5.8)/(DISSOLVE_AT-5.8),0,1):0, [sx,sy]=[st.fireStart.x,st.fireStart.y];
    if(launch>0 && release===0){ const trail=ctx.createLinearGradient(sx,sy,cx,cy); trail.addColorStop(0,`rgba(${p[1][0]},${p[1][1]},${p[1][2]},0)`); trail.addColorStop(.5,`rgba(${p[2][0]},${p[2][1]},${p[2][2]},${.10+.12*light})`); trail.addColorStop(1,`rgba(${p[0][0]},${p[0][1]},${p[0][2]},${.24+.15*light})`); ctx.strokeStyle=trail; ctx.lineWidth=Math.max(6,r*.25); ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(cx,cy); ctx.stroke(); }
    if(release>0){ const burst=ctx.createRadialGradient(cx,cy,0,cx,cy,r*(1.4+release*2.2)); burst.addColorStop(0,`rgba(${p[3][0]},${p[3][1]},${p[3][2]},${.18*(1-release)})`); burst.addColorStop(.7,`rgba(${p[1][0]},${p[1][1]},${p[1][2]},${.12*(1-release)})`); burst.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=burst; ctx.beginPath(); ctx.arc(cx,cy,r*(1.4+release*2.2),0,TAU); ctx.fill(); }
  }
  for(const a of st.agents){ if(a.opacity<.004||a.radius<.3||a.x<-20||a.y<-20||a.x>W+20||a.y>H+20) continue; const rgb=coreRGB[a.role], v=.85+(.12*st.shimmer*.01)*Math.sin(a.seed+st.phaseClock*4), alpha=clamp(a.opacity*(.68+1.10*light)*v,0,.68); ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`; hex(a.x,a.y,a.radius); ctx.fill(); }
  if(st.spell==='sigil' && (st.holdReady || (!st.activated && st.phaseClock>=DISSOLVE_AT-.01))){ ctx.strokeStyle=`rgba(${p[2][0]},${p[2][1]},${p[2][2]},.18)`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,r*.92,0,TAU); ctx.stroke(); }
}
function updateActivateBtn(){
  const b=$('#activateBtn');
  b.disabled=st.activated || !st.casting;
  b.style.opacity=b.disabled?'.5':'1';
  b.textContent=st.spell==='fireball' ? (st.holdReady?'🔥 LAUNCH':'⚡ LAUNCH EARLY') : (st.holdReady?'⚡ ACTIVATE':'⚡ ACTIVATE EARLY');
}
function updateUI(){
  const pd=phaseInfo(), holdAt=holdThreshold(), holding=st.holdReady&&!st.activated;
  const progress=st.activated?clamp((st.phaseClock-holdAt)/(CYCLE-holdAt),0,1):clamp(st.phaseClock/holdAt,0,1);
  const totalPct=Math.round(progress*100);
  const activeLabel=st.spell==='fireball'&&st.phaseClock<DISSOLVE_AT?'05 / FIREBALL IN FLIGHT':'05 / FINAL RELEASE';
  $('#phaseLabel').textContent=holding?(st.spell==='fireball'?'05 / CHARGED · HELD':'05 / FORMED · HELD'):(st.activated?activeLabel:pd[2]);
  $('#phasePct').textContent=holding?'READY':totalPct+'%';
  $('#phaseBar').style.width=totalPct+'%';
  $('#phaseDesc').textContent=holding?(st.spell==='fireball'?'Fireball charged. Tap LAUNCH to fly, trail, and burst.':'Form stabilized. Tap ACTIVATE for final release.'):(st.activated?(st.spell==='fireball'?'Fireball in motion or bursting.':'Final activation releases the spell.'):pd[3]);
  $('#agentCount').textContent=st.agents.length.toLocaleString(); $('#fps').textContent=Math.round(fps); $('#densityValue').textContent=Math.round(st.density*100)+'%'; $('#stabilityValue').textContent=Math.round(st.stability*100)+'%';
  $('#pulseBtn').textContent=st.auto?'◉ AUTO CAST ON':'◌ AUTO CAST OFF'; $('#pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
  for(const id of ['budget','light','structure','cohesion','shimmer','intensity','freedom']) $('#'+id+'Out').textContent=id==='budget'?st.budget.toLocaleString():st[id]+'%';
  const mode=holding?'held and active':st.activated?(releaseProgress()>0?'releasing':'activated'):'forming';
  $('#readout').textContent=`${st.spell[0].toUpperCase()+st.spell.slice(1)} spell · ${st.agents.length} agents · ${mode} · light ${st.light}% · structure ${st.structure}% · cast #${st.castCount}. ${st.auto?'Auto Cast will activate after the hold.':'Spells remain formed until ACTIVATE or DISSOLVE.'}`;
  updateActivateBtn();
}
function tick(now){ if(!last)last=now; const dt=Math.min((now-last)/1000,.05); last=now; if(!paused) step(dt); fps=fps*.9 + (dt?1/dt:60)*.1; draw(); updateUI(); requestAnimationFrame(tick); }
for(const id of ['budget','light','structure','cohesion','shimmer','intensity','freedom']){ const el=$('#'+id); el.addEventListener('input',()=>{ st[id]=Number(el.value); if(id==='budget') ensureAgents(); }); }
$('#tint').addEventListener('change',e=>{ st.tint=e.target.value; });
$('#castBtn').addEventListener('click',cast); $('#activateBtn').addEventListener('click',activate); $('#dissolveBtn').addEventListener('click',dissolve); $('#pulseBtn').addEventListener('click',()=>{ st.auto=!st.auto; }); $('#pauseBtn').addEventListener('click',()=>{ paused=!paused; });
for(const btn of document.querySelectorAll('.tab')) btn.addEventListener('click',()=>{ document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn)); changeSpell(btn.dataset.spell); });
function pointerPos(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height)}; }
stage.addEventListener('pointerdown',e=>{ stage.setPointerCapture?.(e.pointerId); st.pointer=pointerPos(e); if(st.spell==='fireball'){ st.fireTarget={x:st.pointer.x,y:st.pointer.y}; }});
stage.addEventListener('pointermove',e=>{ if(e.buttons){ st.pointer=pointerPos(e); if(st.spell==='fireball' && !st.activated) st.fireTarget={x:st.pointer.x,y:st.pointer.y}; }});
stage.addEventListener('pointerup',()=>{ st.pointer=null; }); stage.addEventListener('pointerleave',()=>{ st.pointer=null; });
window.addEventListener('resize',()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(resize,120); });
resize(); ensureAgents(); cast(); requestAnimationFrame(tick);
})();
