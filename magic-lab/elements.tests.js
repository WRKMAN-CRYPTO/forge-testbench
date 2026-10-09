/* WRKMAN ELEMENTS / 019 deterministic offline material-interaction checks.
 * Run node magic-lab/elements.tests.js
 * Exercises temperatures and physical fields, never a hardcoded combo recipe.
 */
"use strict";
const E=require("./elements.js");
let passed=0;
const test=(name,condition)=>{if(!condition)throw new Error("FAIL: "+name);passed++};
function chamber(){
 const body={position:{x:430,y:270},velocity:{x:0,y:0},gameTag:"enemy",labAlive:true,mass:2};
 const enemy={body,type:"charger",r:26,alive:true,hp:300,staggerUntil:0};
 const scene={time:{now:0},actors:[enemy],projectiles:[],frosts:[],wells:[],
   combat:{enemies:[enemy],fields:[]},matter:{}};
 E.reset(scene);
 return {scene,body,enemy};
}
function tick(s,steps,delta=50,combat){
 for(let i=0;i<steps;i++){s.time.now+=delta;E.step(s,s.time.now,delta,combat);}
}
test("bounded cloud count",E.MAX_CLOUDS===14);
test("bounded flash count",E.MAX_FLASHES===14);
const a=chamber();
test("dry initial world",E.snapshot(a.scene).clouds===0);
a.scene.frosts=[{x:430,y:270,r:152}];
tick(a.scene,52);
const m=a.scene.elementWorld.states.get(a.body);
const originalIce=m.ice,originalTemp=m.temperature;
test("cold field actually lowers temperature",originalTemp< -15);
test("water freezes into ice",originalIce>.32);
test("ice slows enemy agency",a.enemy.staggerUntil>0);
a.scene.frosts=[];
a.scene.combat.fields=[{x:430,y:270,r:130}];
tick(a.scene,47);
const vapor=E.snapshot(a.scene);
test("heat restores above boiling threshold",m.temperature>60);
test("ice physically melts",m.ice<originalIce);
test("steam emitted when water heats",vapor.clouds>0&&vapor.volume>.13);
test("cloud is spatial and has finite radius",a.scene.elementWorld.clouds[0].radius>30);
const hits={count:0,hitEnemy(s,e,damage){this.count++;e.hp-=damage}};
const dry=chamber();dry.scene.time.now=1000;
const drySpark=E.discharge(dry.scene,430,260,hits);
test("dry discharge not vapor amplified",drySpark.vapor===0&&drySpark.radius===36);
const wetSpark=E.discharge(a.scene,430,260,hits);
test("wet vapor allows spherical conduction",wetSpark.vapor>0&&wetSpark.radius>drySpark.radius);
test("vapor arcs can damage occupants",wetSpark.hits>0);
const flash=a.scene.elementWorld.flashes[0];
test("electrical flash carries humidity provenance",flash.wet===true);
const cloud=a.scene.elementWorld.clouds[0],vx=cloud.vx;
E.impulse(a.scene,cloud.x-35,cloud.y,100);
test("blast physically pushes vapor",cloud.vx>vx);
const previousX=cloud.x;
a.scene.wells=[{x:800,y:200,r:850}];
tick(a.scene,6);
test("vapor follows wind or gravity",cloud.x!==previousX);
test("vapor has a finite expiry",Number.isFinite(cloud.until)&&cloud.until<100000);
const c=chamber();c.scene.combat.fields=[{x:430,y:270,r:130}];
tick(c.scene,55);
test("water evaporates with heat even without prior frost",E.snapshot(c.scene).clouds>0);
const noWater=chamber();
const state=noWater.scene.elementWorld;
E.step(noWater.scene,50,50);
const dryState=state.states.get(noWater.body);
dryState.liquid=0;dryState.ice=0;
noWater.scene.combat.fields=[{x:430,y:270,r:130}];
tick(noWater.scene,48);
test("dry hot material cannot create steam",E.snapshot(noWater.scene).clouds===0);
const f=chamber();const active=f.scene.elementWorld;
const template={x:350,y:270,vx:0,vy:0,mass:.5,heat:80,radius:52,born:0,until:6000,chargedUntil:0,nextScald:400};
for(let i=0;i<24;i++)active.clouds.push({...template,id:i+1,x:100+i*25});
tick(f.scene,1);
test("oversized clouds are culled",active.clouds.length<=E.MAX_CLOUDS);
const traceBefore=a.scene.elementWorld.clouds.length;
E.reset(a.scene);
test("arena reset clears old moisture and charged clouds",E.snapshot(a.scene).clouds===0&&traceBefore>0);
const graphics=new Proxy({}, {get(_,name){return ()=>graphics}});
E.paint(dry.scene,graphics,dry.scene.time.now);
test("effects renderer accepts dry discharge",true);
test("bounded body material state",E.MAX_BODIES<=80);
console.log("Elemental World 019: "+passed+" tests passed");
