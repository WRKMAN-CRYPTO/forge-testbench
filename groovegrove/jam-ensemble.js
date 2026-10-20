/*
 * A jam belongs to musicians who consent to play together, never to a fixed
 * pair of instruments. They may sing, play anything they hold, or rest.
 * Listening near one another alone is not an invitation.
 */
export const MUSICIANS=Object.freeze(['Pip','Riff','Murmur']);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const curiosity=(grove,name)=>name==='Pip'?grove.pip.curiosity:
  name==='Riff'?grove.riff.curiosity:grove.vocalist.curiosity;
export function available(grove,name){
 return MUSICIANS.includes(name)&&grove.space.people[name]&&
   grooveInstrument(grove,name)!=='none'&&!grove.library.busy(name)&&
   !grove.space.traveling(name)&&grove.space.destination(name)!=='pond';
}
function grooveInstrument(grove,name){return grove.disciplines.current(name);}
export function closeEnough(grove,a,b){
 if(a===b||!available(grove,a)||!available(grove,b))return false;
 // The voice is a legitimate instrument. Both players must be able to hear
 // one another, even when their rooms' walls affect sound propagation.
 return grove.space.distance(a,b)<270&&
   grove.space.canHear(a,b,'voice')>.04&&
   grove.space.canHear(b,a,'voice')>.04;
}
export function activeMembers(grove,names){
 const members=[...new Set((Array.isArray(names)?names:[]).filter(n=>available(grove,n)))];
 // Keep a connected conversational group. Nobody is trapped if they leave.
 if(members.length<2)return [];
 const connected=members.filter(n=>members.some(other=>other!==n&&closeEnough(grove,n,other)));
 return connected.length>=2?connected:[];
}
export function proposeJam(grove){
 const possible=MUSICIANS.flatMap((a,i)=>MUSICIANS.slice(i+1)
   .filter(b=>closeEnough(grove,a,b)).map(b=>[a,b]));
 if(!possible.length)return null;
 const [initiator,partner]=possible[Math.floor(Math.random()*possible.length)];
 const heard=grove.space.people[initiator]?.lastHeard;
 const fresh=heard?.from===partner&&grove.bar-heard.bar<=8;
 // A preference to collaborate, not a requirement to perform.
 if(Math.random()>=clamp(.15+.19*curiosity(grove,initiator)+(fresh?.11:0),.1,.6))
   return null;
 const heardBack=grove.space.people[partner]?.lastHeard;
 const back=heardBack?.from===initiator&&grove.bar-heardBack.bar<=8;
 if(Math.random()>=clamp(.2+.34*curiosity(grove,partner)+(back?.12:0)+
   .07*grove.familiarity/99,.18,.77))return null;
 const group=[initiator,partner];
 const third=MUSICIANS.find(n=>!group.includes(n)&&
   group.some(m=>closeEnough(grove,n,m)));
 if(third&&Math.random()<.23+.48*curiosity(grove,third))group.push(third);
 return group;
}
export function inviteThird(grove,members){
 const group=activeMembers(grove,members);
 if(group.length!==2)return group;
 const third=MUSICIANS.find(n=>!group.includes(n)&&group.some(m=>closeEnough(grove,n,m)));
 if(!third)return group;
 const heard=grove.space.people[third].lastHeard;
 const interested=group.includes(heard?.from)&&grove.bar-heard.bar<=8;
 if(Math.random()<clamp(.19+.36*curiosity(grove,third)+(interested?.13:0),.16,.75))
   return [...group,third];
 return group;
}
