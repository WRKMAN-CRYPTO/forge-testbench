import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {LiveNoteConductor} from '../live-note-conductor.js';
import {Grove} from '../grove-core.js';

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

test('Murmur gets a caption only after he actually schedules vocal notes',()=>{
  const grove=new Grove();
  const journalBefore=grove.voiceJournal.snapshot();
  const emissions=[],sung=[];
  grove.onTalk=(from,message)=>emissions.push({from,message});
  grove.vocalist.stage='humming';
  grove.vocalist.curiosity=1;
  grove.vocalist.lastAttemptBar=-20;
  const original=Math.random;
  Math.random=()=>0;
  try{
    grove.onBeatEvent(0,2,{
      voice:(...args)=>sung.push(args),guitar(){},kick(){},snare(){},hat(){},violin(){}
    });
    assert.ok(sung.length>0);
    assert.equal(grove.voiceJournal.notes,journalBefore.notes+sung.length);
    assert.ok(emissions.some(e=>e.from==='Murmur'&&e.message.startsWith('♪')));
    assert.deepEqual(grove.voiceJournal.snapshot().firstPhrase,journalBefore.firstPhrase);
  }finally{Math.random=original;}
});

test('Murmur can choose to join a real heard musician and receive a bubble',()=>{
  const grove=new Grove(),heard=[];
  grove.onTalk=(from,message)=>heard.push({from,message});
  grove.bar=100;grove.vocalist.stage='humming';grove.vocalist.curiosity=1;
  grove.space.people.Pip.lastChoice=100;
  grove.space.people.Riff.lastChoice=100;
  grove.space.sound('Riff','guitar',100,1,220);
  const actual=grove.space.people.Murmur.lastHeardGuitar;
  assert.equal(actual.from,'Riff');
  const original=Math.random;Math.random=()=>0;
  try{
    grove.space.decide(grove);
    assert.equal(grove.space.people.Murmur.ensembleIntent,'joining');
    assert.ok(heard.some(e=>e.from==='Murmur'&&e.message.includes('Riff')));
  }finally{Math.random=original;}
});

test('Murmur taking a voluntary listening break is visible, not compulsory singing',()=>{
  const grove=new Grove(),heard=[];
  grove.onTalk=(from,message)=>heard.push({from,message});
  grove.bar=100;grove.vocalist.stage='humming';grove.vocalist.curiosity=1;
  grove.space.people.Pip.lastChoice=100;
  grove.space.people.Riff.lastChoice=100;
  const p=grove.space.people.Murmur;
  p.ensembleIntent='joining';p.lastEnsembleChoice=1;
  grove.space.sound('Riff','guitar',100,1,220);
  const journal=grove.voiceJournal.snapshot(),original=Math.random;
  Math.random=()=>0;
  try{
    grove.space.decide(grove);
    assert.equal(p.ensembleIntent,'listening');
    assert.ok(heard.some(e=>e.from==='Murmur'&&/listen/i.test(e.message)));
    assert.deepEqual(grove.voiceJournal.snapshot(),journal);
  }finally{Math.random=original;}
});

test('No spontaneous Murmur bubble when silent and no actual musical action',()=>{
  const grove=new Grove(),heard=[];
  grove.onTalk=(from,message)=>heard.push({from,message});
  grove.vocalist.stage='silent';
  grove.onBeatEvent(0,2,{
    voice(){throw Error('A silent Murmur must not be forced to sing');},
    guitar(){},kick(){},snare(){},hat(){},violin(){}
  });
  assert.ok(!heard.some(e=>e.from==='Murmur'));
});

test('The same live transport accepts Murmur without changing audio scheduling',()=>{
  assert.match(server,/\['Pip','Riff','Murmur'\]\.includes\(source\)/);
  assert.match(html,/\['Pip','Riff','Murmur'\]\.includes\(from\)/);
  assert.match(html,/talkBubble\.from==='Riff'\?ui\.riffPos:ui\.vocalPos/);
  const scheduler=new LiveNoteConductor();
  const played=[];
  const packet={serverNow:12000,events:[
    {seq:1,kind:'speech',atMs:12000,source:'Murmur',
      message:'♪ Answering Riff in melody'},
    {seq:2,kind:'voice',atMs:12100,source:'Murmur',
      freq:220,volume:.5,duration:.3}
  ]};
  assert.equal(scheduler.receive(packet,{
    context:{state:'running',currentTime:10},sentAtMs:1,receivedAtMs:40,
    play:event=>played.push(event.kind)
  }),1);
  assert.deepEqual(played,['voice']);
  assert.equal(scheduler.stats.invalid,0);
});
