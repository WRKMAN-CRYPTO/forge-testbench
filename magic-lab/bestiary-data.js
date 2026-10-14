/* WRKMAN Magic Lab 053: Bestiary canonical reference data.
   New creatures start as concepts. Actual gameplay requires explicit combat implementation. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_BESTIARY_DATA=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const KEY="wrkman-magic-lab053-bestiary-v1",FORMAT="wrkman-magic-lab-bestiary";
 const FIELDS=["name","title","category","habitat","temperament","hp","radius","symbol",
               "description","behaviors","abilities","counterplay","notes","tags"];
 const DEFAULTS=[
 {id:"archivist",name:"The Archivist",title:"The Learning Adversary",category:"Superboss",
  habitat:"The Living Archive · Stargate ✶ ☽ ◇ ✦ ⬡ ☼",
  temperament:"Curious, calculating, capable of deliberate deception",
  hp:1650,radius:32,symbol:"✶",tags:"Boss, Learning, Memory, Invention, Deception",
  description:"A recurring arcane construct. Unlike ordinary creatures, he regards defeat as information. One vessel may fall while portions of his observations survive the encounter.",
  behaviors:"OBSERVE → INSCRIBE → EXPERIMENT → REASSESS\nREADING ARC → PHYSICAL SIDESTEP when a visible Arc Bolt has a predicted collision course. Requires reaction time; can choose poorly, hit cover, or be caught mid-dodge. Retains partial preferences and successful inventions between encounters. Never reads spell rune layouts or future inputs.",
  abilities:"Invents physical projectile spells by combining Arcane/Frost/Fire/Lightning with Lance, Fan, Pincer or Spiral patterns, optional lead aiming and false telegraphs. Successful tests are remembered. Tactical plans now divide the SAME shot budget into herding openings, deceptive countermoves, and forked attacks threatening two escape lanes with a genuine central gap. After observing reversed dodges he may delay a counter; repeated failed tactics lose learned preference. Judgment also recognizes risky bait and attacks anticipated on a familiar rhythm: he may refuse an opening and retreat rather than reflexively firing. His Board now tests several physical spell patterns against five plausible player escape choices, comparing direct pressure with a delayed counterattack. Frost projectiles can briefly stagger.",
  counterplay:"His readings are imperfect. Arc Bolt near misses do not trigger a dodge, but oncoming bolts sometimes do. Curve shots with gravity, coordinate simultaneous threats, block his escape with real terrain, and punish interrupted windups. When he says READING ESCAPE or QUESTIONING BAIT, his amber mark exposes a fallible hypothesis. A reversed dodge can force him to hesitate; forked attacks leave an intentionally safe center. Refuse an obvious escape, change direction again, or interrupt his counter. DECLINING BAIT is a visible moment when he decides not to attack; pushing forward or waiting him out may punish the hesitation. He learns whether that pause disrupted you. The BOARD HUD shows predicted threatened lanes and an estimated count of movement changes observed shortly after attacks. EDICT OF MOTION places a visible violet ring at the wizard’s position, then bursts after 450ms with violet rune shards, expanding shock rings, and impact sparks: leaving its 82-unit circle avoids all 16 damage. This replaces a normal attack rather than adding a free attack. That is useful evidence of pressure but cannot prove the attack caused the movement.",
  notes:"Build 068: Edict of Motion now warns for 450ms before a stronger visual rune-shatter explosion, still with unchanged damage and full escape counterplay. The two-ply board planning and measured pressure remain. He can distinguish a forced change of course from straight-line movement, and old memories remain compatible. Projectile cognition retained. 1650 HP / damage / speed / cooldown unchanged. Gate code 721360. Inventions remain bounded attack combinations; autonomous 32x32 forging is future work."},
 {id:"glassrunner",name:"Glassrunner",title:"The Crystal Dodger",category:"Skirmisher",habitat:"Hostile arenas • Home Lab",
  temperament:"Aggressive hunter",hp:125,radius:19,symbol:"◈",tags:"Crystal, Evade, Burst",
  description:"A slender cyan crystal lizard. Reads real incoming projectile trajectories, not spell names. Can be fooled, cornered, staggered or hit mid-dodge.",
  behaviors:"HUNTING → TRACKING → SIDESTEP! → DODGE → RECOVER\nTwo physical sidestep charges; replenishes one roughly every 2.8 seconds. Stagger interrupts evasion.",
  abilities:"TRIPLE DASH: 560ms warning, three real momentum bursts, re-aims before each launch, never during flight. Cooldown 10 seconds after combo finishes. About 920ms exhausted afterward.\nSwipe: 7 HP. Triple dash contact: 13 HP.",
  counterplay:"Converging projectiles and terrain can outmaneuver it. Hit during telegraph, stagger with frost, or exploit EXHAUSTED recovery.",
  notes:"Implemented in glassrunner-mind.js and combat.js. Build 051 introduced Glassrunner. Build 052 gave it a stronger pursuit and triple dash."},
 {id:"gravelhorn",name:"Gravelhorn",title:"The Territorial Bulwark",category:"Guardian",habitat:"Hostile arenas • Home Lab",
  temperament:"Defensive of its den",hp:370,radius:38,symbol:"◆",tags:"Stone, Heavy, Territory",
  description:"Armored horned beast. Protects its patch of the world rather than automatically knowing the wizard's location.",
  behaviors:"PATROL → WATCH → WARNING → BRACING → CHARGING → RECOVER → RETURN\nEscalates on intrusion, returns toward den, enrages at low HP.",
  abilities:"Locked-direction physical charge: 27 HP contact. ~720ms bracing tell, shorter when wounded. Bracing reduces crafted swarm damage.",
  counterplay:"Sidestep only after its charge direction locks; use walls or exploit its territorial limit.",
  notes:"Implemented in territory-mind.js and combat.js, introduced Build 046."},
 {id:"charger",name:"Charger",title:"The Living Battering Ram",category:"Bruiser",habitat:"Hostile arenas • Home Lab",
  temperament:"Hostile",hp:165,radius:26,symbol:"♜",tags:"Momentum, Charge, Kinetic",
  description:"A horned brawler whose charging body can become a weapon against its own allies.",
  behaviors:"STALK → WINDUP → CHARGE → RECOVER",
  abilities:"Telegraphed Matter-based rush. Fast impacts can damage lighter enemies. Ordinary contact deals 7 HP outside a charge.",
  counterplay:"Bait a commitment, move aside, use physics and barriers to redirect it.",
  notes:"Core combat enemy in combat.js."},
 {id:"wisp",name:"Ember Wisp",title:"The Ranged Spark",category:"Ranged",habitat:"Hostile arenas • Home Lab",
  temperament:"Hostile",hp:80,radius:18,symbol:"✺",tags:"Fire, Orbit, Ranged",
  description:"A hovering ember that orbits at range, sending real firebolts through the environment.",
  behaviors:"ORBIT → AIM → FIRE → REPOSITION",
  abilities:"Physical ember projectiles that can strike props or other enemies after deflection. Contact deals 5 HP.",
  counterplay:"Interrupt its lines of fire with props, pull it toward you, or redirect its shots.",
  notes:"Core combat enemy in combat.js."},
 {id:"mossling",name:"Mossling",title:"The Gentle Resident",category:"Neutral wildlife",habitat:"Sanctuary • Hostile arenas • Home Lab",
  temperament:"Peaceful unless threatened",hp:90,radius:16,symbol:"❀",tags:"Wildlife, Reactive, Nonhostile",
  description:"A curious green resident with a home range, physical senses and short-term danger memory. Not a kill objective.",
  behaviors:"GRAZE → CURIOUS → WARY → FLEE\nDEFEND only if hurt and cornered.",
  abilities:"Investigates small disturbances; flees blasts and nearby charging animals; defensive nip deals 4 HP.",
  counterplay:"No reason to attack. Leave it space and observe how it responds to your magic.",
  notes:"Implemented in creature-mind.js and combat.js, introduced Build 045. Doesn't count as a hostile or KO."}
 ];
 const defaultMap=new Map(DEFAULTS.map(x=>[x.id,x]));
 const isId=x=>typeof x==="string"&&/^[a-z][a-z0-9-]{1,63}$/.test(x);
 function normalize(item){
  if(!item||!isId(item.id))return null;
  const out={id:item.id,kind:defaultMap.has(item.id)?"live":"concept"};
  for(const field of FIELDS){
   if(field==="hp"||field==="radius"){
    const v=Number(item[field]);out[field]=Number.isFinite(v)?Math.max(0,Math.min(999999,Math.round(v))):0;
   }else out[field]=String(item[field]??"").slice(0,field==="symbol"?4:field==="name"?96:field==="title"?130:field==="tags"?280:8000);
  }
  return out;
 }
 function initial(){return DEFAULTS.map(x=>normalize(x));}
 function decode(raw){
  const array=Array.isArray(raw)?raw:raw?.entries;
  if(!Array.isArray(array)||array.length>150)return null;
  const seen=new Set(),out=[];
  for(const item of array){
   const entry=normalize(item);
   if(!entry||seen.has(entry.id))return null;
   seen.add(entry.id);out.push(entry);
  }
  return out;
 }
 function read(storage){
  let data;
  try{data=JSON.parse(storage?.getItem(KEY)||"null");}catch(_){}
  const byId=new Map(initial().map(x=>[x.id,x]));
  const stored=data?.version===1?decode(data):null;
  if(stored)for(const item of stored)byId.set(item.id,item);
  return [...byId.values()];
 }
 function save(storage,entries){
  const checked=decode(entries);
  if(!checked)return false;
  try{storage?.setItem(KEY,JSON.stringify({version:1,entries:checked}));return Boolean(storage);}
  catch(_){return false;}
 }
 function merge(current,imported){
  const loaded=decode(imported);
  if(!loaded)return null;
  const byId=new Map(current.map(x=>[x.id,normalize(x)]));
  for(const item of loaded)byId.set(item.id,item);
  return [...byId.values()];
 }
 function exportData(entries){
  return {format:FORMAT,version:1,entries:decode(entries)||[]};
 }
 return Object.freeze({KEY,FORMAT,FIELDS,DEFAULTS,normalize,initial,decode,read,save,merge,exportData});
});
