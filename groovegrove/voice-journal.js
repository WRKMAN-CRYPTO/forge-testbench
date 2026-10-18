/*
 * Murmur's vocal notebook. Every entry is grounded in notes actually
 * scheduled by the simulation. Memories grow; the detail window stays small.
 */
const COUNT_MAX=1000000000;
const number=(v,f=0)=>Number.isFinite(v)?Math.max(0,Math.min(COUNT_MAX,Math.floor(v))):f;
const vowels=new Set(['m','u','o','a','i']);
export class VoiceJournal {
  constructor(saved=null){
    this.attempts=number(saved?.attempts);
    this.notes=number(saved?.notes);
    this.phrases=number(saved?.phrases);
    this.experiments=number(saved?.experiments);
    this.responses=number(saved?.responses);
    this.motifRepeats=number(saved?.motifRepeats);
    this.sharedPhrases=number(saved?.sharedPhrases);
    this.firstSharedPhrase=saved?.firstSharedPhrase||null;
    this.partnerReplies={Pip:number(saved?.partnerReplies?.Pip),Riff:number(saved?.partnerReplies?.Riff)};
    this.firstPartnerReply={
      Pip:saved?.firstPartnerReply?.Pip||null,
      Riff:saved?.firstPartnerReply?.Riff||null
    };
    this.recentReplies=Array.isArray(saved?.recentReplies)?saved.recentReplies.slice(0,12):[];
    this.learnedVowels={m:0,u:0,o:0,a:0,i:0};
    for(const vowel of vowels)this.learnedVowels[vowel]=number(saved?.learnedVowels?.[vowel]);
    this.firstVowel=saved?.firstVowel||null;
    this.firstPhrase=saved?.firstPhrase||null;
    this.firstMotif=saved?.firstMotif||null;
    this.firstResponse=saved?.firstResponse||null;
    this.studies=Array.isArray(saved?.studies)?saved.studies.filter(x=>x&&typeof x.title==='string').slice(0,12):[];
    this.recent=Array.isArray(saved?.recent)?saved.recent.filter(x=>
      x&&Number.isFinite(x.bar)&&Array.isArray(x.pitches)&&x.pitches.length<=8
    ).slice(0,28).map(x=>({...x,pitches:[...x.pitches]})):[];
  }
  sound(event){
    const bar=Number.isFinite(event?.bar)?event.bar:0;
    const pitches=Array.isArray(event?.pitches)?event.pitches.filter(n=>Number.isFinite(n)&&n>0).slice(0,8):[];
    if(!pitches.length)return;
    const vowel=vowels.has(event.vowel)?event.vowel:'m';
    const kind=event.kind==='motif'?'motif':event.kind==='phrase'?'phrase':'hum';
    const response=event.response==='Riff'||event.response==='Pip'?event.response:null;
    const repeated=!!event.repeated;
    this.attempts++;
    this.notes+=pitches.length;
    if(pitches.length>1)this.phrases++;
    if(vowel!=='m' || pitches.length>1 || kind==='motif')this.experiments++;
    if(response)this.responses++;
    if(event.ensemble){
      this.sharedPhrases++;
      if(!this.firstSharedPhrase)
        this.firstSharedPhrase={bar,with:response||'the nearby musicians',pitch:pitches[0]};
    }
    if(repeated)this.motifRepeats++;
    this.learnedVowels[vowel]=(this.learnedVowels[vowel]||0)+pitches.length;
    const item={bar,vowel,kind,response,repeated,ensemble:!!event.ensemble,pitches:pitches.map(n=>Math.round(n*10)/10)};
    if(vowel!=='m'&&!this.firstVowel)this.firstVowel={bar,vowel,pitch:item.pitches[0]};
    if(pitches.length>1&&!this.firstPhrase)this.firstPhrase={bar,pitches:[...item.pitches]};
    if(kind==='motif'&&!this.firstMotif)this.firstMotif={bar,pitches:[...item.pitches]};
    if(response&&!this.firstResponse)this.firstResponse={bar,with:response,pitches:[...item.pitches]};
    this.recent.unshift(item);
    if(this.recent.length>28)this.recent.length=28;
  }
  partnerReply({bar,partner,kind,pitch}){
    if(!['Pip','Riff'].includes(partner))return;
    this.partnerReplies[partner]++;
    const reply={bar,partner,kind,pitch:Number.isFinite(pitch)?pitch:null};
    if(!this.firstPartnerReply[partner])this.firstPartnerReply[partner]={...reply};
    this.recentReplies.unshift(reply);
    if(this.recentReplies.length>12)this.recentReplies.length=12;
  }
  study({bar,title,skill}){
    this.studies.unshift({bar,title,skill});
    if(this.studies.length>12)this.studies.length=12;
  }
  snapshot(){return {
    attempts:this.attempts,notes:this.notes,phrases:this.phrases,experiments:this.experiments,
    responses:this.responses,motifRepeats:this.motifRepeats,sharedPhrases:this.sharedPhrases,
    firstSharedPhrase:this.firstSharedPhrase?{...this.firstSharedPhrase}:null,
    partnerReplies:{...this.partnerReplies},
    firstPartnerReply:Object.fromEntries(['Pip','Riff'].map(n=>[n,this.firstPartnerReply[n]?{...this.firstPartnerReply[n]}:null])),
    recentReplies:this.recentReplies.map(e=>({...e})),learnedVowels:{...this.learnedVowels},
    firstVowel:this.firstVowel?{...this.firstVowel}:null,
    firstPhrase:this.firstPhrase?{...this.firstPhrase,pitches:[...this.firstPhrase.pitches]}:null,
    firstMotif:this.firstMotif?{...this.firstMotif,pitches:[...this.firstMotif.pitches]}:null,
    firstResponse:this.firstResponse?{...this.firstResponse,pitches:[...this.firstResponse.pitches]}:null,
    studies:this.studies.map(e=>({...e})),recent:this.recent.map(e=>({...e,pitches:[...e.pitches]}))
  };}
  report(){return {
    notes:this.notes,attempts:this.attempts,phrases:this.phrases,experiments:this.experiments,
    responses:this.responses,motifRepeats:this.motifRepeats,sharedPhrases:this.sharedPhrases,
    firstSharedPhrase:this.firstSharedPhrase,partnerReplies:{...this.partnerReplies},
    firstPartnerReply:{...this.firstPartnerReply},recentReplies:this.recentReplies.slice(0,5),
    vowels:{...this.learnedVowels},
    firstVowel:this.firstVowel,firstPhrase:this.firstPhrase,firstMotif:this.firstMotif,
    firstResponse:this.firstResponse,studies:this.studies.slice(0,5),recent:this.recent.slice(0,5)
  };}
}
