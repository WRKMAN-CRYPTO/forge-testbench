/* WRKMAN 026 spell wheel / deterministic offline tests
 * node magic-lab/spell-loadout.tests.js
 */
"use strict";
const L=require("./spell-loadout.js");
let total=0;
function expect(name,ok){if(!ok)throw new Error("FAILED: "+name);total++;}
expect("six default runes",L.DEFAULT.length===6);
expect("seven known spells",L.LIBRARY.length===7);
expect("initial loadout valid",L.valid(L.DEFAULT));
expect("all unique",new Set(L.DEFAULT).size===6);
expect("elemental quartet available",["bolt","well","frost","flame","detonate","lightning"].every(x=>L.DEFAULT.includes(x)));
expect("pulse unequipped initially",L.unassigned(L.DEFAULT).join()==="pulse");
expect("invalid partial loadout fallback",L.safe(["bolt"]).join()===L.DEFAULT.join());
expect("duplicates rejected",!L.valid(["bolt","bolt","pulse","frost","flame","detonate"]));
expect("unknown spell rejected",!L.valid(["bolt","well","frost","flame","detonate","unknown"]));
expect("original unchanged",L.DEFAULT[0]==="bolt");
const rep=L.assign(L.DEFAULT,0,"pulse");
expect("assign new spell",rep[0]==="pulse");
expect("evicted spell moved to library",L.unassigned(rep).includes("bolt"));
expect("can swap with already equipped",L.assign(L.DEFAULT,0,"lightning")[5]==="bolt");
expect("swap doesn't mutate source",L.DEFAULT[0]==="bolt");
expect("swap unique",L.valid(L.assign(L.DEFAULT,0,"lightning")));
expect("out of range index ignored",L.assign(L.DEFAULT,-1,"pulse").join()===L.DEFAULT.join());
expect("unknown spell ignored",L.assign(L.DEFAULT,2,"q").join()===L.DEFAULT.join());
const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
expect("write",L.write(storage,rep));
expect("read",L.read(storage).join()===rep.join());
saved.set(L.KEY,'["bolt","bolt"]');expect("invalid saved profile resets safely",L.read(storage).join()===L.DEFAULT.join());
saved.set(L.KEY,"}{oops");expect("malformed JSON resets safely",L.read(storage).join()===L.DEFAULT.join());
const denied={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")}};
expect("private storage load fallbacks",L.read(denied).join()===L.DEFAULT.join());
expect("private storage write fallbacks",L.write(denied,L.DEFAULT)===false);
for(let i=0;i<6;i++){
 const point=L.pos(i);
 const action=L.gesture(point.x,point.y);
 expect("radial gesture position "+i,action.action==="select"&&action.index===i);
}
expect("central tap cast",L.gesture(0,0).action==="cast");
expect("small motion cast",L.gesture(13,7).action==="cast");
expect("neutral gap cancels",L.gesture(43,0).action==="cancel");
expect("far-away drag cancels",L.gesture(300,0).action==="cancel");
expect("all icons defined",L.LIBRARY.every(x=>L.GLYPH[x]));
// Build 029: the right-thumb gesture must stay inside a corner quarter-fan.
expect("quarter-fan six slots",L.FAN.length===6);
expect("all runes in upper-left quarter",L.FAN.every(({degrees})=>degrees>=-180&&degrees<=-90));
expect("fan contains exactly two radial bands",new Set(L.FAN.map(p=>p.radius)).size===2);
expect("same saved loadout version across wheel redesign",L.KEY==="wrkman-arcane-lab026-spell-loadout-v1");
expect("gesture over Dash does not choose a rune",L.gesture(-110,5).action==="cancel");
expect("right drag cancels",L.gesture(115,0).action==="cancel");
expect("down drag cancels",L.gesture(0,115).action==="cancel");
expect("swipe farther away cancels",L.gesture(-280,-150).action==="cancel");
let minSpacing=Infinity;
for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
 const a=L.pos(i),b=L.pos(j);
 minSpacing=Math.min(minSpacing,Math.hypot(a.x-b.x,a.y-b.y));
}
expect("runes have room for 44px hit targets",minSpacing>51);
const runes=L.FAN.map((_,i)=>L.pos(i));
const hub={x:190,y:190},width=238,height=238,halfRune=44*1.12/2;
expect("runes stay inside 238px dock",runes.every(p=>hub.x+p.x-halfRune>=0&&hub.x+p.x+halfRune<=width&&hub.y+p.y-halfRune>=0&&hub.y+p.y+halfRune<=height));
// Reference hub center as (0,0), Dash is left/down so two rectangles cannot
// overlap, including the highlight-scale allowance on the slot nearest Dash.
const dash={x0:-144,x1:-76,y0:-24,y1:34};
const overlap=(p,r=halfRune)=>!(p.x+r<dash.x0||p.x-r>dash.x1||p.y+r<dash.y0||p.y-r>dash.y1);
expect("expanded fan never covers Dash",runes.every(p=>!overlap(p)));
expect("fan is not full-circle",runes.every(p=>p.y<0&&p.x<=0.001));
// Finger tolerance should accept small off-center motions, not just exact pixels.
for(let i=0;i<6;i++){
 const p=L.pos(i);
 expect("off-center drag selects rune "+i,L.gesture(p.x-3,p.y-3).index===i);
}
console.log("Spell Wheel 029: "+total+" tests passed");
