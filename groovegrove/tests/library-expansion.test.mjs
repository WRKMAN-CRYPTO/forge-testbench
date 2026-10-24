import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MusicLibrary,LIBRARY_CATALOG,BOOK_IDS,SHELF_CAPACITY,EXPANSION_BOOK_IDS} from '../music-library.js';
import {Grove} from '../grove-core.js';
import {PitchRecall} from '../pitch-recall.js';
import {PitchMemory} from '../pitch-memory.js';
import {PLACES} from '../grove-world.js';

const originals=BOOK_IDS.slice(0,11);
const newcomers=['the-second-answer','motifs-in-motion','the-bows-voice'];
test('The new edition has three distinct real study topics and an eighteen-slot physical shelf',()=>{
 assert.equal(BOOK_IDS.length,14);
 assert.equal(SHELF_CAPACITY,18);
 assert.deepEqual(EXPANSION_BOOK_IDS,newcomers);
 assert.equal(new Set(BOOK_IDS).size,14);
 assert.deepEqual(newcomers.map(id=>LIBRARY_CATALOG[id].skill),
   ['secondAnswer','motifMotion','bowVoice']);
 assert.ok(newcomers.every(id=>LIBRARY_CATALOG[id].readBars>=8));
 assert.ok(newcomers.every(id=>!originals.includes(id)));
});

test('Migrating an existing inhabited library installs new titles without moving a single old book',()=>{
 const base=new Grove(),library=new MusicLibrary();
 for(const id of originals)assert.equal(library.donate(id).ok,true,id);
 const reading=library.books.find(b=>b.type==='open-sky-chords');
 assert.equal(library.borrow('Riff',reading),true);
 reading.state='reading';reading.progress=3;
 library.activity.Riff.stage='reading';library.activity.Riff.ticks=2;
 library.known.Pip=['offbeatPulse','ghostNotes'];
 const original=library.snapshot(),saved=base.snapshot();
 saved.library=original;
 const migrated=new Grove(saved),books=migrated.library.books;
 assert.equal(books.length,14);
 assert.deepEqual(books.slice(0,original.books.length),original.books);
 assert.deepEqual(books.slice(original.books.length).map(b=>({type:b.type,slot:b.slot})),
   newcomers.map((type,i)=>({type,slot:15+i})));
 assert.deepEqual(migrated.library.activity,original.activity);
 assert.deepEqual(migrated.library.known.Pip,original.known.Pip);
 assert.deepEqual(new Grove(migrated.snapshot()).library.snapshot(),migrated.library.snapshot());
 for(const id of newcomers)
   assert.equal(migrated.library.donate(id).ok,false,'duplicate donation blocked');
 assert.equal(new Set(books.map(b=>b.copyId)).size,books.length);
 assert.equal(new Set(books.map(b=>b.slot)).size,books.length);
 assert.ok(books.every(b=>b.slot>=0&&b.slot<SHELF_CAPACITY));
});

test('An unopened volume remains on the shelf until an independent musician decides to borrow it',()=>{
 const grove=new Grove(),bookId='the-bows-voice';
 assert.equal(grove.library.books.length,0); // no fake reader or automated ceremony in a new world
 assert.equal(grove.library.donate(bookId).ok,true);
 const book=grove.library.books[0];
 assert.equal(book.slot,17);
 assert.equal(grove.library.has('Murmur','bowVoice'),false);
 assert.equal(book.owner,null);assert.equal(book.state,'shelf');
 grove.mode='jam'; // isolate actual reading from spontaneous new borrowing
 assert.equal(grove.library.borrow('Murmur',book),true);
 grove.space.people.Murmur.x=PLACES.library.x;
 grove.space.people.Murmur.y=PLACES.library.y;
 grove.space.people.Murmur.place='library';
 grove.space.people.Murmur.destination='library';
 grove.space.people.Murmur.route=[];
 for(let i=0;i<LIBRARY_CATALOG[bookId].readBars+4;i++)
   grove.library.tick(grove);
 assert.equal(grove.library.has('Murmur','bowVoice'),true);
 assert.equal(grove.library.status('Murmur'),null);
 assert.equal(book.owner,null);
 assert.equal(book.state,'shelf');
 assert.equal(grove.library.has('Pip','bowVoice'),false);
 const learned=new Grove(grove.snapshot());
 assert.equal(learned.library.has('Murmur','bowVoice'),true);
 assert.equal(learned.library.books.filter(b=>b.type===bookId).length,1);
});

test('Motifs in Motion transforms real long-term contours without editing original ear records',()=>{
 const ear=new PitchMemory();
 ear.remember('Pip','seq4:200:200:-400',10,'Riff');
 ear.remember('Pip','seq4:200:200:-400',13,'Riff');
 const before=ear.snapshot(),recall=new PitchRecall(ear,null,()=>0);
 const direct=recall.choose('Pip',4,false);
 assert.deepEqual(direct.offsets,[0,200,400,0]);
 const moved=recall.choose('Pip',4,true);
 assert.equal(moved.key,direct.key);
 assert.deepEqual(moved.offsets,[0,-200,-400,0]);
 assert.equal(moved.variant,'inversion');
 assert.equal(recall.report('Pip').revisits,0);
 assert.deepEqual(ear.snapshot(),before);
});

test('A second answer is possible only after a genuine reply and never by proximity alone',()=>{
 const grove=new Grove();
 const heard={from:'Riff',kind:'guitar',pitch:220,bar:102};
 assert.equal(grove.canContinueReply('Murmur',heard,103),false);
 grove.noteMusicalReply('Riff','Murmur',101,'guitar');
 assert.equal(grove.canContinueReply('Murmur',heard,103),true);
 assert.equal(grove.canContinueReply('Murmur',{...heard,from:'Pip'},103),false);
 assert.equal(grove.canContinueReply('Pip',heard,103),false);
 assert.equal(grove.canContinueReply('Murmur',heard,108),false);
 assert.equal(grove.canContinueReply('Murmur',{...heard,bar:100},103),false);
 assert.equal(grove.musicalReplies.continuations.Murmur,0);
 grove.noteMusicalReply('Murmur','Riff',103,'voice',true);
 assert.equal(grove.musicalReplies.continuations.Murmur,1);
 assert.equal(grove.canContinueReply('Riff',{from:'Murmur',bar:103,pitch:240},104),true);
 const saved=grove.snapshot(),restored=new Grove(saved);
 assert.deepEqual(restored.musicalReplies,grove.musicalReplies);
 assert.equal(restored.musicalReplies.continuations.Murmur,1);
});

test('The Bow\'s Voice produces a real expressive violin note, not instant instrument mastery',()=>{
 const make=(withBook)=>{
  const grove=new Grove(),p=grove.disciplines.people.Pip;
  p.current='violin';grove.disciplines.instruments.drums.owner=null;
  grove.disciplines.instruments.violin.owner='Pip';
  if(withBook)grove.library.known.Pip.push('bowVoice');
  return grove;
 };
 const play=grove=>{
  const audio=[],old=Math.random;
  Math.random=()=>0;
  try{
   grove.disciplines.play(grove,0,300,
     {violin:(...args)=>audio.push(args),guitar(){},voice(){},kick(){},snare(){},hat(){}},
     {harmony:[196,246.94,293.66]});
  }finally{Math.random=old;}
  return audio;
 };
 const control=make(false),educated=make(true);
 const oldSounds=play(control),newSounds=play(educated);
 assert.ok(oldSounds.length>0&&newSounds.length>0);
 assert.ok(newSounds[0][4].pressure<oldSounds[0][4].pressure);
 assert.ok(newSounds[0][4].roughness<oldSounds[0][4].roughness);
 assert.match(educated.disciplines.people.Pip.practice.violin.lastArticulation,/bow/);
 assert.equal(educated.disciplines.people.Pip.practice.violin.notes,
   control.disciplines.people.Pip.practice.violin.notes);
 assert.equal(educated.disciplines.people.Pip.practice.violin.motorJitterMs,
   control.disciplines.people.Pip.practice.violin.motorJitterMs);
});

test('Single-canvas UI has an independently accessible shelf and a three-tab mobile delivery tray',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/ui\.newShelfBounds=/);
 assert.match(html,/book\.slot>=15/);
 assert.match(html,/deliveryCategory='new'/);
 assert.match(html,/BOOK_IDS\.slice\(11\)/);
 assert.match(html,/LIBRARY  0 \/ 18/);
 assert.match(html,/book\.slot-15/);
 assert.match(html,/grove-core\.js\?v=20261024-library-expansion/);
 assert.doesNotMatch(html,/<button|<select|<input/i);
});
