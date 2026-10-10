import { useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { Line } from '../lib/types';
import { normalize } from '../lib/quiz';

export default function LinePicker({lines,value,onChange}:{lines:Line[];value:string;onChange:(code:string)=>void}) {
 const id=useId();
 const trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const selected=lines.find(line=>line.code===value);
 const filtered=useMemo(()=>{
  const terms=normalize(query.trim()).split(/\s+/).filter(Boolean);
  return lines.filter(line=>terms.every(term=>normalize(`${line.code} ${line.name}`).includes(term)))
   .sort((a,b)=>Number(normalize(b.code)===normalize(query.trim()))-Number(normalize(a.code)===normalize(query.trim())));
 },[lines,query]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 return <div className="line-picker" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();close();}}}>
  <span id={`${id}-label`}>Hattını seç</span>
  <button ref={trigger} type="button" className="line-picker-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={open?`${id}-panel`:undefined} onClick={()=>{setOpen(!open);setQuery('');}}>
   <span id={`${id}-value`}>{selected?`${selected.code} · ${selected.name}`:'Hat seç'}</span><ChevronDown size={17}/>
  </button>
  {open&&<div id={`${id}-panel`} className="line-picker-panel">
   <label className="line-picker-search"><Search size={17}/><span className="sr-only">Hat kodu veya adıyla ara</span><input autoFocus type="search" placeholder="Hat kodu veya adı…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
   <p className="line-picker-count" role="status">{filtered.length?`${filtered.length} hat bulundu`:'Hat bulunamadı. Başka bir kod veya ad dene.'}</p>
   <div className="line-picker-results" role="group" aria-label="Bulunan hatlar">
    {filtered.map(line=><button type="button" key={line.code} aria-pressed={value===line.code} onClick={()=>{onChange(line.code);close();}}><span><strong>{line.code}</strong><span>{line.name}</span></span>{value===line.code&&<Check size={17}/>}</button>)}
   </div>
  </div>}
 </div>;
}
