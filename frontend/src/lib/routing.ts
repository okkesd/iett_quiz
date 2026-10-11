import { useCallback, useSyncExternalStore, type MouseEvent } from 'react';
import type { Mode } from './types';

export type View = 'home' | 'game' | 'result' | 'explore' | 'progress' | 'data' | 'about' | 'notfound';
export const PAGE_PATHS = {home:'/', explore:'/hatlar', progress:'/yolculugum', data:'/kaynaklar', about:'/hakkinda'} as const;
export type PageView = keyof typeof PAGE_PATHS;
export interface PageRoute {path:string; view:View; mode?:Mode; id?:string}
const modes:Mode[] = ['quick','daily','survival','expert','district','duel'];
const eventName = 'son-durak:navigate';

export function parseRoute(path:string):PageRoute {
 const normalized=path.replace(/\/+$/,'')||'/';
 const page=Object.entries(PAGE_PATHS).find(([,value])=>value===normalized);
 if(page)return {path:normalized,view:page[0] as PageView};
 const match=normalized.match(/^\/([a-z]+)\/([a-zA-Z0-9-]{1,100})(\/sonuc)?$/);
 if(match&&modes.includes(match[1] as Mode))return {path:normalized,view:match[3]?'result':'game',mode:match[1] as Mode,id:match[2]};
 return {path:normalized,view:'notfound'};
}
export function quizPath(mode:Mode,id:string,result=false){return `/${mode}/${encodeURIComponent(id)}${result?'/sonuc':''}`;}
export function navigatePath(path:string,replace=false){
 if(location.pathname+location.search+location.hash===path)return;
 window.history[replace?'replaceState':'pushState'](null,'',path);
 window.dispatchEvent(new Event(eventName));
}
export function openQuiz(mode:Mode,id:string,result=false,replace=false){navigatePath(quizPath(mode,id,result),replace);}
function subscribe(listener:()=>void){
 window.addEventListener('popstate',listener);window.addEventListener(eventName,listener);
 return ()=>{window.removeEventListener('popstate',listener);window.removeEventListener(eventName,listener);};
}
export function usePageRoute(){
 const path=useSyncExternalStore(subscribe,()=>location.pathname+location.search);
 const route=parseRoute(path.split('?')[0]);
 const navigate=useCallback((view:PageView)=>navigatePath(PAGE_PATHS[view]),[]);
 return {route,navigate};
}
export function handlePageLink(event:MouseEvent<HTMLAnchorElement>,navigate:()=>void){
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();navigate();
}
