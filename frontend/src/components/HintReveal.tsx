import { useEffect, useState, type ReactNode } from 'react';

/** Keep the panel mounted for its exit, including interrupted close/reopen actions. */
export default function HintReveal({open,children}:{open:boolean;children:ReactNode}) {
 const [present,setPresent]=useState(open);
 useEffect(()=>{
  if(open){setPresent(true);return;}
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches){setPresent(false);return;}
  const timeout=window.setTimeout(()=>setPresent(false),240);
  const changed=()=>{if(preference.matches)setPresent(false);};
  preference.addEventListener('change',changed);
  return ()=>{window.clearTimeout(timeout);preference.removeEventListener('change',changed);};
 },[open]);
 if(!open&&!present)return null;
 return <div className="hint-slot" data-state={open?'open':'closing'} aria-hidden={!open} inert={!open}
  onAnimationEnd={event=>{if(event.target===event.currentTarget&&!open)setPresent(false);}}>{children}</div>;
}
