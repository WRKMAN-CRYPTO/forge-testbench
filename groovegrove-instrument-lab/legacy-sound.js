/* Exact, unmodified GrooveGrove SoundEngine class from grove index.html.
   Isolated laboratory copy; NEVER replace the production renderer or mutate its
   recordings. Baseline is meant to sound exactly as existing GrooveGrove does.
*/
const beatDur=60/98;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class SoundEngine {
  constructor(){this.context=null;this.master=null;this.mix=null;this.noise=null;this.timer=null;this.beat=0;this.nextTime=0;}
  makeContext(){
    // Never reset the musical beat when rebuilding the AUDIO graph.
    if(this.timer){clearInterval(this.timer);this.timer=null;}
    const old=this.context;
    this.context=null;
    // Closing can hang in WebKit after a phone call. Do not await it.
    if(old && old.state!=='closed'){try{Promise.resolve(old.close()).catch(()=>{});}catch(e){}}
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)throw new Error('Web Audio is not supported on this device.');
    const ctx=new Ctx();
    this.context=ctx;
    this.master=ctx.createGain();this.master.gain.value=0.58;
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-12;limiter.knee.value=15;limiter.ratio.value=3.5;
    this.master.connect(limiter);limiter.connect(ctx.destination);
    // Technical balance, separate from musical dynamics chosen by agents.
    // Drum peaks no longer occupy the entire mix; melodic voices stay present.
    this.mix={};
    for(const [instrument,level] of Object.entries({drums:.57,guitar:1.34,voice:1.72,violin:1.08})){
      const bus=ctx.createGain();
      bus.gain.value=level;
      bus.connect(this.master);
      this.mix[instrument]=bus;
    }
    const len=Math.round(ctx.sampleRate*.3);
    this.noise=ctx.createBuffer(1,len,ctx.sampleRate);
    const data=this.noise.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=Math.random()*2-1;
  }
  async start(onBeat,{fresh=false,chime=false,passive=false}={}){
    this.onBeat=onBeat;
    // WebKit may fall back to its ringer/ambient channel after an iOS call,
    // silently muting a perfectly "running" AudioContext. Use media playback.
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
    if(fresh || !this.context || this.context.state==='closed')this.makeContext();
    const ctx=this.context;
    // Called directly from the pointerdown handler; don't defer resume()
    // past the user-activation window on iOS.
    if(ctx.state!=='running'){
      // Safari sometimes creates a suspended graph even during pointerdown.
      // Start a near-silent, short oscillator synchronously within that same
      // user gesture BEFORE awaiting resume(). Do not autoplay music.
      try{
        const pulse=ctx.createOscillator(),gain=ctx.createGain();
        gain.gain.value=.000001;pulse.frequency.value=440;
        pulse.connect(gain);gain.connect(ctx.destination);
        pulse.start(ctx.currentTime);pulse.stop(ctx.currentTime+.025);
      }catch(e){}
      const attempt=ctx.resume();
      const resumed=await Promise.race([
        Promise.resolve(attempt).then(()=>true),
        new Promise(resolve=>setTimeout(()=>resolve(false),2800))
      ]);
      if(!resumed && ctx.state!=='running')throw new Error('Audio is blocked by iOS. Tap AUDIO again.');
    }
    if(ctx!==this.context)return;
    if(ctx.state!=='running')throw new Error('Audio is '+ctx.state+'. Tap AUDIO to reconnect.');
    if(passive && this.timer){clearInterval(this.timer);this.timer=null;}
    if(!passive && !this.timer){
      this.nextTime=ctx.currentTime+.12;
      this.timer=setInterval(()=>this.schedule(),23);
      this.schedule();
    }
    // An audible soft confirmation note when the player explicitly repairs audio.
    if(chime)this.tone(587.33,ctx.currentTime+.035,.17,.065,'sine',0);
  }
  schedule(){
    const ctx=this.context;
    if(!ctx || ctx.state!=='running')return;
    // Skip old beats before scheduling after iOS audio interruptions.
    if(this.nextTime<ctx.currentTime-.15)this.nextTime=ctx.currentTime+.08;
    let steps=0;
    while(this.nextTime<ctx.currentTime+.18 && steps++<32){
      this.onBeat(this.beat,this.nextTime);
      this.beat++;this.nextTime+=beatDur;
    }
  }
  tone(freq,time,duration,level,shape='triangle',pan=0,destination=null){
    const ctx=this.context;if(!ctx)return;
    const t=Math.max(ctx.currentTime+.002,time);
    const osc=ctx.createOscillator(),gain=ctx.createGain(),low=ctx.createBiquadFilter();
    osc.type=shape;osc.frequency.setValueAtTime(freq,t);
    low.type='lowpass';low.frequency.setValueAtTime(shape==='sine'?4000:2400,t);
    low.frequency.exponentialRampToValueAtTime(500,t+duration);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+.009);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(low);low.connect(gain);
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;gain.connect(p);p.connect(destination||this.master);}else gain.connect(destination||this.master);
    osc.start(t);osc.stop(t+duration+.02);
  }
  noiseHit(time,duration,level,highpass=1200,pan=-.25,destination=null){
    const ctx=this.context,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();
    const t=Math.max(ctx.currentTime+.002,time);
    src.buffer=this.noise;filter.type='highpass';filter.frequency.value=highpass;
    env.gain.setValueAtTime(Math.max(.001,level),t);
    env.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(filter);filter.connect(env);
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;env.connect(p);p.connect(destination||this.master);}else env.connect(destination||this.master);
    src.start(t);src.stop(t+duration+.005);
  }
  voice(freq,t,volume=.15,duration=.5,expression={}){
    const ctx=this.context;if(!ctx||ctx.state!=='running')return;
    // A single oscillator bank is sculpted by vowel-specific vocal formants.
    // No speech, recordings or text: this is a synthesized musical instrument.
    const vowels={
      m:[[300,.53],[870,.24],[2180,.13]],
      u:[[360,.5],[760,.28],[2320,.11]],
      o:[[490,.54],[920,.25],[2500,.1]],
      a:[[810,.44],[1320,.3],[2720,.16]],
      i:[[300,.39],[2230,.32],[2930,.15]]
    };
    const choice=Object.prototype.hasOwnProperty.call(vowels,expression?.vowel)?expression.vowel:'m';
    const specs=vowels[choice];
    // Per-musician natural timbre, separate from learned singing skill.
    // The legacy path (Murmur) retains the exact original synthesis values.
    const profile=expression?.voiceprint;
    const distinct=profile?.version===1&&Number.isFinite(profile.formant)&&
      Number.isFinite(profile.brightness)&&Number.isFinite(profile.warmth)&&
      Number.isFinite(profile.air);
    const onset=Math.max(ctx.currentTime+.003,t);
    const len=clamp(Number.isFinite(duration)?duration:.5,.17,3.3);
    const pitch=clamp(Number.isFinite(freq)?freq:220,100,750);
    const glide=clamp(Number.isFinite(expression?.glide)?expression.glide:0,-2,2);
    const attack=clamp(Number.isFinite(expression?.attack)?expression.attack:.075,.025,Math.min(.26,len*.33));
    const release=clamp(Number.isFinite(expression?.release)?expression.release:.08,.035,Math.min(.42,len*.35));
    const peak=Math.max(.0009,volume*.62);
    const env=ctx.createGain();
    env.gain.setValueAtTime(.0001,onset);
    env.gain.exponentialRampToValueAtTime(peak,onset+attack);
    env.gain.linearRampToValueAtTime(peak*.75,onset+Math.max(attack+.004,len-release));
    env.gain.exponentialRampToValueAtTime(.0001,onset+len);
    env.connect(this.mix?.voice||this.master);
    for(const [index,[formant,mix]] of specs.entries()){
      const oscillator=ctx.createOscillator();
      const filter=ctx.createBiquadFilter();
      const weight=ctx.createGain();
      oscillator.type='sawtooth';
      oscillator.frequency.setValueAtTime(pitch*Math.pow(2,glide/12),onset);
      oscillator.frequency.linearRampToValueAtTime(pitch,onset+Math.min(.23,len*.55));
      if(len>1.15){
        // A restrained pitch breath is audible on a held vowel, not an
        // artificial constant vibrato imposed on every little hum.
        oscillator.frequency.linearRampToValueAtTime(pitch*1.003,onset+len*.72);
        oscillator.frequency.linearRampToValueAtTime(pitch,onset+len*.93);
      }
      filter.type='bandpass';
      filter.frequency.setValueAtTime(formant*(distinct?clamp(profile.formant,.75,1.3):1),onset);
      filter.Q.value=choice==='m'?3.5:2.7;
      weight.gain.value=distinct?mix*(index===0?clamp(profile.warmth,.5,1.5):
        index===2?clamp(profile.brightness,.5,1.5):1):mix;
      oscillator.connect(filter);filter.connect(weight);weight.connect(env);
      oscillator.start(onset);oscillator.stop(onset+len+.025);
    }
    // Soft audible breath for phrased entrances, without vocal syllables.
    if(attack>.09 && this.noise){
      const breath=ctx.createBufferSource(),high=ctx.createBiquadFilter(),air=ctx.createGain();
      breath.buffer=this.noise;high.type='highpass';high.frequency.value=1700;
      air.gain.setValueAtTime(.0001,onset);
      air.gain.linearRampToValueAtTime(Math.max(.0002,volume*.035*(distinct?clamp(profile.air,.5,1.5):1)),onset+.025);
      air.gain.exponentialRampToValueAtTime(.0001,onset+attack);
      breath.connect(high);high.connect(air);air.connect(this.mix?.voice||this.master);
      breath.start(onset);breath.stop(onset+attack+.01);
    }
  }
  kick(t,volume=1){
    const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
    t=Math.max(ctx.currentTime+.002,t);osc.type='sine';
    osc.frequency.setValueAtTime(160,t);osc.frequency.exponentialRampToValueAtTime(48,t+.17);
    gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.65*volume,t+.008);
    gain.gain.exponentialRampToValueAtTime(.001,t+.28);
    osc.connect(gain);gain.connect(this.mix?.drums||this.master);osc.start(t);osc.stop(t+.3);
  }
  snare(t,volume=1){
    const bus=this.mix?.drums||this.master;
    this.noiseHit(t,.16,.21*volume,900,-.35,bus);
    this.tone(185,t,.12,.12*volume,'triangle',-.35,bus);
  }
  hat(t,volume=1){this.noiseHit(t,.045,.049*volume,5400,-.25,this.mix?.drums||this.master);}
  guitar(freq,t,volume=1,duration=.34){
    const ctx=this.context;if(!ctx)return;
    const bus=this.mix?.guitar||this.master;
    const len=clamp(Number.isFinite(duration)?duration:.34,.12,3.5);
    // Short picked notes still have a real attack and decay.
    if(len<.78){
      this.tone(freq,t,len,.148*volume,'triangle',.34,bus);
      this.tone(freq*2,t+.003,Math.min(len,.26),.033*volume,'sine',.35,bus);
      return;
    }
    // Held string voicing: attack, stable body, deliberate note-off.
    // Unlike a longer pluck envelope this remains audible throughout a chord.
    const onset=Math.max(ctx.currentTime+.003,t);
    const release=Math.min(.39,len*.22);
    const oscillator=ctx.createOscillator(),upper=ctx.createOscillator();
    const harmonic=ctx.createGain(),filter=ctx.createBiquadFilter(),envelope=ctx.createGain();
    oscillator.type='triangle';oscillator.frequency.setValueAtTime(freq,onset);
    upper.type='sine';upper.frequency.setValueAtTime(freq*2.003,onset);
    harmonic.gain.value=.25;
    oscillator.connect(filter);upper.connect(harmonic);harmonic.connect(filter);
    filter.type='lowpass';filter.frequency.setValueAtTime(1950,onset);
    filter.frequency.linearRampToValueAtTime(1300,onset+Math.min(.44,len*.34));
    envelope.gain.setValueAtTime(.0001,onset);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,.13*volume),onset+.03);
    envelope.gain.linearRampToValueAtTime(Math.max(.00015,.085*volume),onset+len-release);
    envelope.gain.exponentialRampToValueAtTime(.0001,onset+len);
    filter.connect(envelope);
    if(ctx.createStereoPanner){
      const pan=ctx.createStereoPanner();pan.pan.value=.32;
      envelope.connect(pan);pan.connect(bus);
    }else envelope.connect(bus);
    oscillator.start(onset);upper.start(onset);
    oscillator.stop(onset+len+.035);upper.stop(onset+len+.035);
    // A small pick transient keeps the held chord recognizably Riff's.
    this.tone(freq*2,onset+.004,.16,.018*volume,'sine',.33,bus);
  }
  violin(freq,t,volume=.24,duration=.95,expression={}){
    const ctx=this.context;if(!ctx||ctx.state!=='running')return;
    const onset=Math.max(ctx.currentTime+.003,t);
    const len=clamp(Number.isFinite(duration)?duration:.95,.28,2.8);
    const pitch=clamp(Number.isFinite(freq)?freq:262,125,950);
    const rough=clamp(Number.isFinite(expression?.roughness)?expression.roughness:.27,0,.7);
    const pressure=clamp(Number.isFinite(expression?.pressure)?expression.pressure:.58,.15,1);
    const vibrato=clamp(Number.isFinite(expression?.vibrato)?expression.vibrato:0,0,.012);
    const bus=this.mix?.violin||this.master;
    // Bowed string: the note has a moving bow, sustained tone and true release,
    // not a plucked oscillator with a longer timer.
    const body=ctx.createOscillator(),edge=ctx.createOscillator();
    const edgeGain=ctx.createGain(),color=ctx.createBiquadFilter(),env=ctx.createGain();
    body.type='sawtooth';edge.type='triangle';
    body.frequency.setValueAtTime(pitch,onset);
    edge.frequency.setValueAtTime(pitch*2,onset);
    if(vibrato>0 && len>.6){
      body.frequency.linearRampToValueAtTime(pitch*(1+vibrato),onset+len*.37);
      body.frequency.linearRampToValueAtTime(pitch*(1-vibrato*.65),onset+len*.65);
      body.frequency.linearRampToValueAtTime(pitch,onset+len*.94);
    }
    edgeGain.gain.value=.12+pressure*.17;
    body.connect(color);edge.connect(edgeGain);edgeGain.connect(color);
    color.type='lowpass';
    color.frequency.setValueAtTime(1900+pressure*1150,onset);
    color.frequency.linearRampToValueAtTime(1500+pressure*680,onset+Math.min(.5,len*.55));
    const attack=Math.min(.22,.082+rough*.16,len*.33);
    const release=Math.min(.31,len*.32);
    const peak=Math.max(.00012,volume*(.12+pressure*.065));
    env.gain.setValueAtTime(.0001,onset);
    env.gain.exponentialRampToValueAtTime(peak,onset+attack);
    env.gain.linearRampToValueAtTime(peak*.81,onset+len-release);
    env.gain.exponentialRampToValueAtTime(.0001,onset+len);
    color.connect(env);
    if(ctx.createStereoPanner){
      const pan=ctx.createStereoPanner();pan.pan.value=-.08;
      env.connect(pan);pan.connect(bus);
    }else env.connect(bus);
    body.start(onset);edge.start(onset);
    body.stop(onset+len+.025);edge.stop(onset+len+.025);
    // Slight bow friction is a real part of the instrument's early learning.
    if(this.noise&&rough>.06){
      const bow=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),friction=ctx.createGain();
      bow.buffer=this.noise;filter.type='bandpass';filter.frequency.value=2650;
      filter.Q.value=1.3;
      friction.gain.setValueAtTime(.0001,onset);
      friction.gain.linearRampToValueAtTime(Math.max(.00015,.016*rough*volume),onset+attack);
      friction.gain.exponentialRampToValueAtTime(.0001,onset+Math.min(.3,len*.6));
      bow.connect(filter);filter.connect(friction);friction.connect(bus);
      bow.start(onset);bow.stop(onset+Math.min(.31,len*.62));
    }
  }
}
