import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {InstrumentLabAudio, MODELS, STUDIES, midi,ENGINE_URL,waitForAudioResume,SAMPLE_TRIM_DB,VIOLIN_TRIM_RANGE,gainForDecibels} from '../../groovegrove-instrument-lab/lab-core.js';

const from=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const legacy=from('../../groovegrove-instrument-lab/legacy-sound.js');
const html=from('../../groovegrove-instrument-lab/index.html');
const prod=from('../index.html');
const server=from('../server/index.mjs');

test('The original SoundEngine was copied exactly and remains available for historical sound comparison',()=>{
 // Freeze this snapshot's fingerprint. Future intentional modifications
 // to production GrooveGrove must not silently rewrite historic A/B baseline.
 const copy=legacy.slice(legacy.indexOf('export class SoundEngine')).replace(/^export /,'').trim();
 let hash=2166136261;
 for(let i=0;i<copy.length;i++)
   hash=Math.imul(hash^copy.charCodeAt(i),16777619)>>>0;
 assert.equal(hash.toString(16),'d64eec23');
 assert.match(copy,/class SoundEngine \{/);
 assert.match(copy,/violin\(freq,t,volume=/);
 assert.match(copy,/guitar\(freq,t,volume=/);
});

test('Separate instrument models preserve family provenance and license transparency',()=>{
 assert.deepEqual(Object.keys(MODELS).sort(),['guitar','violin']);
 assert.match(ENGINE_URL,/smplr@1\.1\.0/);
 assert.equal(MODELS.guitar.license,'CC0-1.0');
 assert.equal(MODELS.violin.license,'CC0-1.0');
 assert.match(MODELS.guitar.sample,/Strumstick/);
 assert.match(MODELS.violin.sample,/Violin/);
 assert.notEqual(MODELS.guitar.preset.samples.baseUrl,MODELS.violin.preset.samples.baseUrl);
 assert.ok(MODELS.guitar.preset.samples.baseUrl.startsWith('https://'));
 assert.ok(MODELS.violin.preset.samples.baseUrl.startsWith('https://'));
 for(const model of Object.values(MODELS)){
  assert.deepEqual(model.preset.samples.formats,['wav']);
  assert.equal(model.preset.groups.length,1);
  assert.equal(model.preset.groups[0].regions.length,4);
  assert.equal(model.preset.groups[0].regions[0].keyRange[0],0);
  assert.equal(model.preset.groups[0].regions[3].keyRange[1],127);
  for(const zone of model.preset.groups[0].regions){
   assert.ok(zone.sample.length>5);
   assert.ok(Number.isInteger(zone.pitch));
   assert.ok(zone.keyRange[0]<=zone.keyRange[1]);
  }
 }
});

test('Equivalent musical events feed the legacy and recorded models',()=>{
 for(const family of ['guitar','violin']){
  for(const study of ['single','phrase','chord']){
   const notes=STUDIES[family][study];
   assert.ok(notes.length>=1);
   for(const event of notes){
    assert.ok(event.freq>40&&event.freq<900);
    assert.ok(Number.isFinite(event.at)&&event.at>=0);
    assert.ok(event.duration>0&&event.duration<=2);
    assert.ok(event.volume>0&&event.volume<=1);
    assert.ok(midi(event.freq)>=40&&midi(event.freq)<=90);
   }
  }
 }
 assert.equal(midi(440),69);
});

test('The instrument lab requires an explicit human click and never touches living GrooveGrove state',()=>{
 const src=from('../../groovegrove-instrument-lab/lab-core.js');
 assert.match(src,/async enable\(\)/);
 assert.match(src,/await waitForAudioResume\(ctx,this\.resumeTimeoutMs\)/);
 assert.match(src,/async ensureSample\(/);
 assert.match(src,/if\(this\.sampled\.has\(family\)\)/);
 assert.match(src,/await sampler\.ready/);
 assert.doesNotMatch(src,/\/v1\/(state|poll|transfer|write)/);
 assert.doesNotMatch(src,/new Grove\(/);
 assert.doesNotMatch(src,/localStorage|indexedDB|fetch\(/);
 assert.doesNotMatch(server,/groovegrove-instrument-lab/);
 // No generated memory or tape files.
 assert.doesNotMatch(src,/groovegrove-world\.json|groovegrove-memory/);
 const instance=new InstrumentLabAudio();
 assert.equal(instance.audioReady,false);
 assert.equal(instance.context,null);
 assert.equal(instance.sampled.size,0);
});

test('Canvas-only mobile user interface has A/B and three short note sequences',()=>{
 assert.match(html,/<canvas id="instrumentLab"/);
 assert.match(html,/touch-action:none/);
 assert.match(html,/ENABLE AUDIO/);
 assert.match(html,/ORIGINAL GROVE/);
 assert.match(html,/SOLO BOWED VIOLIN/);
 assert.match(html,/FINGER STRUMSTICK/);
 assert.match(html,/MELODY/);
 assert.match(html,/CHORD/);
 assert.match(html,/SAMPLED/);
 assert.match(html,/pointerdown/);
 assert.match(html,/NO AGENTS|No agents/);
 assert.doesNotMatch(html,/<(?:input|select|button|textarea)\b/i);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 assert.doesNotThrow(()=>new Function(script.replace(/^import [^\n]+\n/gm,'')));
});

test('Never-ending WebKit resume promise expires instead of freezing the canvas',async()=>{
 const hung={state:'suspended',resume:()=>new Promise(()=>{})};
 const start=Date.now();
 assert.equal(await waitForAudioResume(hung,25),false);
 assert.ok(Date.now()-start<500);
});

test('An already-running AudioContext never needs a new resume or reset',async()=>{
 const running={state:'running',resume(){throw Error('Unexpected resume');}};
 assert.equal(await waitForAudioResume(running,25),true);
});

test('A settled resume is not sufficient if WebKit audio remains suspended',async()=>{
 const suspended={state:'suspended',resume:()=>Promise.resolve()};
 assert.equal(await waitForAudioResume(suspended,25),false);
});

test('Failed iPhone audio unlock is recoverable with a fresh context on another tap',async()=>{
 const lab=new InstrumentLabAudio();
 lab.resumeTimeoutMs=25;
 let resets=0,confirmation=0,attempts=0;
 const original={
  state:'suspended',currentTime:0,destination:{},
  createOscillator:()=>({connect(){},start(){},stop(){}}),
  createGain:()=>({gain:{value:0},connect(){}}),
  resume:()=>{attempts++;return new Promise(()=>{});}
 };
 lab.engine={
  context:original,
  makeContext(){
   resets++;
   this.context={state:'running',currentTime:10};
  },
  tone(){confirmation++;}
 };
 await assert.rejects(lab.enable(),/did not unlock/);
 assert.equal(attempts,1);
 assert.equal(lab.audioReady,false);
 assert.equal(lab.rebuildOnNextEnable,true);
 assert.equal(resets,0);
 await lab.enable();
 assert.equal(resets,1);
 assert.equal(lab.audioReady,true);
 assert.equal(lab.rebuildOnNextEnable,false);
 assert.equal(confirmation,1);
});

test('iPhone UI can render an unlock failure and retry without waiting forever',()=>{
 assert.match(html,/AUDIO FIX 01B/);
 assert.match(html,/Audio blocked\. Tap ENABLE AUDIO to retry/);
 assert.match(html,/!audioReady \|\| lab\.context\?\.state!=='running'/);
 assert.match(html,/finally\{busy=false;draw\(\);\}/);
});

test('Sampled violin alone starts +12 dB with an explicit +6 to +18 dB adjustment range',()=>{
 assert.deepEqual(SAMPLE_TRIM_DB,{guitar:0,violin:12});
 assert.deepEqual(VIOLIN_TRIM_RANGE,{min:6,max:18,step:3});
 assert.equal(gainForDecibels(SAMPLE_TRIM_DB.guitar),1);
 assert.ok(Math.abs(gainForDecibels(SAMPLE_TRIM_DB.violin)-3.9810717)<0.0001);
 const lab=new InstrumentLabAudio();
 assert.equal(lab.sampleGains.size,0);
 assert.equal(lab.getSampleTrimDb('violin'),12);
 assert.equal(lab.getSampleTrimDb('guitar'),0);
 assert.equal(lab.setSampleTrimDb('violin',15),15);
 assert.equal(lab.setSampleTrimDb('violin',999),18);
 assert.equal(lab.setSampleTrimDb('violin',-999),6);
 assert.equal(lab.setSampleTrimDb('violin',12),12);
 assert.equal(lab.setSampleTrimDb('guitar',18),0);
 assert.equal(lab.getSampleTrimDb('guitar'),0);
 // Only sampled voices are routed into dedicated gain nodes.
 const source=from('../../groovegrove-instrument-lab/lab-core.js');
 assert.match(source,/trim\.gain\.value=gainForDecibels\(this\.getSampleTrimDb\(family\)\)/);
 assert.match(source,/trim\.connect\(this\.engine\.mix\[family\]\)/);
 assert.match(source,/destination:trim/);
 assert.match(source,/this\.sampleGains\.set\(family,trim\)/);
 assert.match(source,/trim\.disconnect\(\)/);
 assert.doesNotMatch(source,/this\.engine\.mix\.violin\.gain/);
 assert.match(html,/CC0 bowed violin · sampled trim \+/);
 assert.match(html,/MIX 03/);
 assert.match(html,/id:'trimDown'/);
 assert.match(html,/id:'trimUp'/);
 assert.match(html,/lab\.setSampleTrimDb\('violin',gainDb\+control\.delta\)/);
});

test('Sampled violin gain adjusts an already-loaded audio node smoothly',()=>{
 const lab=new InstrumentLabAudio();
 const called=[];
 const param={
  value:1,
  setTargetAtTime(value,time,constant){called.push([value,time,constant]);}
 };
 lab.engine.context={state:'running',currentTime:50};
 lab.sampleGains.set('violin',{gain:param});
 assert.equal(lab.setSampleTrimDb('violin',15),15);
 assert.equal(called.length,1);
 assert.ok(Math.abs(called[0][0]-gainForDecibels(15))<1e-9);
 assert.deepEqual(called[0].slice(1),[50,.025]);
 assert.equal(lab.setSampleTrimDb('violin',18),18);
 assert.equal(called.length,2);
 // The original GrooveGrove synthesis never passes through this sample node.
 assert.equal(lab.getSampleTrimDb('guitar'),0);
});
