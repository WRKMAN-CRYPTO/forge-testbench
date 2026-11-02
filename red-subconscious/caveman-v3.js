/* CAVEMAN v0.3 — inspectable, reversible lexical attention filter.
   Never alters the source text. Heuristics are deliberately conservative.
   Standalone: no network, model, or task-specific vocabulary needed. */
(function(root){
"use strict";
const STOP=new Set("A AN THE I ME MY MINE AM IS ARE WAS WERE BE BEEN BEING DO DOES DID HAVE HAS HAD OF IN ON AT BY AS TO FOR WITH FROM INTO UP DOWN ABOUT THAN VERY JUST REALLY QUITE SOME ANY ANOTHER".split(" "));
const IRREGULAR={CLICKED:"CLICK",CLICKING:"CLICK",CRASHED:"CRASH",CRASHING:"CRASH",PRESSED:"PRESS",PRESSING:"PRESS",CHANGED:"CHANGE",CHANGING:"CHANGE",RENAMED:"RENAME",RENAMING:"RENAME",APPEARED:"APPEAR",APPEARING:"APPEAR",RESPONDED:"RESPOND",RESPONDING:"RESPOND",OPENED:"OPEN",OPENING:"OPEN",CLOSED:"CLOSE",CLOSING:"CLOSE",BECAME:"BECOME",BECOMES:"BECOME",SAYS:"SAY",SAID:"SAY",SAW:"SEE",SEEN:"SEE",WENT:"GO",GONE:"GO",TOOK:"TAKE",GIVEN:"GIVE",GAVE:"GIVE",WROTE:"WRITE",WRITTEN:"WRITE",DREW:"DRAW",DRAWN:"DRAW",RAN:"RUN",RUNNING:"RUN",FOUND:"FIND",THOUGHT:"THINK",THINKING:"THINK",TRIED:"TRY",TRYING:"TRY",FAILED:"FAIL",FAILING:"FAIL",TURNED:"TURN",TURNING:"TURN",TYPED:"TYPE",TYPING:"TYPE",WORKED:"WORK",WORKING:"WORK",LOADED:"LOAD",LOADING:"LOAD",BROKE:"BREAK",BROKEN:"BREAK",FELL:"FALL",FALLEN:"FALL",WON:"WIN",LOST:"LOSE",DIDNT:"NOT",DOESNT:"NOT",DONT:"NOT",CANT:"CANNOT",CANNOT:"CANNOT",COULDNT:"COULD_NOT",WOULDNT:"WOULD_NOT",WONT:"WILL_NOT",ISNT:"NOT",ARENT:"NOT",WASNT:"NOT",WERENT:"NOT",HASNT:"NOT",HAVENT:"NOT",HADNT:"NOT",SHOULDNT:"NOT",MUSTNT:"MUST_NOT",NEVER:"NOT",NO:"NOT",NOTHING:"NOTHING",DID:"DID",STARS:"STAR",WORDS:"WORD",BUTTONS:"BUTTON",WINDOWS:"WINDOW",DOCUMENTS:"DOCUMENT",CARDS:"CARD",FILES:"FILE",ACTIONS:"ACTION",EVENTS:"EVENT",RESULTS:"RESULT",AGENTS:"AGENT",TILES:"TILE",KEYS:"KEY",NODES:"NODE",ERRORS:"ERROR",SCREENS:"SCREEN",PAGES:"PAGE",EDITED:"EDIT",EDITING:"EDIT",STARED:"STARE",STARING:"STARE",LOOKED:"LOOK",LOOKING:"LOOK",FIXED:"FIX",FIXING:"FIX",PULLED:"PULL",PULLING:"PULL",TESTED:"TEST",TESTING:"TEST"};
const IMPORTANT=new Set(["NOT","NO","AND","OR","CANNOT","COULD_NOT","WOULD_NOT","WILL_NOT","MUST_NOT","ONLY","AGAIN","BEFORE","AFTER","THEN","UNTIL","UNLESS","WITHOUT","EXCEPT","MAYBE","MIGHT","COULD","SHOULD","MUST","WILL","WOULD","IF","BUT","INSTEAD","FIRST","LAST","ALWAYS","NEVER","SOMETIMES","REPEAT","RETRY","OTHER","SAME","DIFFERENT","HE","SHE","THEY","YOU","WE","IT","ITS","THIS","THAT","THESE","THOSE"]);
function normalize(word){
 let w=String(word).toUpperCase().replace(/[’']/g,"");
 if(IRREGULAR[w])return IRREGULAR[w];
 /* Unknown inflections stay intact instead of guessing a potentially different word. */
 return w;
}
function lex(text){
 const tokens=String(text||"").match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[];
 return tokens.slice(0,80);
}
function compile(text){
 const raw=String(text||"").trim().slice(0,500);
 let split=null;
 // Strictly temporal markers are used to reorder clauses. "and" alone does not assert order.
 const after=/(?:not|never)\s+after\b/i.test(raw)?null:raw.match(/^(.+?)\s+after\s+(.+?)[.!?]*$/i);
 const before=/(?:not|never)\s+before\b/i.test(raw)?null:raw.match(/^(.+?)\s+before\s+(.+?)[.!?]*$/i);
 const then=/(?:not|never)\s+then\b/i.test(raw)?null:raw.match(/^(.+?)\s+(?:and\s+then|then)\s+(.+?)[.!?]*$/i);
 if(after)split={parts:[after[2],after[1]],relation:"AFTER",reordered:true};
 else if(before)split={parts:[before[1],before[2]],relation:"BEFORE",reordered:false};
 else if(then)split={parts:[then[1],then[2]],relation:"THEN",reordered:false};
 const clauses=split?split.parts:[raw],removed=[],warnings=[];
 const segments=clauses.map(part=>{
   const arr=lex(part);const out=[];
   for(const word of arr){
     let w=normalize(word);
     if(["IT","ITS","THIS","THAT","THESE","THOSE"].includes(w)&&!warnings.includes("UNRESOLVED_REFERENCE"))warnings.push("UNRESOLVED_REFERENCE");
     if(["MAYBE","MIGHT","COULD","WOULD","POSSIBLY","PROBABLY"].includes(w)&&!warnings.includes("UNCERTAINTY_PRESERVED"))warnings.push("UNCERTAINTY_PRESERVED");
     if(STOP.has(w)&&!IMPORTANT.has(w)){removed.push(word.toUpperCase());continue}
     if(w===word.toUpperCase()&&/(?:ED|ING)$/.test(w)&&w.length>5&&!warnings.includes("UNKNOWN_INFLECTION_PRESERVED"))warnings.push("UNKNOWN_INFLECTION_PRESERVED")
     if(w!==word.toUpperCase())removed.push(word.toUpperCase()+"→"+w);
     if(w==="DID")continue;
     out.push(w);
   }
   return out;
 });
 const tokens=segments.flat();
 const unique=[...new Set(tokens)];
 if(split)warnings.push("ORDER_PRESERVED");
 const originalTokens=lex(raw);
 return {original:raw,compressed:segments.map(a=>a.join(" ")).filter(Boolean).join(" → ")||"∅",tokens:unique,sequence:segments,removed,warnings,originalCount:originalTokens.length,compressedCount:tokens.length,ratio:originalTokens.length?+(1-tokens.length/originalTokens.length).toFixed(3):0,temporal:split?split.relation:null};
}
function tests(){
 const cases=[
  ["drop filler","I clicked the red button.",["CLICK","RED","BUTTON"]],
  ["past tense","The webapp crashed.",["WEBAPP","CRASH"]],
  ["negation","The button didn't respond.",["BUTTON","NOT","RESPOND"]],
  ["negative contrasts","I clicked the button.",["CLICK","BUTTON"]],
  ["repeat","I tried clicking it again.",["TRY","CLICK","IT","AGAIN"]],
  ["uncertainty","The window might open.",["WINDOW","MIGHT","OPEN"]],
  ["actor distinction","He clicked the button.",["HE","CLICK","BUTTON"]],
  ["unexpected changes","I did not click Seven.",["NOT","CLICK","SEVEN"]],
  ["sun result","Word now says Sun.",["WORD","NOW","SAY","SUN"]],
  ["unknown verb protected","The star glided near the canvas.",["STAR","GLIDED","NEAR","CANVAS"]],
  ["ability vs action","I cannot click the button.",["CANNOT","CLICK","BUTTON"]],
  ["logical alternatives","red or blue",["RED","OR","BLUE"]],
  ["stare is not star","I stared at the Sun.",["STARE","SUN"]]
 ];
 const checks=cases.map(([name,input,expected])=>{
  const got=compile(input);
  return {name,pass:JSON.stringify(got.tokens)===JSON.stringify(expected),got:got.compressed};
 });
 for(const [name,input,expected] of [
   ["after-order","I saw the Sun after clicking Seven.","CLICK SEVEN → SEE SUN"],
   ["before-order","I clicked Seven before I saw Sun.","CLICK SEVEN → SEE SUN"],
   ["then-order","I clicked Seven and then Sun appeared.","CLICK SEVEN → SUN APPEAR"],
   ["negated temporal","I clicked the button not after the screen changed.","CLICK BUTTON NOT AFTER SCREEN CHANGE"]
 ]){const got=compile(input);checks.push({name,pass:got.compressed===expected,got:got.compressed})}
 const a=compile("The button did not respond"),b=compile("The button responded");
 checks.push({name:"negation separation",pass:a.tokens.includes("NOT")&&!b.tokens.includes("NOT"),got:a.compressed+" ≠ "+b.compressed});
 const before=compile("An error appeared before clicking the button.");
 checks.push({name:"original preserved",pass:before.original==="An error appeared before clicking the button.",got:before.original});
 return {passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
}
root.Caveman=Object.freeze({compile,tests,version:"0.3"});
})(window);