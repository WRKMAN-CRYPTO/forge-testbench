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
console.log("Spell Wheel 026: "+total+" tests passed");
