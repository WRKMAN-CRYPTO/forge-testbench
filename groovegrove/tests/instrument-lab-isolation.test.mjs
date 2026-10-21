import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {InstrumentLabAudio, MODELS, STUDIES, midi,ENGINE_URL} from '../../groovegrove-instrument-lab/lab-core.js';

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
 assert.match(src,/await ctx\.resume\(\)/);
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
