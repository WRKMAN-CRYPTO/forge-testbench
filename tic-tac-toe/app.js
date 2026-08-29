const STORAGE_KEY='forge-tic-tac-toe-v1';
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const eventQueue=[];
let processing=false;

const state={board:Array(9).fill(null),turn:'X',winner:null,winningCells:[],roundOver:false,scores:{X:0,O:0,draws:0},revision:0,ui:{menuOpen:false,notice:''}};
const el={board:document.querySelector('#board'),status:document.querySelector('#status'),xScore:document.querySelector('#xScore'),oScore:document.querySelector('#oScore'),drawScore:document.querySelector('#drawScore'),newRound:document.querySelector('#newRound'),menuButton:document.querySelector('#menuButton'),menu:document.querySelector('#menu'),resetScore:document.querySelector('#resetScore'),notice:document.querySelector('#notice')};

function capture(type,payload={}){eventQueue.push({type,payload});processQueue();}
function processQueue(){if(processing)return;processing=true;while(eventQueue.length){processEvent(eventQueue.shift());}processing=false;render();}
function processEvent(event){switch(event.type){case'CELL':playCell(event.payload.index);break;case'NEW_ROUND':resetRound();break;case'TOGGLE_MENU':state.ui.menuOpen=!state.ui.menuOpen;break;case'RESET_SCORE':state.scores={X:0,O:0,draws:0};state.ui.notice='Score reset';commit();break;case'VISIBILITY':if(event.payload.hidden)persist();break;case'RESTORE':state.ui.notice='';break;}}
function playCell(index){if(state.roundOver||state.board[index])return;state.board[index]=state.turn;const win=WINS.find(line=>line.every(i=>state.board[i]===state.turn));if(win){state.winner=state.turn;state.winningCells=win;state.roundOver=true;state.scores[state.turn]++;state.ui.notice=`${state.turn} takes the round`;commit();return;}if(state.board.every(Boolean)){state.roundOver=true;state.scores.draws++;state.ui.notice='Stalemate';commit();return;}state.turn=state.turn==='X'?'O':'X';commit();}
function resetRound(){state.board=Array(9).fill(null);state.turn='X';state.winner=null;state.winningCells=[];state.roundOver=false;state.ui.notice='Fresh board';commit();}
function commit(){state.revision++;persist();}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,revision:state.revision,scores:state.scores}));}catch{state.ui.notice='Score could not be saved';}}
function restore(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);if(saved.version!==1||!validScores(saved.scores))throw new Error('invalid');state.scores={...saved.scores};state.revision=Number.isInteger(saved.revision)?saved.revision:0;}catch{state.ui.notice='Saved score was invalid and ignored';}}
function validScores(s){return s&&['X','O','draws'].every(k=>Number.isInteger(s[k])&&s[k]>=0);}
function render(){el.board.innerHTML='';state.board.forEach((mark,index)=>{const button=document.createElement('button');button.className='cell'+(state.winningCells.includes(index)?' win':'');button.type='button';button.textContent=mark||'';button.setAttribute('aria-label',mark?`Cell ${index+1}: ${mark}`:`Cell ${index+1}: empty`);button.disabled=state.roundOver||Boolean(mark);button.addEventListener('click',()=>capture('CELL',{index}));el.board.append(button);});el.status.textContent=state.roundOver?(state.winner?`${state.winner} wins`:'Draw'):`${state.turn} to move`;el.xScore.textContent=state.scores.X;el.oScore.textContent=state.scores.O;el.drawScore.textContent=state.scores.draws;el.menu.hidden=!state.ui.menuOpen;el.menuButton.setAttribute('aria-expanded',String(state.ui.menuOpen));el.notice.textContent=state.ui.notice;}

el.newRound.addEventListener('click',()=>capture('NEW_ROUND'));
el.menuButton.addEventListener('click',()=>capture('TOGGLE_MENU'));
el.resetScore.addEventListener('click',()=>capture('RESET_SCORE'));
document.addEventListener('visibilitychange',()=>capture(document.hidden?'VISIBILITY':'RESTORE',{hidden:document.hidden}));
restore();render();
