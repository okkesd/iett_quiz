import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Pause, Play } from 'lucide-react';

const DELAY=10;
export default function AutoAdvance({onNext,suspended=false,label='Sonraki soru'}:{onNext:()=>void;suspended?:boolean;label?:string}) {
 const [remaining,setRemaining]=useState(DELAY);
 const [paused,setPaused]=useState(false);
 const fired=useRef(false);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)setPaused(true);};
  document.addEventListener('visibilitychange',hide);
  return ()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 useEffect(()=>{
  if(paused||suspended||document.hidden||fired.current)return;
  if(remaining<=0){fired.current=true;onNext();return;}
  const timer=window.setTimeout(()=>setRemaining(value=>Math.max(0,value-1)),1000);
  return ()=>window.clearTimeout(timer);
 },[paused,suspended,remaining,onNext]);
 const advance=()=>{if(suspended||fired.current)return;fired.current=true;onNext();};
 return <div className="auto-advance" data-state={paused||suspended?'paused':'running'}>
  <button className="primary auto-next" type="button" disabled={suspended} onClick={advance}>{label}<ChevronRight size={18}/></button>
  <div className="auto-countdown">
   <span className="auto-timer" role="timer" aria-label={`${remaining} saniye kaldı${paused?' · Durduruldu':suspended?' · Bekleniyor':''}`}>
    <svg viewBox="0 0 44 44" aria-hidden="true"><circle className="auto-timer-track" cx="22" cy="22" r="19"/><circle className="auto-timer-progress" cx="22" cy="22" r="19" pathLength="100" strokeDasharray="100" strokeDashoffset={100-remaining/DELAY*100}/></svg>
    <strong aria-hidden="true">{remaining}<small>sn</small></strong>
   </span>
   <button className="auto-pause" type="button" disabled={suspended} aria-label={paused?'Geri sayımı sürdür':'Geri sayımı durdur'} onClick={()=>setPaused(value=>!value)}>
    {paused?<Play size={15}/>:<Pause size={15}/>} {paused?'Sürdür':'Durdur'}
   </button>
  </div>
 </div>;
}
