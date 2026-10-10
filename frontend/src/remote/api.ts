import { createClient } from '@supabase/supabase-js';
import type { Difficulty, Kind, Mode } from '../lib/types';

export const apiBase=(import.meta.env.VITE_API_BASE_URL as string|undefined)?.replace(/\/$/,'')??'';
export const localAuth=import.meta.env.VITE_AUTH_MODE==='local';
export const localUserId='00000000-0000-0000-0000-000000000001';
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
export const configurationError=!localAuth&&(!url||!key)?'frontend/.env.local içinde Supabase ayarlarını gir veya VITE_AUTH_MODE=local kullan.':null;
// Created lazily, so a missing setting does not crash the offline application.
let client:ReturnType<typeof createClient>|undefined;
export function authClient(){
 if(configurationError)throw new Error(configurationError);
 return client??=createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}
export class ApiError extends Error { constructor(message:string,public status:number){super(message);} }
export async function api<T>(path:string,options:{method?:string;body?:unknown;public?:boolean;signal?:AbortSignal}={}):Promise<T>{
 let token:string|undefined;
 if(!options.public&&!localAuth){
  const {data,error}=await authClient().auth.getSession();
  if(error||!data.session)throw new ApiError('Oturumun sona erdi. Yeniden giriş yap.',401);
  token=data.session.access_token;
 }
 const send=(accessToken?:string)=>fetch(`${apiBase}${path}`,{
  method:options.method??'GET',cache:'no-store',signal:options.signal??AbortSignal.timeout(20000),
  headers:{...(!options.public&&localAuth?{'X-Local-Development':'true'}:{}),...(accessToken?{Authorization:`Bearer ${accessToken}`} :{}),...(options.body!==undefined?{'Content-Type':'application/json'}:{})},
  body:options.body===undefined?undefined:JSON.stringify(options.body),
 });
 try{
  let response=await send(token);
  if(response.status===401&&!options.public&&!localAuth){
   const {data,error}=await authClient().auth.refreshSession();
   if(!error&&data.session)response=await send(data.session.access_token);
  }
  if(!response.ok){
   const body=await response.json().catch(()=>null);
   throw new ApiError(body?.error?.message??(response.status===401?'Oturumun sona erdi. Yeniden giriş yap.':`İşlem tamamlanamadı (${response.status}).`),response.status);
  }
  return await response.json() as T;
 }catch(error){
  if(error instanceof ApiError)throw error;
  if(options.signal?.aborted)throw error;
  throw new Error('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
 }
}
export interface Hint {title:string;text:string;points:{lat:number;lon:number;label:string|null}[]}
export interface ServerQuestion {index:number;kind:Kind;prompt:string;options:{index:number;label:string}[];map_points:[number,number][];hint:Hint|null}
export interface Feedback {question_index:number;option_index:number;correct:boolean;correct_index:number;explanation:string;map:{line_code:string;pattern_id:string;stop_ids:string[];excluded_line:string|null;excluded_routes:string[][]}}
export interface ServerResult {id:string;mode:Mode;difficulty:Difficulty;day:string;finished_at:string;score:number;correct:number;total:number;xp:number;answered:number;hints_used:number;answers:{question_index:number;option_index:number;correct:boolean}[];network_version:string}
export interface ServerSession {id:string;mode:Mode;difficulty:Difficulty;pool_id:string;day:string;created_at:string;deadline:string|null;server_time:string;status:'active'|'expired'|'finished';network_version:string;engine_version:string;bank_version:string;total:number;answered:number;correct:number;lives:number|null;hints_used:number;question:ServerQuestion|null;last_feedback:Feedback|null;result:ServerResult|null}
export interface Catalog {network_version:string;engine_version:string;bank_version:string;pools:{id:string;name:string;scope:'all'|'region'|'line'|'district';difficulty:Difficulty;filters:{line?:string;district?:string;districts?:string[]};question_count:number;modes:Mode[]}[]}
export interface ProfileData {profile:{user_id:string;display_name:string;leaderboard_visible:boolean;xp:number};rank:string;streak:number;badges:string[];completed_games:number}
export interface HistoryItem {id:string;mode:Mode;difficulty:Difficulty;pool_id:string;created_at:string;deadline:string|null;finished_at:string|null;result:ServerResult|null}
export interface Leaderboard {day:string;mode:Mode;difficulty:Difficulty;entries:{rank:number;display_name:string;score:number}[]}
export const MODE_NAMES:Record<Mode,string>={quick:'Hızlı Tur',daily:'Günlük Rota',survival:'Son Yolcu',expert:'Hat Uzmanı',district:'Mahalleni Tanı',duel:'Arkadaş Düellosu'};
