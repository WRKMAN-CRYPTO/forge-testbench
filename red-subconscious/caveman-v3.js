/* CAVEMAN v0.3 — inspectable, reversible lexical attention filter.
   Never alters the source text. Heuristics are deliberately conservative.
   Standalone: no network, model, or task-specific vocabulary needed. */
(function(root){
"use strict";
const STOP=new Set("A AN THE I ME MY MINE AM IS ARE WAS WERE BE BEEN BEING DO DOES DID HAVE HAS HAD OF IN ON AT BY AS TO FOR WITH FROM INTO UP DOWN ABOUT THAN AND OR IF VERY JUST REALLY QUITE SOME ANY ANOTHER".split(" "));
const IRREGULAR={CLICKED:"CLICK",CLICKING:"CLICK",CRASHED:"CRASH",CRASHING:"CRASH",PRESSED:"PRESS",PRESSING:"PRESS",CHANGED:"CHANGE",CHANGING:"CHANGE",RENAMED:"RENAME",RENAMING:"RENAME",APPEARED:"APPEAR",APPEARING:"APPEAR",RESPONDED:"RESPOND",RESPONDING:"RESPOND",OPENED:"OPEN",OPENING:"OPEN",CLOSED:"CLOSE",CLOSING:"CLOSE",BECAME:"BECOME",BECOMES:"BECOME",SAYS:"SAY",SAID:"SAY",SAW:"SEE",SEEN:"SEE",WENT:"GO",GONE:"GO",TOOK:"TAKE",GIVEN:"GIVE",GAVE:"GIVE",WROTE:"WRITE",WRITTEN:"WRITE",DREW:"DRAW",DRAWN:"DRAW",RAN:"RUN",RUNNING:"RUN",FOUND:"FIND",THOUGHT:"THINK",THINKING:"THINK",TRIED:"TRY",TRYING:"TRY",FAILED:"FAIL",FAILING:"FAIL",TURNED:"TURN",TURNING:"TURN",TYPED:"TYPE",TYPING:"TYPE",WORKED:"WORK",WORKING:"WORK",LOADED:"LOAD",LOADING:"LOAD",BROKE:"BREAK",BROKEN:"BREAK",FELL:"FALL",FALLEN:"FALL",WON:"WIN",LOST:"LOSE",DIDNT:"NOT",DOESNT:"NOT",DONT:"NOT",CANT:"NOT",CANNOT:"NOT",COULDNT:"NOT",WOULDNT:"NOT",WONT:"NOT",ISNT:"NOT",ARENT:"NOT",WASNT:"NOT",WERENT:"NOT",HASNT:"NOT",HAVENT:"NOT",HADNT:"NOT",SHOULDNT:"NOT",MUSTNT:"NOT",NEVER:"NOT",NO:"NOT",NOTHING:"NOTHING",DID:"DID",STARS:"STAR",WORDS:"WORD",BUTTONS:"BUTTON"};
const IMPORTANT=new Set(["NOT","NO","ONLY","AGAIN","BEFORE","AFTER","THEN","UNTIL","UNLESS","WITHOUT","EXCEPT","MAYBE","MIGHT","COULD","SHOULD","MUST","WILL","WOULD","IF","BUT","INSTEAD","FIRST","LAST","ALWAYS","NEVER","SOMETIMES","REPEAT","RETRY","OTHER","SAME","DIFFERENT","HE","SHE","THEY","YOU","WE","IT","ITS","THIS","THAT","THESE","THOSE"]);
function normalize(word){
 let w=String(word).toUpperCase().replace(/[’']/g,"");
 if(IRREGULAR[w])return IRREGULAR[w];
 if(w.endsWith("IES")&&w.length>=6)return w.slice(0,-3)+"Y";
 if(w.endsWith("ING")&&w.length>=7){let b=w.slice(0,-3);if(/(.)\1$/.test(b)&&!/(SS|LL)$/.test(b))b=b.slice(0,-1);return b}
 if(w.endsWith("ED")&&w.length>=6){const b=w.slice(0,-2);if(/(.)\1$/.test(b)&&!/(SS|LL)$/.test(b))return b.slice(0,-1);if(b.endsWith("V")||b.endsWith("G"))return b+"E";return b}
 if(w.endsWith("ES")&&w.length>=6&&/(SHES|CHES|XES|ZES)$/.test(w))return w.slice(0,-2);
 if(w.endsWith("S")&&w.length>5&&!/(SS|US|IS|OUS)$/.test(w))return w.slice(0,-1);
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
 const after=raw.match(/^(.+?)\s+after\s+(.+?)[.!?]*$/i);
 const before=raw.match(/^(.+?)\s+before\s+(.+?)[.!?]*$/i);
 const then=raw.match(/^(.+?)\s+(?:and\s+then|then)\s+(.+?)[.!?]*$/i);
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
  ["sun result","Word now says Sun.",["WORD","NOW","SAY","SUN"]]
 ];
 const checks=cases.map(([name,input,expected])=>{
  const got=compile(input);
  return {name,pass:JSON.stringify(got.tokens)===JSON.stringify(expected),got:got.compressed};
 });
 for(const [name,input,expected] of [
   ["after-order","I saw the Sun after clicking Seven.","CLICK SEVEN → SEE SUN"],
   ["before-order","I clicked Seven before I saw Sun.","CLICK SEVEN → SEE SUN"],
   ["then-order","I clicked Seven and then Sun appeared.","CLICK SEVEN → SUN APPEAR"]
 ]){const got=compile(input);checks.push({name,pass:got.compressed===expected,got:got.compressed})}
 const a=compile("The button did not respond"),b=compile("The button responded");
 checks.push({name:"negation separation",pass:a.tokens.includes("NOT")&&!b.tokens.includes("NOT"),got:a.compressed+" ≠ "+b.compressed});
 const before=compile("An error appeared before clicking the button.");
 checks.push({name:"original preserved",pass:before.original==="An error appeared before clicking the button.",got:before.original});
 return {passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
}
root.Caveman=Object.freeze({compile,tests,version:"0.3"});
})(window);