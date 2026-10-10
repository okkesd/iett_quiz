import { useEffect,useState, type FormEvent } from 'react';
import { Award, Flame, Ticket, Trophy } from 'lucide-react';
import { BADGES } from '../lib/storage';
import type { Difficulty, Mode } from '../lib/types';
import { api, MODE_NAMES, type HistoryItem, type Leaderboard, type ProfileData } from './api';

export default function Account({profile,history,onProfile,onResume,onRefresh}:{profile:ProfileData;history:HistoryItem[];onProfile:(value:ProfileData)=>void;onResume:(id:string)=>void;onRefresh:()=>Promise<void>}){
 const [name,setName]=useState(profile.profile.display_name),[visible,setVisible]=useState(profile.profile.leaderboard_visible);
 const [mode,setMode]=useState<Mode>('daily'),[difficulty,setDifficulty]=useState<Difficulty>('easy');
 const [leaders,setLeaders]=useState<Leaderboard|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const [older,setOlder]=useState<HistoryItem[]>([]),[more,setMore]=useState(history.length===100);
 useEffect(()=>{setName(profile.profile.display_name);setVisible(profile.profile.leaderboard_visible);},[profile.profile.display_name,profile.profile.leaderboard_visible]);
 useEffect(()=>{setOlder([]);setMore(history.length===100);},[history]);
 useEffect(()=>{
  const ctrl=new AbortController();setLeaders(null);
  void api<Leaderboard>(`/v1/leaderboard?mode=${mode}&difficulty=${mode==='daily'?'easy':difficulty}`,{signal:ctrl.signal}).then(setLeaders).catch(e=>{if(!ctrl.signal.aborted)setError((e as Error).message);});
  return ()=>ctrl.abort();
 },[mode,difficulty,revision]);
 async function save(event:FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
  try{await api('/v1/me',{method:'PATCH',body:{display_name:name,leaderboard_visible:visible}});const updated=await api<ProfileData>('/v1/me');onProfile(updated);setMessage('Profilin kaydedildi.');setRevision(n=>n+1);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function loadMore(){
  if(busy)return;setBusy(true);setError('');
  try{const data=await api<{games:HistoryItem[]}>(`/v1/me/sessions?limit=100&offset=${history.length+older.length}`);setOlder(list=>[...list,...data.games]);setMore(data.games.length===100&&history.length+older.length+100<=10000);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const all=[...history,...older];
 return <>
  <div className="page-heading"><div><div className="eyebrow">YOLCULUĞUM</div><h1>Her turda bir durak ileri.</h1><p>Skorların, günlük serin ve rozetlerin.</p></div><Trophy size={36}/></div>
  {error&&<p className="notice error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
  <div className="progress-summary"><div className="rank-card"><span className="avatar big">{profile.rank[0]}</span><div><h2>{profile.rank}</h2><p>{profile.profile.xp} XP</p></div></div><div className="stat-card"><Flame/><strong>{profile.streak}</strong><span>günlük seri</span></div><div className="stat-card"><Ticket/><strong>{profile.completed_games}</strong><span>tamamlanan tur</span></div></div>
  <details className="account-settings"><summary>Profil ve görünürlük</summary><form onSubmit={event=>void save(event)}><label>Görünen ad<input value={name} maxLength={40} required onChange={e=>setName(e.target.value)}/></label><label className="checkbox-label"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/> Liderlik tablosunda görünen adımla yer almak istiyorum.</label><button className="primary" disabled={busy}>Kaydet</button></form></details>
  <div className="section-heading"><h2>Yolculuk rozetlerin</h2><span>{profile.badges.length} / {BADGES.length}</span></div><div className="badge-grid">{BADGES.map(b=><div key={b.id} className={`badge-card ${profile.badges.includes(b.id)?'unlocked':''}`}><Award size={29}/><strong>{b.name}</strong><p>{b.description}</p><span>{profile.badges.includes(b.id)?'Kazanıldı':'Henüz açılmadı'}</span></div>)}</div>
  <div className="section-heading"><h2>Turların</h2><button className="text-button" disabled={busy} onClick={()=>{setBusy(true);void onRefresh().catch(e=>setError((e as Error).message)).finally(()=>setBusy(false));}}>Yenile</button></div>
  {all.length?<div className="table-wrap"><table><thead><tr><th>Tarih</th><th>Mod</th><th>Sonuç</th><th>Puan</th><th>XP</th><th>İpucu</th><th/></tr></thead><tbody>{all.map(game=><tr key={game.id}><td>{new Date(game.created_at).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}</td><td>{MODE_NAMES[game.mode]}<small>{game.difficulty==='hard'?'Zor':'Kolay'}</small></td><td>{game.result?`${game.result.correct}/${game.result.total}`:game.deadline&&Date.parse(game.deadline)<=Date.now()?'Süresi doldu':'Devam ediyor'}</td><td>{game.result?.score??'—'}</td><td>{game.result?.xp??'—'}</td><td>{game.result?.hints_used??'—'}</td><td><button className="text-button" onClick={()=>onResume(game.id)}>{game.result?'Sonucu gör':'Turu aç'}</button></td></tr>)}</tbody></table></div>:<p className="empty-state">İlk turunu tamamladığında burada göreceksin.</p>}
  {more&&<button className="secondary" disabled={busy} onClick={()=>void loadMore()}>Daha eski turlar</button>}
  <div className="section-heading"><h2>Liderlik tablosu</h2><span>{leaders?.day??'Bugün'}</span></div><div className="leaderboard-filters"><label>Oyun<select value={mode} onChange={e=>setMode(e.target.value as Mode)}>{Object.entries(MODE_NAMES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{mode!=='daily'&&<label>Zorluk<select value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}><option value="easy">Kolay</option><option value="hard">Zor</option></select></label>}</div>
  {!leaders?<p>Skorlar yükleniyor…</p>:leaders.entries.length?<div className="table-wrap"><table><thead><tr><th>Sıra</th><th>Oyuncu</th><th>Puan</th></tr></thead><tbody>{leaders.entries.map((entry,i)=><tr key={i}><td>{entry.rank}</td><td>{entry.display_name}</td><td>{entry.score}</td></tr>)}</tbody></table></div>:<p className="empty-state">Bu seçimde henüz paylaşılan skor yok.</p>}
 </>;
}
