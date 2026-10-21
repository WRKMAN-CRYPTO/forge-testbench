import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Grove} from '../grove-core.js';
import {musicalHistory,HISTORY_INSTRUMENTS} from '../musical-history.js';

test('Musical history includes all four disciplines without guessing performances',()=>{
  const g=new Grove(),history=musicalHistory(g,'Pip');
  assert.deepEqual(history.rows.map(x=>x.instrument),HISTORY_INSTRUMENTS);
  assert.equal(history.instrumentsPlayed,0);
  assert.equal(history.totalRecordedNotes,0);
  assert.equal(history.current,'drums');
  assert.equal(history.rows[0].current,true);
  assert.ok(history.rows.every(x=>!x.recorded&&x.firstBar===null));
  assert.equal(musicalHistory(g,'Unknown'),null);
});

test('Instrument changes never erase old played notes or their earliest saved bars',()=>{
  const g=new Grove();
  g.disciplines.record('Riff','guitar',{bar:41,pitch:220,duration:.6});
  g.disciplines.record('Riff','guitar',{bar:45,pitch:329.63,duration:.5});
  // Use the actual switch rules, not a UI-fabricated performance.
  const r=g.disciplines.people.Riff;
  r.current='violin';g.disciplines.instruments.guitar.owner=null;
  g.disciplines.instruments.violin.owner='Riff';
  g.disciplines.record('Riff','violin',{bar:75,pitch:261.63,duration:1});
  const history=musicalHistory(g,'Riff');
  assert.equal(history.instrumentsPlayed,2);
  assert.equal(history.totalRecordedNotes,3);
  assert.deepEqual(history.rows.map(x=>[x.instrument,x.notes,x.firstBar,x.current]),[
    ['drums',0,null,false],['guitar',2,41,false],['violin',1,75,true],
    ['voice',0,null,false]
  ]);
  const restored=new Grove(g.snapshot());
  assert.deepEqual(musicalHistory(restored,'Riff'),history);
});

test('Murmur voice uses the original authoritative vocal notebook, not borrowed practice',()=>{
  const g=new Grove();
  g.vocalist.firstSound={bar:11,pitch:220,attempt:1};
  g.voiceJournal.sound({bar:12,kind:'phrase',vowel:'a',
    pitches:[220,330,261.63],durations:[.4,.5,.5]});
  // Simulate a preexisting mirrored statistic. Never double-count it.
  g.disciplines.people.Murmur.practice.voice.notes=800;
  // A past genuine drum session recorded with the instrument held.
  g.disciplines.people.Murmur.current='drums';
  assert.equal(g.disciplines.record('Murmur','drums',{bar:27,duration:0}),true);
  g.disciplines.people.Murmur.current='voice';
  // The musician is now singing; the historic drum notes are still present.
  const h=musicalHistory(g,'Murmur');
  assert.equal(h.totalRecordedNotes,4);
  assert.equal(h.instrumentsPlayed,2);
  const voice=h.rows.find(x=>x.instrument==='voice');
  assert.equal(voice.notes,3);
  assert.equal(voice.firstBar,11);
  assert.equal(voice.firstLabel,'first hum');
  const drums=h.rows.find(x=>x.instrument==='drums');
  assert.equal(drums.notes,1);
  assert.equal(drums.firstBar,27);
});

test('Old counts without a saved first bar remain visible without invented timestamps',()=>{
  const saved=new Grove().snapshot();
  saved.disciplines.people.Pip.practice.guitar.notes=291;
  saved.disciplines.people.Pip.practice.guitar.firstNote=null;
  const g=new Grove(saved),h=musicalHistory(g,'Pip');
  const row=h.rows.find(x=>x.instrument==='guitar');
  assert.equal(row.notes,291);
  assert.equal(row.firstBar,null);
  assert.equal(row.firstLabel,null);
  assert.equal(h.instrumentsPlayed,1);
  assert.equal(h.totalRecordedNotes,291);
  assert.equal(new Grove(g.snapshot()).disciplines.people.Pip.practice.guitar.notes,291);
});

test('Reading a musician history is pure, preserving all existing Grove memories',()=>{
  const g=new Grove();
  g.disciplines.record('Pip','drums',{bar:5,duration:0});
  g.voiceJournal.sound({bar:5,vowel:'m',kind:'hum',pitches:[220],durations:[.4]});
  const saved=g.snapshot();
  for(const name of ['Pip','Riff','Murmur'])
    for(let i=0;i<15;i++)assert.ok(musicalHistory(g,name));
  assert.deepEqual(g.snapshot(),saved);
});

test('Canvas journals offer genuine NOTES and HISTORY controls, no retired bottom panel',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
  assert.match(html,/import \{ musicalHistory \} from '\.\/musical-history\.js'/);
  assert.match(html,/journalSection==='history'/);
  assert.match(html,/journalSectionToggle/);
  assert.match(html,/flip\.on\('pointertap'/);
  assert.match(html,/history\.rows\[i\]/);
  assert.match(html,/RECORDED DISCIPLINES/);
  assert.match(html,/Earliest saved milestones only/);
  assert.match(server,/musical-history\.js/);
});
