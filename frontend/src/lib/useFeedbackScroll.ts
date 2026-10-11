import { useEffect, useRef } from 'react';

/** Reveal each answer once, without scrolling again on countdown or timer updates. */
export function useFeedbackScroll(answerKey:string|null){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!answerKey)return;
  const frame=requestAnimationFrame(()=>{
   const element=ref.current;
   if(!element)return;
   const header=document.querySelector('.topbar');
   element.style.scrollMarginTop=`${(header?.getBoundingClientRect().height??0)+20}px`;
   element.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  return ()=>cancelAnimationFrame(frame);
 },[answerKey]);
 return ref;
}
