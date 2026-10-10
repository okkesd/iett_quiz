import type { Answer, Config, Progress, Result } from './types';
export const PROGRESS_KEY='son-durak:progress:v1';
export const SESSION_KEY='son-durak:session:v1';
export const emptyProgress=():Progress=>({xp:0,results:[],daily:{},streak:0,lastDay:'',badges:[]});
export function read<T>(key:string,fallback:T):T{try{const value=localStorage.getItem(key);return value?JSON.parse(value) as T:fallback;}catch{return fallback;}}
export function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function loadProgress():Progress{
  const p=read<Progress|null>(PROGRESS_KEY,null);
  if(!p||!Number.isFinite(p.xp)||p.xp<0||!Array.isArray(p.results)||!p.daily||typeof p.daily!=='object'||!Array.isArray(p.badges)||!Number.isFinite(p.streak))return emptyProgress();
  const validResult=(r:Result)=>!!r&&typeof r.id==='string'&&typeof r.date==='string'&&!Number.isNaN(Date.parse(r.date))&&typeof r.day==='string'&&['quick','daily','survival','expert','district','duel'].includes(r.mode)&&['easy','hard'].includes(r.difficulty)&&[r.score,r.total,r.correct,r.xp].every(n=>Number.isFinite(n)&&n>=0)&&Array.isArray(r.answers)&&r.answers.every(a=>a&&typeof a.correct==='boolean')&&typeof r.seed==='string'&&typeof r.version==='string'&&(r.hintsUsed===undefined||(Number.isInteger(r.hintsUsed)&&r.hintsUsed>=0&&r.hintsUsed<=50));
  return {...p,results:p.results.filter(validResult).slice(0,100),daily:Object.fromEntries(Object.entries(p.daily).filter(([,r])=>validResult(r))),lastDay:typeof p.lastDay==='string'?p.lastDay:'',badges:p.badges.filter(b=>typeof b==='string')};
}
export interface Session { id:string; config:Config; version:string; engineVersion:string; day:string; answers:Answer[]; index:number; deadline:number|null; startedAt:number; hintedQuestionIds?:string[] }
export function rank(xp:number){return xp>=5000?'Hat Müdürü':xp>=2000?'Kaptan':xp>=500?'Yolcu':'Yaya';}
export const BADGES=[{id:'first',name:'İlk bilet',description:'İlk turunu tamamla.'},{id:'perfect',name:'Tam isabet',description:'En az 5 soruluk bir turu hatasız bitir.'},{id:'regular',name:'Müdavim',description:'3 gün üst üste günlük turu tamamla.'},{id:'expert',name:'Hat uzmanı',description:'Hat Uzmanı modunda en az 8 doğru yap.'},{id:'survivor',name:'Son yolcu',description:'Üç can modunda 15 doğruya ulaş.'}];
export function record(progress:Progress,result:Result):Progress{
  if(progress.results.some(r=>r.id===result.id)||(result.mode==='daily'&&progress.daily[result.day]))return progress;
  const next:Progress={...progress,xp:progress.xp+result.xp,results:[result,...progress.results].slice(0,100),daily:{...progress.daily},badges:[...progress.badges]};
  if(result.mode==='daily'){
    next.daily[result.day]=result;
    const previous=new Date(`${result.day}T12:00:00Z`);previous.setUTCDate(previous.getUTCDate()-1);
    next.streak=next.lastDay===previous.toISOString().slice(0,10)?next.streak+1:1;next.lastDay=result.day;
  }
  const award=(id:string,test:boolean)=>{if(test&&!next.badges.includes(id))next.badges.push(id);};
  award('first',true);award('perfect',result.correct===result.total&&result.total>=5);award('regular',next.streak>=3);award('expert',result.mode==='expert'&&result.correct>=8);award('survivor',result.mode==='survival'&&result.correct>=15);
  return next;
}
export function resultFrom(session:Session,total:number):Result{
  const correct=session.answers.filter(a=>a.correct).length;
  return {id:session.id,date:new Date().toISOString(),day:session.day,mode:session.config.mode,difficulty:session.config.difficulty,score:correct*(session.config.difficulty==='hard'?150:100),correct,total,xp:correct*(session.config.difficulty==='hard'?30:20)+(session.answers.length?30:0),answers:session.answers,seed:session.config.seed,version:session.version,hintsUsed:new Set(session.hintedQuestionIds||[]).size};
}
