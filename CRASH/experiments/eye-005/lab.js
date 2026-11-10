const $=id=>document.getElementById(id);
const N=8,WIDTH=32,LEFT=8,RIGHT=23,ROW=16;
let seq=createLearner(N),snap=createLearner(1),training=0,lastEval=null,last=null,busy=false,cancel=false,playToken=0;
function createLearner(n){let w=Array(n).fill(0),updates=0;return {predict(x){const z=w.reduce((s,v,i)=>s+v*x[i],0),p=1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));return {p,choice:Math.random()<p?'left':'right'}},learn(x,correct,p){const target=correct==='left'?1:0,err=target-p;w=w.map((v,i)=>v+.55*err*x[i]);updates++},state(){return {weights:[...w],updates}}}}
function sample(){
 let a=1+Math.floor(Math.random()*3),b=4+Math.floor(Math.random()*3);
 let brightness=[20+Math.floor(Math.random()*236),20+Math.floor(Math.random()*236)];
 const mode=$('environment').value;
 if(mode==='challenge'){brightness=[20+Math.floor(Math.random()*70),180+Math.floor(Math.random()*76)]}
 if(Math.random()<.5){[a,b]=[b,a];[brightness[0],brightness[1]]=[brightness[1],brightness[0]]}
 const ages=[a,b],frames=[];
 for(let t=0;t<N;t++){const frame=new Uint8ClampedArray(WIDTH*WIDTH*3);for(let i=0;i<2;i++)if(t>=ages[i]){const x=i===0?LEFT:RIGHT,j=(ROW*WIDTH+x)*3;frame[j]=frame[j+1]=frame[j+2]=brightness[i]}frames.push(frame)}
 const traces=[[],[]];for(const f of frames)for(let i=0;i<2;i++)traces[i].push(f[(ROW*WIDTH+(i===0?LEFT:RIGHT))*3]);
 const correct=ages[0]<ages[1]?'left':'right',older=correct==='left'?0:1,newer=1-older;
 return {ages,brightness,frames,traces,correct,reversal:brightness[older]<brightness[newer]};
}
function vectors(t){return {sequence:t.traces[0].map((v,i)=>(v-t.traces[1][i])/255),snapshot:[(t.traces[0][N-1]-t.traces[1][N-1])/255]}}
function attempt(train){const t=sample(),x=vectors(t),s=seq.predict(x.sequence),p=snap.predict(x.snapshot);if(train){seq.learn(x.sequence,t.correct,s.p);snap.learn(x.snapshot,t.correct,p.p);training++}last={trial:t,sequenceChoice:s.choice,snapshotChoice:p.choice};return {sequence:s.choice===t.correct,snapshot:p.choice===t.correct,reversal:t.reversal}}
function renderFrame(t,i){const ctx=$('view').getContext('2d'),image=ctx.createImageData(WIDTH,WIDTH),f=t.frames[i];for(let j=0;j<WIDTH*WIDTH;j++){image.data[j*4]=f[j*3];image.data[j*4+1]=f[j*3+1];image.data[j*4+2]=f[j*3+2];image.data[j*4+3]=255}ctx.putImageData(image,0,0);$('frameLabel').textContent='Frame '+(i+1)+' / '+N}
async function replay(){if(!last)return;const token=++playToken;for(let i=0;i<N;i++){if(token!==playToken)return;renderFrame(last.trial,i);await new Promise(r=>setTimeout(r,320))}}
function display(){if(last){const t=last.trial;$('example').textContent='Sequence chose '+last.sequenceChoice+' · snapshot chose '+last.snapshotChoice+' · ground truth '+t.correct;$('details').textContent=JSON.stringify({environment:$('environment').value,example:{onsetFrames:t.ages,originalBrightness:t.brightness,observedTraces:t.traces,older:t.correct},sequence:seq.state(),snapshot:snap.state(),evaluation:lastEval},null,2)}$('sequence').textContent=lastEval?(100*lastEval.sequence/lastEval.total).toFixed(1)+'%':'—';$('snapshot').textContent=lastEval?(100*lastEval.snapshot/lastEval.total).toFixed(1)+'%':'—';$('trained').textContent=training.toLocaleString();$('reversed').textContent=lastEval?(100*lastEval.reversals/lastEval.total).toFixed(1)+'%':'—'}
function lock(v){busy=v;for(const id of ['eval','train1','train10','environment','new'])$(id).disabled=v;$('reset').textContent=v?'Cancel and reset':'Reset learners'}
async function run(count,train){if(busy)return;cancel=false;lock(true);let done=0,s=0,p=0,r=0;if(train)lastEval=null;while(done<count&&!cancel){const batch=Math.min(200,count-done);for(let i=0;i<batch;i++){const v=attempt(train);s+=Number(v.sequence);p+=Number(v.snapshot);r+=Number(v.reversal)}done+=batch;$('status').textContent=(train?'Training ':'Evaluating ')+done.toLocaleString()+' / '+count.toLocaleString();display();await new Promise(resolve=>setTimeout(resolve,0))}
 if(!cancel){if(!train)lastEval={total:count,sequence:s,snapshot:p,reversals:r};$('status').textContent=(train?'Training':'Evaluation')+' finished';display();++playToken;renderFrame(last.trial,N-1)}lock(false)}
$('eval').onclick=()=>run(1000,false);$('train1').onclick=()=>run(1000,true);$('train10').onclick=()=>run(10000,true);
$('reset').onclick=()=>{cancel=true;seq=createLearner(N);snap=createLearner(1);training=0;lastEval=null;last=null;playToken++;$('status').textContent='Learners reset';display()};
$('environment').onchange=()=>{lastEval=null;$('status').textContent='Environment changed; evaluate again';display()};
$('new').onclick=()=>{const t=sample(),v=vectors(t),s=seq.predict(v.sequence),p=snap.predict(v.snapshot);last={trial:t,sequenceChoice:s.choice,snapshotChoice:p.choice};display();replay()};
$('replay').onclick=()=>replay();
$('export').onclick=()=>{const data={experiment:'eye-005',environment:$('environment').value,training,sequence:seq.state(),snapshot:snap.state(),evaluation:lastEval,example:last&&{onsets:last.trial.ages,brightness:last.trial.brightness,traces:last.trial.traces,groundTruth:last.trial.correct}};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='crash-eye-005.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('new').click();