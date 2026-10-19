import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {LiveNoteConductor} from '../live-note-conductor.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
test('Canvas inline JavaScript parses after removal of the fixed panel',()=>{
  assert.ok(match,'Inline canvas script must remain present');
  const result=spawnSync(process.execPath,['--input-type=module','--check'],
    {input:match[1],encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
test('The woodland viewport no longer reserves space for bottom telemetry',()=>{
  assert.doesNotMatch(html,/ui\.panelY|ui\.memoryMetric|ui\.listenLabel|ui\.modeLabel/);
  assert.doesNotMatch(html,/LIVE TIMING\s+\/\s+PIP TO RIFF/);
  assert.match(html,/const viewBottom=H-24;/);
  assert.match(html,/ly<H-14/);
  assert.match(html,/makeCameraControls\(world\)/);
  assert.match(html,/makeAudioControl\(world\)/);
  assert.match(html,/makeJournalViewer\(world\)/);
});
test('Live speech comes from the real onTalk callback, not invented UI phrases',()=>{
  assert.match(server,/world\.onTalk=captureSpeech/);
  assert.match(server,/kind:'speech'/);
  assert.match(html,/if\(ev\?\.kind!=='speech'/);
  assert.match(html,/showSpeech\(ev\.source,ev\.message\)/);
  assert.match(html,/speechQueue\.shift\(\)/);
});
test('Speech packets never alter WebAudio timing or count as invalid sound',()=>{
  const conductor=new LiveNoteConductor();
  const context={state:'running',currentTime:10};
  const packet={serverNow:12000,events:[
    {seq:1,kind:'speech',atMs:12000,source:'Pip',message:'Want to jam?'},
    {seq:2,kind:'guitar',atMs:12100,source:'Riff',freq:220,volume:.5,duration:.25}
  ]};
  const played=[];
  const opts={context,sentAtMs:1,receivedAtMs:41,
    play:e=>played.push(e.kind),onNote:()=>{}};
  assert.equal(conductor.receive(packet,opts),1);
  assert.deepEqual(played,['guitar']);
  assert.equal(conductor.stats.invalid,0);
  assert.equal(conductor.receive(packet,opts),0);
});
