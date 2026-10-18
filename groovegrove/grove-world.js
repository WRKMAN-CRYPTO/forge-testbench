/*
 * GrooveGrove world pass 005.
 * Spatial state is independent of the canvas. The server owns every decision.
 * Movement exists for musical reasons; silence and opting out are valid.
 */
export const WORLD_SIZE=Object.freeze({width:1500,height:1120});
export const PLACES=Object.freeze({
  clearing:Object.freeze({x:740,y:530,label:'THE CLEARING',kind:'open'}),
  library:Object.freeze({x:350,y:310,label:'THE LIBRARY',kind:'indoor'}),
  studio:Object.freeze({x:1130,y:310,label:'PRACTICE STUDIO',kind:'indoor'}),
  pond:Object.freeze({x:1130,y:850,label:'THE POND',kind:'open'})
});
const NAMES=['Pip','Riff','Murmur'];
const LINKS={clearing:['library','studio','pond'],library:['clearing'],studio:['clearing','pond'],pond:['clearing','studio']};
// These are landmarks along the actual painted footpaths, not teleport points.
const WAYPOINTS={
  'trail-clearing-library':{x:505,y:500},
  'trail-clearing-studio':{x:1005,y:485},
  'trail-clearing-pond':{x:940,y:750},
  'trail-pond-studio':{x:1290,y:580}
};
const between=(a,b)=>'trail-'+[a,b].sort().join('-');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const valid=n=>Number.isFinite(n);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const initial={
  Pip:{x:681,y:538,place:'clearing'},
  Riff:{x:798,y:530,place:'clearing'},
  Murmur:{x:754,y:659,place:'clearing'}
};
const SPEED={Pip:63,Riff:57,Murmur:46};
const RANGES={kick:650,snare:530,hat:310,guitar:470,voice:255};
const safePlace=p=>Object.hasOwn(PLACES,p)?p:'clearing';
const road=(from,to)=>{
  if(from===to)return [];
  // Four-way graph; search is tiny and stable even after a server restart.
  const q=[[from]],seen=new Set([from]);
  while(q.length){
    const path=q.shift(),node=path[path.length-1];
    for(const next of LINKS[node]||[]){
      if(seen.has(next))continue;
      const route=[...path,next];
      if(next===to){
        const full=[];
        for(let i=0;i<route.length-1;i++){
          const waypoint=between(route[i],route[i+1]);
          if(WAYPOINTS[waypoint])full.push(waypoint);
          full.push(route[i+1]);
        }
        return full;
      }
      q.push(route);seen.add(next);
    }
  }
  return ['clearing',to].filter(x=>x!==from);
};
export class GroveWorld {
  constructor(saved=null){
    this.people={};
    this.heard={Pip:0,Riff:0,Murmur:0};
    this.recent=[];
    for(const name of NAMES){
      const old=saved?.people?.[name]||{};
      const home=initial[name];
      this.people[name]={
        x:clamp(valid(old.x)?old.x:home.x,25,WORLD_SIZE.width-25),
        y:clamp(valid(old.y)?old.y:home.y,25,WORLD_SIZE.height-25),
        place:safePlace(old.place||home.place),
        destination:safePlace(old.destination||home.place),
        route:Array.isArray(old.route)?old.route.filter(x=>Object.hasOwn(PLACES,x)||Object.hasOwn(WAYPOINTS,x)).slice(0,9):[],
        purpose:typeof old.purpose==='string'?old.purpose.slice(0,85):'listening to the grove',
        lastChoice:valid(old.lastChoice)?old.lastChoice:-20,
        heard:Math.max(0,Math.floor(old.heard||0)),
        lastHeard:old.lastHeard&&NAMES.includes(old.lastHeard.from)?old.lastHeard:null,
        soundBar:valid(old.soundBar)?old.soundBar:-1,
        voluntaryRests:Math.max(0,Math.floor(old.voluntaryRests||0))
      };
    }
  }
  snapshot(){
    return {version:1,people:Object.fromEntries(NAMES.map(n=>[n,{
      ...this.people[n],route:[...this.people[n].route],
      lastHeard:this.people[n].lastHeard?{...this.people[n].lastHeard}:null
    }]))};
  }
  at(name,place,threshold=87){
    const p=this.people[name],dest=PLACES[place];
    return !!p && !!dest && distance(p,dest)<=threshold;
  }
  distance(a,b){return distance(this.people[a],this.people[b]);}
  traveling(name){const p=this.people[name];return !!p && p.route.length>0;}
  destination(name){return this.people[name]?.destination;}
  chooseDestination(name,place,purpose,bar){
    const p=this.people[name];
    if(!p||!PLACES[place])return false;
    if(p.destination===place && (p.route.length||this.at(name,place)))return false;
    p.destination=place;p.purpose=purpose.slice(0,85);p.lastChoice=bar;
    const here=this.at(name,p.place,110)?p.place:'clearing';
    p.route=road(here,place);
    if(!p.route.length && !this.at(name,place,52))p.route=[place];
    return true;
  }
  advance(grove,beatSeconds=60/98){
    for(const name of NAMES){
      const p=this.people[name];
      // Borrowed books are real: readers must reach the library to study.
      if(grove.library?.busy(name)){
        if(p.destination!=='library')this.chooseDestination(name,'library','reading a borrowed book',grove.bar);
      }
      const next=p.route[0];if(!next)continue;
      const to=PLACES[next]||WAYPOINTS[next];
      if(!to){p.route.shift();continue;}
      const dx=to.x-p.x,dy=to.y-p.y,d=Math.hypot(dx,dy);
      const step=SPEED[name]*beatSeconds;
      if(d<=step+0.001){
        p.x=to.x;p.y=to.y;if(PLACES[next])p.place=next;p.route.shift();
      }else{
        p.x+=dx/d*step;p.y+=dy/d*step;
      }
    }
  }
  canHear(listener,source,kind='guitar'){
    if(listener===source)return 1;
    const a=this.people[listener],b=this.people[source];
    if(!a||!b)return 0;
    // Doors and walls soften indoor performances for listeners outside.
    let range=RANGES[kind]||430;
    const aInside=this.at(listener,'library',125)||this.at(listener,'studio',135);
    const bInside=this.at(source,'library',125)||this.at(source,'studio',135);
    if(aInside!==bInside)range*=.48;
    else if(aInside&&bInside && a.destination!==b.destination)range*=.3;
    const d=distance(a,b);
    return clamp((range-d)/range,0,1);
  }
  sound(source,kind,bar,velocity=1){
    const p=this.people[source];if(!p)return;
    p.soundBar=bar;
    for(const name of NAMES){
      if(name===source)continue;
      const intensity=this.canHear(name,source,kind)*velocity;
      if(intensity<.05)continue;
      const listener=this.people[name];
      listener.heard++;
      listener.lastHeard={from:source,kind,bar,strength:Math.round(intensity*100)/100};
      this.heard[name]++;
      if(this.recent.length>19)this.recent.shift();
      this.recent.push({listener:name,from:source,kind,bar});
    }
  }
  decide(grove){
    const bar=grove.bar;
    for(const name of NAMES){
      const p=this.people[name],curious=name==='Pip'?grove.pip?.curiosity:name==='Riff'?grove.riff?.curiosity:grove.vocalist?.curiosity;
      if(grove.library?.busy(name))continue;
      if(this.traveling(name) || bar-p.lastChoice<9)continue;
      // A destination is a personal choice, not a mandatory timetable.
      if(Math.random()>.23*(curious??.5))continue;
      const recentlyHeard=p.lastHeard && bar-p.lastHeard.bar<8?p.lastHeard:null;
      let where=p.destination,why=p.purpose;
      if(recentlyHeard && Math.random()<.48){
        const performer=this.people[recentlyHeard.from];
        if(performer && performer.destination!==p.destination){
          where=performer.destination;
          why='curious about '+recentlyHeard.from+'\'s '+recentlyHeard.kind;
        }
      }else if(name==='Murmur'){
        if(Math.random()<.57){where='pond';why='listening to quiet and testing melodies';}
        else {where='clearing';why='listening for other musicians';}
      }else if(name==='Pip'){
        if(Math.random()<.38){where='studio';why='experimenting with rhythm';}
        else if(Math.random()<.47){where='library';why='curious about musical ideas';}
        else {where='clearing';why='listening for a possible jam';}
      }else{
        if(Math.random()<.43){where='studio';why='exploring harmonies';}
        else if(Math.random()<.45){where='library';why='studying chord language';}
        else {where='clearing';why='listening for a possible jam';}
      }
      if(where===p.destination){
        p.lastChoice=bar;p.voluntaryRests++;
      }else if(this.chooseDestination(name,where,why,bar)){
        grove.push(name+' heads toward '+PLACES[where].label.toLowerCase()+', '+why+'.');
      }
    }
  }
}
