import { useEffect, useRef, useState } from 'react';

export default function AutoAdvance({delay,onDelayChange,onNext,suspended=false}:{delay:0|5|10;onDelayChange:(delay:0|5|10)=>void;onNext:()=>void;suspended?:boolean}) {
 const [remaining,setRemaining]=useState<number>(delay);
 const [paused,setPaused]=useState(false);
 const fired=useRef(false);
 useEffect(()=>{setRemaining(delay);setPaused(false);fired.current=false;},[delay]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)setPaused(true);};
  document.addEventListener('visibilitychange',hide);
  return ()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 useEffect(()=>{
  if(!delay||paused||suspended||document.hidden||fired.current)return;
  if(remaining<=0){fired.current=true;onNext();return;}
  const timer=window.setTimeout(()=>setRemaining(value=>Math.max(0,value-1)),1000);
  return ()=>window.clearTimeout(timer);
 },[delay,paused,suspended,remaining,onNext]);
 return <div className="auto-advance">
  <label>Otomatik geçiş<select value={delay} onChange={event=>{const value=Number(event.target.value) as 0|5|10;setRemaining(value);setPaused(false);onDelayChange(value);}}><option value={5}>5 saniye</option><option value={10}>10 saniye</option><option value={0}>Kapalı</option></select></label>
  {!!delay&&<><span>{paused?`Durduruldu · ${remaining} sn kaldı`:`${remaining} sn sonra devam edilecek`}</span><button className="secondary" type="button" onClick={()=>setPaused(value=>!value)}>{paused?'Geri sayımı sürdür':'Durdur'}</button></>}
 </div>;
}
