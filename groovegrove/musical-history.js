/*
 * GrooveGrove musician history, read-only view over existing saved evidence.
 * Counts are scheduled notes/hits, not invented skills, talent or inferred
 * performances. Old memories may predate detailed first-note milestones.
 */
export const HISTORY_INSTRUMENTS=Object.freeze(['drums','guitar','violin','voice']);
const num=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const bar=n=>Number.isSafeInteger(n)&&n>=0?n:null;

export function musicalHistory(grove,name){
  const musician=grove?.disciplines?.people?.[name];
  if(!musician)return null;
  const current=grove.disciplines.current(name);
  const rows=HISTORY_INSTRUMENTS.map(instrument=>{
    const practice=musician.practice?.[instrument]||{};
    // Murmur's original voice predates the instrument borrowing system and
    // owns a separate, authoritative vocal notebook. Never double count it.
    const legacyVoice=name==='Murmur'&&instrument==='voice';
    const notes=legacyVoice?num(grove.voiceJournal?.notes):num(practice.notes);
    const savedBar=bar(practice.firstNote?.bar);
    const firstHum=legacyVoice?bar(grove.vocalist?.firstSound?.bar):null;
    const firstBar=legacyVoice?firstHum:savedBar;
    const firstLabel=legacyVoice&&firstHum!==null?'first hum':
      firstBar!==null?'first saved note':null;
    const lastBar=legacyVoice?bar(grove.vocalist?.lastAttemptBar):bar(practice.lastBar);
    return {instrument,notes,firstBar,firstLabel,lastBar,
      current:current===instrument,
      recorded:notes>0};
  });
  return {name,current,rows,
    instrumentsPlayed:rows.filter(x=>x.recorded).length,
    totalRecordedNotes:rows.reduce((sum,x)=>sum+x.notes,0),
    studies:grove.library?.known?.[name]?.length||0};
}
