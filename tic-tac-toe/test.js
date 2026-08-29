const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('app.js','utf8');
const listeners={};
const makeEl=()=>({textContent:'',hidden:false,innerHTML:'',disabled:false,className:'',setAttribute(){},addEventListener(){},append(){}});
const els=new Map();
const document={hidden:false,querySelector(sel){if(!els.has(sel))els.set(sel,makeEl());return els.get(sel);},createElement(){return makeEl();},addEventListener(type,fn){listeners[type]=fn;}};
const localStorage={data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]??null;}};
const context={document,localStorage,console};vm.createContext(context);vm.runInContext(code,context);
function run(expr){return vm.runInContext(expr,context);}
function assert(condition,msg){if(!condition)throw new Error(msg);}
[0,3,1,4,2].forEach(i=>run(`capture('CELL',{index:${i}})`));
assert(run('state.winner')==='X','X should win top row');
assert(run('state.scores.X')===1,'X score should increment');
run("capture('NEW_ROUND')");
assert(run('state.board.every(v=>v===null)'),'new round should clear board');
[0,1,2,4,3,5,7,6,8].forEach(i=>run(`capture('CELL',{index:${i}})`));
assert(run('state.roundOver')===true,'draw should end round');
assert(run('state.winner')===null,'draw should have no winner');
assert(run('state.scores.draws')===1,'draw score should increment');
run("capture('RESET_SCORE')");
assert(run('state.scores.X+state.scores.O+state.scores.draws')===0,'score reset should clear all scores');
console.log('PASS: win, draw, round reset, score reset');
