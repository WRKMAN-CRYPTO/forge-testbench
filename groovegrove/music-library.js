/*
 * GrooveGrove Pass 002: physical books, unique copies, exclusive borrowing,
 * independent reading choices, persistent knowledge. No DOM and no extra renderer.
 * A book teaches an actionable piece of musical vocabulary, not an arbitrary XP score.
 */
export const LIBRARY_CATALOG=Object.freeze({
  'pocket-pulse':Object.freeze({id:'pocket-pulse',title:'Pocket Pulse',subtitle:'A displaced backbeat',color:0x83dbb3,skill:'offbeatPulse',topic:'rhythm',reader:'Pip',readBars:3}),
  'open-sky-chords':Object.freeze({id:'open-sky-chords',title:'Open Sky Chords',subtitle:'Four new chord voicings',color:0xf4b786,skill:'openChords',topic:'harmony',reader:'Riff',readBars:4}),
  'call-response':Object.freeze({id:'call-response',title:'Call & Response',subtitle:'Making musical space',color:0xc5afe7,skill:'callResponse',topic:'theory',reader:null,readBars:4}),
  'ghost-note-handbook':Object.freeze({id:'ghost-note-handbook',title:'Ghost Note Handbook',subtitle:'Quiet drum accents',color:0x9fd7c8,skill:'ghostNotes',topic:'rhythm',reader:'Pip',readBars:5}),
  'walking-bassline':Object.freeze({id:'walking-bassline',title:'The Walking Bassline',subtitle:'Connecting chord roots',color:0xe7bc7e,skill:'walkingBass',topic:'harmony',reader:'Riff',readBars:5}),
  'art-of-silence':Object.freeze({id:'art-of-silence',title:'The Art of Silence',subtitle:'Leaving deliberate space',color:0xb4b7e9,skill:'deliberateSpace',topic:'theory',reader:null,readBars:4}),
  'syncopation-station':Object.freeze({id:'syncopation-station',title:'Syncopation Station',subtitle:'Offbeat rhythmic phrasing',color:0xe8a0a0,skill:'syncopation',topic:'rhythm',reader:null,readBars:6}),
  'listening-musician':Object.freeze({id:'listening-musician',title:'The Listening Musician',subtitle:'Answering a partner’s phrase',color:0xa8d9f0,skill:'partnerListening',topic:'theory',reader:null,readBars:6})
});
export const BOOK_IDS=Object.keys(LIBRARY_CATALOG);
export const SHELF_CAPACITY=12;
const AGENTS=['Pip','Riff'];
const safeNumber=(value,fallback=0)=>Number.isFinite(value)?value:fallback;

export class MusicLibrary{
  constructor(saved=null){
    this.books=[];
    this.known={Pip:[],Riff:[]};
    this.activity={Pip:null,Riff:null};
    this.history=[];
    this.nextCopy=1;
    if(saved && typeof saved==='object')this.restore(saved);
  }
  restore(saved){
    this.known={Pip:[],Riff:[]};
    for(const name of AGENTS){
      if(Array.isArray(saved.known?.[name])){
        this.known[name]=[...new Set(saved.known[name].filter(s=>BOOK_IDS.some(id=>LIBRARY_CATALOG[id].skill===s)))];
      }
    }
    const used=new Set(), slots=new Set();
    if(Array.isArray(saved.books)){
      for(const raw of saved.books.slice(0,SHELF_CAPACITY)){
        if(!LIBRARY_CATALOG[raw?.type] || typeof raw?.copyId!=='string' || used.has(raw.copyId))continue;
        const slot=Number(raw.slot);
        if(!Number.isInteger(slot)||slot<0||slot>=SHELF_CAPACITY||slots.has(slot))continue;
        used.add(raw.copyId);slots.add(slot);
        const state=['shelf','carried','reading','returning'].includes(raw.state)?raw.state:'shelf';
        const owner=AGENTS.includes(raw.owner)?raw.owner:null;
        this.books.push({copyId:raw.copyId,type:raw.type,slot,state:owner?state:'shelf',owner,progress:Math.max(0,Math.min(20,safeNumber(raw.progress)))});
      }
    }
    this.nextCopy=Math.max(1,Math.min(99999,Math.floor(safeNumber(saved.nextCopy,1))));
    for(const name of AGENTS){
      const book=this.books.find(b=>b.owner===name);
      // Recovery is based on actual book ownership, not arbitrary claims by readers.
      if(book){
        const original=saved.activity?.[name];
        const allowed=['carried','reading','returning'];
        const stage=allowed.includes(original?.stage)?original.stage:book.state;
        const ticks=Math.max(0,Math.min(20,Math.floor(safeNumber(original?.ticks))));
        this.activity[name]={copyId:book.copyId,stage,ticks};
        book.state=stage;
      }
    }
    // If an invalid save gave two books to the same reader, return the extras.
    for(const book of this.books){
      if(book.owner && this.activity[book.owner]?.copyId!==book.copyId){
        book.owner=null;book.state='shelf';book.progress=0;
      }
    }
  }
  snapshot(){
    return {books:this.books.map(b=>({...b})),known:{Pip:[...this.known.Pip],Riff:[...this.known.Riff]},activity:JSON.parse(JSON.stringify(this.activity)),nextCopy:this.nextCopy};
  }
  donate(type){
    if(!LIBRARY_CATALOG[type])return {ok:false,reason:'Unknown book'};
    if(this.books.some(b=>b.type===type))return {ok:false,reason:'One copy already in the grove'};
    // First three original works belong to the original cabinet. New volumes
    // are delivered to Shelf II rather than taking its older sibling's spaces.
    const shelfStart=BOOK_IDS.indexOf(type)<3?0:6;
    const slot=Array.from({length:6},(_,i)=>shelfStart+i).find(i=>!this.books.some(b=>b.slot===i));
    if(slot===undefined)return {ok:false,reason:'Every shelf slot is occupied'};
    const book={copyId:'book-'+this.nextCopy++,type,slot,state:'shelf',owner:null,progress:0};
    this.books.push(book);return {ok:true,book};
  }
  has(name,skill){return this.known[name]?.includes(skill)===true;}
  status(name){return this.activity[name];}
  busy(name){return !!this.activity[name];}
  anyBusy(){return AGENTS.some(n=>this.busy(n));}
  copyById(id){return this.books.find(book=>book.copyId===id);}
  borrow(name,book){
    if(!AGENTS.includes(name)||this.busy(name)||!book||book.state!=='shelf'||book.owner)return false;
    if(this.has(name,LIBRARY_CATALOG[book.type].skill))return false;
    book.owner=name;book.state='carried';book.progress=0;
    this.activity[name]={copyId:book.copyId,stage:'carried',ticks:0};
    return true;
  }
  choose(name,grove){
    if(this.busy(name))return;
    const candidates=this.books.filter(b=>b.state==='shelf'&&!this.has(name,LIBRARY_CATALOG[b.type].skill));
    if(!candidates.length)return;
    const scored=candidates.map(b=>{
      const def=LIBRARY_CATALOG[b.type];
      const relevant=def.reader===name?.32:def.reader===null?.17:-.16;
      const interest=(name==='Pip'?grove.pip.curiosity:grove.riff.curiosity)*.32;
      return {book:b,score:relevant+interest+Math.random()*.32};
    }).sort((a,b)=>b.score-a.score);
    // Choice is probabilistic. A book being on the shelf is not an order to read.
    if(scored[0].score<.57 || Math.random()>.42)return;
    if(this.borrow(name,scored[0].book)){
      const def=LIBRARY_CATALOG[scored[0].book.type];
      const agent=name==='Pip'?grove.pip:grove.riff;
      agent.currentGoal='reading '+def.title;
      grove.push(name+' borrows '+def.title+'.');
    }
  }
  tick(grove){
    for(const name of AGENTS){
      const task=this.activity[name];
      if(!task)continue;
      const book=this.copyById(task.copyId);
      if(!book||book.owner!==name){this.activity[name]=null;continue;}
      const def=LIBRARY_CATALOG[book.type];
      // Carrying the book to the actual library is part of reading it.
      // Progress pauses while walking; never erase an interrupted chapter.
      if(grove.space && !grove.space.at(name,'library',110))continue;
      task.ticks++;
      if(task.stage==='carried' && task.ticks>=1){
        task.stage='reading';task.ticks=0;book.state='reading';
        grove.push(name+' opens '+def.title+' in the reading nook.');
      }else if(task.stage==='reading'){
        book.progress=Math.min(def.readBars,book.progress+1);
        if(book.progress>=def.readBars){
          if(!this.has(name,def.skill))this.known[name].push(def.skill);
          grove.push(name+' learned '+def.subtitle.toLowerCase()+' from '+def.title+'.');
          const agent=name==='Pip'?grove.pip:grove.riff;
          agent.remember('Read '+def.title+' and learned '+def.subtitle.toLowerCase()+'.');
          task.stage='returning';task.ticks=0;book.state='returning';
        }
      }else if(task.stage==='returning' && task.ticks>=1){
        book.state='shelf';book.owner=null;book.progress=0;
        this.activity[name]=null;
        (name==='Pip'?grove.pip:grove.riff).currentGoal='exploring new musical ideas';
        grove.push(name+' returns '+def.title+'. The shelf is available again.');
      }
    }
    // Pursue books only when there is room in the current musical activity.
    // Resolve sequentially: borrowing is atomic, so simultaneous interest cannot duplicate a copy.
    if(grove.mode==='solo'){
      const order=Math.random()<.5?AGENTS:[...AGENTS].reverse();
      for(const name of order)this.choose(name,grove);
    }
  }
}