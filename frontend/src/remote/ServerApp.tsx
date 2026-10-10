import HomeHeading from '../components/HomeHeading';
import AppFooter from '../components/AppFooter';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import type { Session as AuthSession } from '@supabase/supabase-js';
import { BusFront, CheckCircle2, ChevronRight, Clock3, Copy, Database, Flame, Gamepad2, Heart, House, Info, Lightbulb, LogOut, Moon, Route, Share2, Sun, Ticket, Trophy, Users, X } from 'lucide-react';
import type { Difficulty, Mode, Network } from '../lib/types';
import { useTheme, type Theme } from '../lib/theme';
import { istanbulDay, KIND_LABELS } from '../lib/quiz';
import { read, write } from '../lib/storage';
import type { Side } from '../lib/regions';
import HomeModes from '../components/HomeModes';
import AutoAdvance from '../components/AutoAdvance';
import RouteMap from '../components/RouteMap';
import { AboutView, DataView, Explorer } from '../LocalApp';
import Auth from './Auth';
import PointMap from './PointMap';
import Account from './Account';
import { api, authClient, configurationError, localAuth, localUserId, MODE_NAMES, type Catalog, type Feedback, type HistoryItem, type ProfileData, type ServerQuestion, type ServerSession } from './api';

type View='home'|'game'|'result'|'explore'|'progress'|'data'|'about';
const formatDate=(date:string)=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeZone:'Europe/Istanbul'}).format(new Date(date));
export default function ServerApp(){
 const {theme,toggleTheme}=useTheme();
 const [user,setUser]=useState<AuthSession|null>(null),[authReady,setAuthReady]=useState(false),[recovery,setRecovery]=useState(false);
 const [network,setNetwork]=useState<Network|null>(null),[error,setError]=useState(configurationError??'');
 useEffect(()=>{
  if(localAuth){setAuthReady(true);return;}
  if(configurationError)return;
  let live=true;
  try{
   const client=authClient();
   const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
    if(!live)return;setUser(session);setAuthReady(true);if(event==='PASSWORD_RECOVERY')setRecovery(true);
   });
   void client.auth.getSession().then(({data,error})=>{if(!live)return;if(error)setError(error.message);setUser(data.session);setAuthReady(true);}).catch(e=>{if(live)setError((e as Error).message);});
   return ()=>{live=false;subscription.unsubscribe();};
  }catch(e){setError((e as Error).message);}
 },[]);
 useEffect(()=>{
  const ctrl=new AbortController();
  void fetch('/data/network.json',{signal:ctrl.signal}).then(r=>{if(!r.ok)throw new Error('Hat verileri yüklenemedi.');return r.json();}).then((data:Network)=>{if(data.schemaVersion!==1||!data.lines?.length||!data.stops)throw new Error('Hat verisi biçimi geçersiz.');setNetwork(data);}).catch(e=>{if(!ctrl.signal.aborted)setError((e as Error).message);});
  return ()=>ctrl.abort();
 },[]);
 if(error)return <main className="loading"><h1>Bağlantı hazırlanamadı</h1><p role="alert">{error}</p><button className="primary" onClick={()=>location.reload()}>Tekrar dene</button></main>;
 if(!authReady||!network)return <main className="loading"><BusFront size={40}/><h1>Son Durak</h1><p>Yolculuğun hazırlanıyor…</p></main>;
 if(!localAuth&&(!user||recovery))return <Auth recovery={recovery} onRecovered={()=>setRecovery(false)}/>;
 return <ServerExperience key={localAuth?localUserId:user!.user.id} userId={localAuth?localUserId:user!.user.id} network={network} theme={theme} toggleTheme={toggleTheme}/>;
}

function ServerExperience({userId,network,theme,toggleTheme}:{userId:string;network:Network;theme:Theme;toggleTheme:()=>void}){
 const [view,setView]=useState<View>('home');
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[view]);
 const [catalog,setCatalog]=useState<Catalog|null>(null),[profile,setProfile]=useState<ProfileData|null>(null),[history,setHistory]=useState<HistoryItem[]>([]);
 const [difficulty,setDifficulty]=useState<Difficulty>('easy'),[lineCode,setLineCode]=useState('77A'),[district,setDistrict]=useState('Kadıköy');
 const [quickSide,setQuickSide]=useState<Side>('all'),[quickRegion,setQuickRegion]=useState('');
 const [session,setSession]=useState<ServerSession|null>(null),[question,setQuestion]=useState<ServerQuestion|null>(null),[feedback,setFeedback]=useState<Feedback|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[shareText,setShareText]=useState('');
 const [tick,setTick]=useState(Date.now()),[clockOffset,setClockOffset]=useState(0);
 const [autoDelay,setAutoDelay]=useState<0|5|10>(()=>{const v=read<number>('son-durak:auto-advance',5);return v===0||v===10?v:5;});
 const requestBusy=useRef(false),mounted=useRef(true),questionHeading=useRef<HTMLHeadingElement>(null);
 const expiryAttempt=useRef('');
 const storageKey=`son-durak:server-session:${userId}`;
 const [savedId,setSavedId]=useState<string|null>(()=>read<string|null>(storageKey,null));
 const challengeCode=useMemo(()=>new URLSearchParams(location.search).get('challenge'),[]);
 const oldChallenge=useMemo(()=>new URLSearchParams(location.search).has('duel'),[]);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
 const refresh=useCallback(async()=>{
  const [me,games]=await Promise.all([api<ProfileData>('/v1/me'),api<{games:HistoryItem[]}>('/v1/me/sessions?limit=100')]);
  if(mounted.current){setProfile(me);setHistory(games.games);}
 },[]);
 const load=useCallback(async()=>{
  try{setError('');const [data]=await Promise.all([api<Catalog>('/v1/catalog',{public:true}),refresh()]);if(mounted.current)setCatalog(data);}
  catch(e){if(mounted.current)setError((e as Error).message);}
 },[refresh]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{const timer=setInterval(()=>setTick(Date.now()),500);return ()=>clearInterval(timer);},[]);
 useEffect(()=>{if(view==='game')questionHeading.current?.focus();},[view,question?.index]);
 const run=useCallback(async(work:()=>Promise<void>)=>{
  if(requestBusy.current)return;requestBusy.current=true;setBusy(true);setError('');
  try{await work();}catch(e){if(mounted.current)setError((e as Error).message);}
  finally{requestBusy.current=false;if(mounted.current)setBusy(false);}
 },[]);
 const apply=useCallback((next:ServerSession,showQuestion=true)=>{
  if(!mounted.current)return;
  setSession(next);setClockOffset(Date.parse(next.server_time)-Date.now());setTick(Date.now());
  if(showQuestion){setQuestion(next.question);setFeedback(null);}
  const id=next.status==='finished'?null:next.id;
  setSavedId(id);write(storageKey,id);
 },[storageKey]);
 const complete=useCallback(async(id:string)=>{
  const next=await api<ServerSession>(`/v1/sessions/${id}/finish`,{method:'POST'});
  apply(next);setView('result');void refresh().catch(e=>{if(mounted.current)setError((e as Error).message);});
 },[apply,refresh]);
 const resume=useCallback((id:string)=>void run(async()=>{
  const next=await api<ServerSession>(`/v1/sessions/${id}`);
  if(next.status==='expired'){await complete(id);return;}
  apply(next);setView(next.status==='finished'?'result':'game');setShareText('');
 }),[run,complete,apply]);
 const poolId=(mode:Mode)=>{
  if(mode==='daily')return 'all/easy';
  const base=mode==='quick'?(quickSide==='all'?'all':quickRegion||quickSide):mode==='expert'?`line:${lineCode}`:mode==='district'?`district:${district}`:'all';
  return `${base}/${difficulty}`;
 };
 const matchingNetwork=catalog?.network_version===network.version;
 const canStart=(mode:Mode)=>!!matchingNetwork&&!!catalog?.pools.some(p=>p.id===poolId(mode)&&p.modes.includes(mode));
 const start=(mode:Mode,challenge?:string)=>void run(async()=>{
  if(!challenge&&!canStart(mode))throw new Error('Bu seçimde kullanılabilir soru havuzu yok. Başka bir bölge, hat veya zorluk seç.');
  const next=await api<ServerSession>('/v1/sessions',{method:'POST',body:challenge?{mode:'duel',challenge_code:challenge}:{mode,pool_id:poolId(mode)}});
  if(next.status==='expired'){await complete(next.id);return;}
  apply(next);setView(next.status==='finished'?'result':'game');setShareText('');
 });
 const restart=()=>void run(async()=>{
  if(!session)return;
  const mode=session.mode==='daily'?'quick':session.mode;
  const pool=session.mode==='daily'?'all/easy':session.pool_id.startsWith('challenge:')?`all/${session.difficulty}`:session.pool_id;
  const next=await api<ServerSession>('/v1/sessions',{method:'POST',body:{mode,pool_id:pool}});
  apply(next);setView('game');setShareText('');
 });
 const choose=useCallback((index:number)=>{
  if(!session||!question||feedback)return;
  void run(async()=>{
   const response=await api<{accepted:boolean;feedback?:Feedback;session:ServerSession}>(`/v1/sessions/${session.id}/answers`,{method:'POST',body:{question_index:question.index,option_index:index}});
   apply(response.session,false);
   if(response.accepted&&response.feedback)setFeedback(response.feedback);
   else{setQuestion(null);setFeedback(null);setView('result');}
   if(response.session.status==='finished')void refresh().catch(e=>{if(mounted.current)setError((e as Error).message);});
  });
 },[session,question,feedback,run,apply,refresh]);
 const next=useCallback(()=>{
  if(!session||!feedback||busy)return;
  setError('');
  if(session.status==='finished'){setView('result');return;}
  setQuestion(session.question);setFeedback(null);
 },[session,feedback,busy]);
 const openHint=()=>{
  if(!session||!question||question.hint||feedback)return;
  void run(async()=>{
   const result=await api<{hint:NonNullable<ServerQuestion['hint']>;hints_used:number}>(`/v1/sessions/${session.id}/hint`,{method:'POST',body:{question_index:question.index}});
   setQuestion(q=>q?.index===question.index?{...q,hint:result.hint}:q);
   setSession(s=>s?{...s,hints_used:result.hints_used,question:s.question?{...s.question,hint:result.hint}:null}:s);
  });
 };
 const seconds=session?.deadline?Math.max(0,Math.ceil((Date.parse(session.deadline)-tick-clockOffset)/1000)):null;
 useEffect(()=>{
  if(view!=='game'||!session||session.status!=='active'||seconds!==0||busy||expiryAttempt.current===session.id)return;
  expiryAttempt.current=session.id;void run(()=>complete(session.id));
 },[view,session,seconds,busy,run,complete]);
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(view!=='game'||busy||event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA|BUTTON/.test((event.target as HTMLElement).tagName))return;
   if(/^[1-4]$/.test(event.key)&&!feedback){event.preventDefault();choose(Number(event.key)-1);}
   if(event.key==='Enter'&&feedback){event.preventDefault();next();}
  };window.addEventListener('keydown',handler);return ()=>window.removeEventListener('keydown',handler);
 },[view,busy,feedback,choose,next]);
 const availableLines=useMemo(()=>new Set(catalog?.pools.filter(p=>p.scope==='line'&&p.difficulty===difficulty).map(p=>p.filters.line)),[catalog,difficulty]);
 const homeNetwork=useMemo(()=>({...network,lines:network.lines.filter(l=>availableLines.has(l.code))}),[network,availableLines]);
 const districts=useMemo(()=>catalog?.pools.filter(p=>p.scope==='district'&&p.difficulty===difficulty).map(p=>p.filters.district!).sort((a,b)=>a.localeCompare(b,'tr'))??[],[catalog,difficulty]);
 useEffect(()=>{if(homeNetwork.lines.length&&!availableLines.has(lineCode))setLineCode(homeNetwork.lines[0].code);},[homeNetwork,availableLines,lineCode]);
 useEffect(()=>{if(districts.length&&!districts.includes(district))setDistrict(districts[0]);},[districts,district]);
 const today=istanbulDay(new Date(tick+clockOffset));
 const completed=history.some(g=>g.mode==='daily'&&g.result?.day===today);
 const pending=history.filter(g=>!g.finished_at);
 const resumeId=savedId??pending[0]?.id;
 const nav=(target:View)=>{if(busy)return;setView(target);setShareText('');setError('');if(target==='progress')void refresh().catch(e=>setError((e as Error).message));};
 const copy=async(text:string)=>{setShareText(text);try{await navigator.clipboard.writeText(text);}catch{/* Visible text remains available for manual copy. */}};
 const shareDuel=()=>{if(!session)return;void run(async()=>{
  const data=await api<{challenge_code:string}>(`/v1/sessions/${session.id}/share`,{method:'POST'});
  const url=new URL(location.origin+location.pathname);url.searchParams.set('challenge',data.challenge_code);await copy(url.toString());
 });};
 const result=session?.result;
 const title=view==='explore'?'Hatları keşfet':view==='progress'?'Yolculuğum':view==='data'?'Veri ve kaynaklar':view==='about'?'Hakkımızda':'Oyun alanı';
 const points=useMemo(()=>question?.map_points.map(([lat,lon])=>({lat,lon}))??[],[question]);
 const feedbackLine=feedback?.map.excluded_line?network.lines.find(l=>l.code===feedback.map.excluded_line):undefined;
 return <div className="app-shell"><a className="skip-link" href="#main-content">İçeriğe geç</a>
  <aside className="sidebar"><button className="brand" onClick={()=>nav('home')} aria-label="Son Durak ana sayfa"><span className="brand-icon"><BusFront size={26}/></span><span>son durak<span className="brand-sub">İstanbul, oyun alanın.</span></span></button><div className="sidebar-label">KEŞFE ÇIK</div><nav className="main-nav" aria-label="Ana menü"><button className={['home','game','result'].includes(view)?'active':''} aria-label="Oyun alanı" aria-current={['home','game','result'].includes(view)?'page':undefined} onClick={()=>nav('home')}><Gamepad2 size={20}/><span>Oyun alanı</span><span className="nav-dot"/></button><button className={view==='explore'?'active':''} aria-label="Hatları keşfet" aria-current={view==='explore'?'page':undefined} onClick={()=>nav('explore')}><Route size={20}/><span>Hatları keşfet</span></button><button className={view==='progress'?'active':''} aria-label="Yolculuğum" aria-current={view==='progress'?'page':undefined} onClick={()=>nav('progress')}><Trophy size={20}/><span>Yolculuğum</span></button></nav><div className="sidebar-ticket"><Ticket size={22}/><strong>Her durak bir hikâye.</strong><p>İstanbul’u bildiğin yollardan bir de böyle keşfet.</p><span>34 <span>İSTANBUL</span></span></div><button className="source-nav" onClick={()=>nav('data')}><Database size={18}/> Veri ve kaynaklar</button><div className="sidebar-bottom"><span className="local-dot"/> {localAuth?'Yerel profil':'Hesabına bağlı'}</div></aside>
  <div className="workspace"><header className="topbar"><div className="breadcrumb"><span className="breadcrumb-city">İstanbul</span><ChevronRight size={14}/><strong>{title}</strong></div><div className="topbar-right"><button className="theme-toggle" aria-label="Koyu tema" aria-pressed={theme==='dark'} onClick={toggleTheme}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button><span className="streak"><Flame size={17}/>{profile?.streak??0}</span><button className="profile" onClick={()=>nav('progress')}><span className="avatar">{profile?.rank[0]??'Y'}</span><span>{profile?.profile.display_name??'Yolcu'}<small>{profile?.profile.xp??0} XP</small></span></button>{!localAuth&&<button className="theme-toggle" aria-label="Çıkış yap" disabled={busy} onClick={()=>void run(async()=>{const {error}=await authClient().auth.signOut();if(error)throw error;})}><LogOut size={18}/></button>}</div></header>
  <main id="main-content" tabIndex={-1} className={`main-content ${view==='home'?'home-main':view==='game'?'game-main':''}`}>
   {error&&<div className="notice error" role="alert"><p>{error}</p><button className="secondary" disabled={busy} onClick={()=>{if(view==='game'&&session)resume(session.id);else void load();}}>Yeniden yükle</button></div>}
   {view==='home'&&<><HomeHeading/>
    {oldChallenge&&<p className="notice">Bu bağlantı yerel oyun sürümüne ait. Arkadaşından yeni bir düello daveti iste.</p>}
    {challengeCode&&<div className="notice"><Users/><p>Düelloya davetlisin. Aynı soruları çöz, sonuçlarını karşılaştır.</p><button className="primary" disabled={busy} onClick={()=>start('duel',challengeCode)}>Düelloyu başlat</button></div>}
    {resumeId&&<div className="resume-bar"><Ticket size={20}/><span>Kayıtlı turuna devam edebilirsin.</span><button disabled={busy} onClick={()=>resume(resumeId)}>Devam et</button></div>}
    {!catalog?<p>Oyunlar yükleniyor…</p>:<>{!matchingNetwork&&<p className="notice error">Hat verisinin sürümü sunucuyla uyuşmuyor. Aynı veri kopyasıyla hazırlanmış sürümü kullanmalısın.</p>}<fieldset className="remote-controls" disabled={busy}><HomeModes network={homeNetwork} difficulty={difficulty} setDifficulty={setDifficulty} quickSide={quickSide} setQuickSide={setQuickSide} quickRegion={quickRegion} setQuickRegion={setQuickRegion} districts={districts} lineCode={lineCode} setLineCode={setLineCode} district={district} setDistrict={setDistrict} completed={completed} start={start} nav={()=>nav('data')} canStart={canStart}/></fieldset>{!canStart('quick')&&matchingNetwork&&<p className="notice">Bu bölge ve zorluk için yeterli soru yok. Başka bir seçim yapabilirsin.</p>}</>}
   </>}
   {view==='game'&&session&&question&&<>
    <div className="game-top"><button className="text-button" disabled={busy} onClick={()=>nav('home')}><X size={18}/> Ara ver</button><span className="chip">{MODE_NAMES[session.mode]} · {session.difficulty==='hard'?'Zor':'Kolay'}</span><div className={`timer ${seconds!==null&&seconds<=15?'urgent':''}`}>{session.mode==='quick'&&seconds!==null?<><Clock3 size={20}/>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</>:session.mode==='survival'?<><Heart size={20}/>{session.lives}<small>can</small></>:<><Trophy size={20}/>{session.correct*(session.difficulty==='hard'?150:100)}</>}</div></div>
    <div className="question-progress"><span>SORU {question.index+1} <small>/ {session.total}</small></span><div><i style={{width:`${(question.index+1)/session.total*100}%`}}/></div><span>{session.correct} doğru</span></div>
    <section className="question-card"><div className="question-kicker"><span><Route size={16}/>{KIND_LABELS[question.kind]}</span><span>{session.difficulty==='hard'?150:100} PUAN</span></div><h1 ref={questionHeading} tabIndex={-1}>{question.prompt}</h1>
     {question.kind==='map'&&<PointMap points={points} connect/>}
     {!feedback&&<div className="hint-actions"><button className="hint-button" disabled={busy||!!question.hint} onClick={openHint}><Lightbulb size={18}/>{question.hint?'İpucu açıldı':'İpucu al'}</button><span>Puan düşmez.{session.mode==='quick'?' Süre devam eder.':''}</span></div>}
     {!feedback&&question.hint&&<section className="hint-panel"><h2><Lightbulb size={19}/>{question.hint.title}</h2><p role="status">{question.hint.text}</p>{question.hint.points.length>0&&<PointMap points={question.hint.points}/>}</section>}
     <div className="answer-grid">{question.options.map(option=><button key={option.index} disabled={busy||!!feedback} className={`answer-option ${feedback?.correct_index===option.index?'correct':''} ${feedback&&!feedback.correct&&feedback.option_index===option.index?'wrong':''}`} onClick={()=>choose(option.index)}><span className="option-letter">{'ABCD'[option.index]}</span><span>{option.label}</span>{feedback?.correct_index===option.index?<CheckCircle2 size={22}/>:<span className="key-hint">{option.index+1}</span>}</button>)}</div>
     {feedback?<><div className={`answer-feedback ${feedback.correct?'success':'incorrect'}`} role="status"><div className="feedback-title"><strong>{feedback.correct?'Doğru duraktasın!':'Bu kez durağı kaçırdın.'}</strong></div><p>{feedback.explanation}</p><button className="primary" disabled={busy} onClick={next}>{session.status==='finished'?'Sonucumu gör':'Sıradaki soru'}<ChevronRight size={18}/></button></div><AutoAdvance key={`${session.id}:${question.index}`} delay={autoDelay} suspended={busy} onDelayChange={v=>{setAutoDelay(v);write('son-durak:auto-advance',v);}} onNext={next}/></>:<p className="question-hint"><Info size={15}/>{busy?'Cevabın kaydediliyor…':'Bir doğru cevap var. Klavyede 1–4 tuşlarını da kullanabilirsin.'}</p>}
    </section>
    {feedback&&question.kind!=='map'&&(session.network_version===network.version?<div className="explanation-map"><div className="section-heading"><h2>Duraklara yakından bak</h2><span>{feedback.map.excluded_line??feedback.map.line_code} · İETT</span></div><RouteMap network={network} stopIds={feedback.map.stop_ids} connect={!feedback.map.excluded_line} excludedLine={feedbackLine} labels={feedback.map.excluded_line?feedback.map.stop_ids.map(id=>`Sorulan durak · ${network.stops[id]?.name??''}`):undefined}/></div>:<p className="notice">Bu eski turun harita verisi farklı bir sürüme ait; açıklamayı yukarıdan okuyabilirsin.</p>)}
    {session.mode==='quick'&&<p className="quiet centered">5 dakikalık süre, açıklamalar okunurken ve ara verildiğinde de devam eder.</p>}
    <div className="remote-game-actions"><button className="text-button" disabled={busy} onClick={()=>void run(()=>complete(session.id))}>Turu bitir</button>{session.mode==='duel'&&<button className="secondary" disabled={busy} onClick={shareDuel}><Copy size={17}/> Düello bağlantısı</button>}</div>
   </>}
   {view==='game'&&session&&!question&&<button className="primary" disabled={busy} onClick={()=>void run(()=>complete(session.id))}>Sonucumu göster</button>}
   {view==='result'&&result&&<section className="results-page"><div className="eyebrow">{MODE_NAMES[result.mode]} TAMAMLANDI</div><div className="result-icon"><Trophy size={42}/></div><h1>{result.correct===result.total&&result.total>0?'İstanbul senden sorulur.':'Her tur yeni bir keşif.'}</h1><p>{result.total} sorudan {result.correct} doğru.</p><div className="result-stats"><div><strong>{result.score}</strong><span>puan</span></div><div><strong>{result.correct}/{result.total}</strong><span>doğru</span></div><div><strong>+{result.xp}</strong><span>XP</span></div></div><p>{result.hints_used} soruda ipucu kullanıldı.</p><div className="result-grid" aria-label="Cevapların özeti">{Array.from({length:result.total},(_,i)=><span key={i} className={result.answers[i]?.correct?'good':result.answers[i]?'bad':'empty'}>{result.answers[i]?.correct?'✓':result.answers[i]?'×':i+1}</span>)}</div><div className="result-actions"><button className="primary" disabled={busy} onClick={restart}>Yeni tur</button><button className="secondary" onClick={()=>void copy(`Son Durak · ${MODE_NAMES[result.mode]}\n${result.correct}/${result.total} · ${result.score} puan\n${result.answers.map(a=>a.correct?'🟩':'⬛').join('')}\n${location.origin+location.pathname}`)}><Share2 size={17}/> Sonucunu paylaş</button>{result.mode==='duel'&&<button className="secondary" disabled={busy} onClick={shareDuel}>Düello bağlantısı</button>}</div><button className="secondary" onClick={()=>nav('home')}><House size={18}/> Ana sayfaya dön</button></section>}
   {view==='progress'&&profile&&<Account profile={profile} history={history} onProfile={setProfile} onResume={resume} onRefresh={refresh}/>}
   {view==='explore'&&<Explorer network={network} initialCode={lineCode}/>}
   {view==='data'&&<DataView network={network} remote localServer={localAuth}/>}
   {view==='about'&&<AboutView onHome={()=>nav('home')} onData={()=>nav('data')} remote localServer={localAuth}/>}
   {shareText&&<div className="share-panel"><label htmlFor="server-share">Paylaşım metni / bağlantısı</label><textarea id="server-share" readOnly value={shareText} onFocus={e=>e.target.select()} rows={4}/><button className="text-button" onClick={()=>setShareText('')}>Kapat</button></div>}
  </main><AppFooter dataDate={network.meta.dataDate?formatDate(network.meta.dataDate+'T12:00:00Z'):'Belirtilmemiş'} onData={()=>nav('data')} onAbout={()=>nav('about')}/></div>
 </div>;
}
