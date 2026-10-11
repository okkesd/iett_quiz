import { useFeedbackScroll } from './lib/useFeedbackScroll';
import { usePageRoute, openQuiz, PAGE_PATHS, handlePageLink, type PageView } from './lib/routing';
import RouteNotice from './components/RouteNotice';
import HomeHeading from './components/HomeHeading';
import AppFooter from './components/AppFooter';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { ArrowUpRight, Award, BusFront, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Copy, Database, Flame, Gamepad2, Heart, House, Info, Lightbulb, MapPin, Map as MapIcon, Moon, Sun, Play,  Route, Search, Settings2, Share2, ShieldCheck, Ticket, Trophy, Users, X, Zap } from 'lucide-react';
import type { Answer, Config, Difficulty, Mode, Network, Progress, Question, Result } from './lib/types';
import { dailySeed, ENGINE_VERSION, istanbulDay, KIND_LABELS, normalize, QuizEngine } from './lib/quiz';
import { BADGES, loadProgress, PROGRESS_KEY, rank, read, record, resultFrom, SESSION_KEY, type Session, write } from './lib/storage';
import RouteMap from './components/RouteMap';
import { useTheme, type Theme } from './lib/theme';
import { questionHint } from './lib/hints';
import HintPanel from './components/HintPanel';
import HintReveal from './components/HintReveal';
import HomeModes from './components/HomeModes';
import AutoAdvance from './components/AutoAdvance';
import { quickDistricts, type Side } from './lib/regions';
const MODE_NAMES:Record<Mode,string>={quick:'Hızlı Tur',daily:'Günlük Rota',survival:'Son Yolcu',expert:'Hat Uzmanı',district:'Mahalleni Tanı',duel:'Arkadaş Düellosu'};
const dateLabel=(date:string)=>new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(date));
const number=(n:number)=>n.toLocaleString('tr-TR');
function validSession(raw:Session|null,network:Network):raw is Session{return !!raw&&raw.version===network.version&&raw.engineVersion===ENGINE_VERSION&&typeof raw.id==='string'&&typeof raw.day==='string'&&!!raw.config&&(raw.config.districts===undefined||(Array.isArray(raw.config.districts)&&raw.config.districts.length>0&&raw.config.districts.every(d=>typeof d==='string')))&&typeof raw.config.seed==='string'&&raw.config.seed.length<200&&['quick','daily','survival','expert','district','duel'].includes(raw.config.mode)&&['easy','hard'].includes(raw.config.difficulty)&&raw.config.count>0&&raw.config.count<=50&&Number.isInteger(raw.index)&&raw.index>=0&&raw.index<raw.config.count&&Array.isArray(raw.answers)&&raw.answers.every(a=>typeof a.questionId==='string'&&typeof a.optionId==='string'&&typeof a.correct==='boolean')&&raw.answers.length>=raw.index&&raw.answers.length<=raw.index+1&&(raw.hintedQuestionIds===undefined||(Array.isArray(raw.hintedQuestionIds)&&raw.hintedQuestionIds.length<=raw.config.count&&raw.hintedQuestionIds.every(id=>typeof id==='string')))&&(raw.deadline===null||Number.isFinite(raw.deadline));}
export default function App(){
 const {theme,toggleTheme}=useTheme();
 const [network,setNetwork]=useState<Network|null>(null),[loadError,setLoadError]=useState('');
 useEffect(()=>{const ctrl=new AbortController();fetch('/data/network.json',{signal:ctrl.signal}).then(r=>{if(!r.ok)throw new Error('Veri dosyası yüklenemedi.');return r.json();}).then((data:Network)=>{if(data.schemaVersion!==1||!data.lines?.length||!data.stops||!data.stopLines)throw new Error('Veri biçimi desteklenmiyor.');setNetwork(data);}).catch(e=>{if(e.name!=='AbortError')setLoadError('Hat verisi yüklenemedi. Bağlantını kontrol ederek tekrar dene.');});return ()=>ctrl.abort();},[]);
 if(loadError)return <main className="loading"><BusFront size={40}/><h1>Durakta kısa bir mola</h1><p>{loadError}</p><button className="primary" onClick={()=>location.reload()}>Yeniden dene</button></main>;
 if(!network)return <main className="loading" aria-live="polite"><BusFront size={40}/><h1>Son Durak</h1><p>İstanbul’un hatları hazırlanıyor…</p><span className="loader"/></main>;
 return <Experience network={network} theme={theme} toggleTheme={toggleTheme}/>;
}
function Experience({network,theme,toggleTheme}:{network:Network;theme:Theme;toggleTheme:()=>void}){
 const engine=useMemo(()=>new QuizEngine(network),[network]);
 const {route,navigate}=usePageRoute();
 const view=route.view;
 const [routeError,setRouteError]=useState('');
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[route.path]);
 const [progress,setProgress]=useState<Progress>(loadProgress);
 const [difficulty,setDifficulty]=useState<Difficulty>('easy');
 const [lineCode,setLineCode]=useState(engine.lines.has('77A')?'77A':network.lines[0].code);
 const [district,setDistrict]=useState('Kadıköy');
 const [quickSide,setQuickSide]=useState<Side>('all');
 const [quickRegion,setQuickRegion]=useState('');
 const [session,setSession]=useState<Session|null>(()=>{const s=read<Session|null>(SESSION_KEY,null);return validSession(s,network)?s:null;});
 const [questions,setQuestions]=useState<Question[]>([]),[result,setResult]=useState<Result|null>(null);
 const [now,setNow]=useState(Date.now()),[toast,setToast]=useState(''),[shareText,setShareText]=useState('');
 const [day,setDay]=useState(istanbulDay());
 const [closedHint,setClosedHint]=useState<string|null>(null);
 const questionHeading=useRef<HTMLHeadingElement>(null);
 const districts=useMemo(()=>[...new Set(network.lines.flatMap(l=>l.districts))].sort((a,b)=>a.localeCompare(b,'tr')), [network]);
 const params=useMemo(()=>new URLSearchParams(location.search),[]);
 const challenge=useMemo(()=>{const seed=params.get('duel');if(!seed)return null;const valid=/^[a-zA-Z0-9-]{1,80}$/.test(seed)&&params.get('v')===network.version&&params.get('ev')===ENGINE_VERSION&&['easy','hard'].includes(params.get('d')||'');return {seed,valid,difficulty:params.get('d') as Difficulty,score:Number(params.get('score')),hasScore:params.has('score')};},[params,network.version]);
 const notify=useCallback((message:string)=>{setToast(message);},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return ()=>clearTimeout(t);},[toast]);
 useEffect(()=>{const t=setInterval(()=>setDay(istanbulDay()),15000);return ()=>clearInterval(t);},[]);
 const saveSession=useCallback((s:Session)=>{setSession(s);const ok=write(SESSION_KEY,s);write(`son-durak:session:${s.id}`,s);if(s.config.mode==='daily')write(`son-durak:daily:${s.day}`,s);if(!ok)notify('Tarayıcı kaydı kullanılamıyor. Bu oturumdaki ilerlemen sayfa kapanınca kaybolabilir.');},[notify]);
 const finish=useCallback((s:Session)=>{
  const r=resultFrom(s,s.config.mode==='survival'?s.answers.length:s.config.count);
  const next=record(progress,r);setProgress(next);if(!write(PROGRESS_KEY,next))notify('Sonuç cihazına kaydedilemedi.');
  setResult(r);openQuiz(r.mode,r.id,true,true);setSession(null);write(SESSION_KEY,null);write(`son-durak:session:${s.id}`,null);
  if(s.config.mode==='daily')write(`son-durak:daily:${s.day}`,null);
 },[progress,notify]);
 const resume=useCallback((s:Session,replace=false)=>{
  try{
   const qs=engine.generate(s.config);
   if(s.hintedQuestionIds?.some(id=>!qs.some(q=>q.id===id)))throw new Error('Kaydedilen ipuçları doğrulanamadı.');
   if(s.answers.some((a,i)=>a.questionId!==qs[i]?.id||!qs[i].options.some(o=>o.id===a.optionId)||a.correct!==(a.optionId===qs[i].correctId)))throw new Error('Kaydedilen tur doğrulanamadı.');
   if(s.config.mode==='daily'&&progress.daily[s.day]){setResult(progress.daily[s.day]);openQuiz('daily',progress.daily[s.day].id,true,true);return;}
   setQuestions(qs);saveSession(s);setNow(Date.now());openQuiz(s.config.mode,s.id,false,replace);
   if(s.deadline!==null&&s.deadline<=Date.now())finish(s);
  }catch(e){notify((e as Error).message);setSession(null);write(SESSION_KEY,null);setRouteError((e as Error).message);}
 },[engine,finish,notify,progress.daily,saveSession]);
 const start=useCallback((mode:Mode,override?:Partial<Config>)=>{
  if(mode==='daily'&&progress.daily[day]){setResult(progress.daily[day]);openQuiz('daily',progress.daily[day].id,true);return;}
  const saved=mode==='daily'?read<Session|null>(`son-durak:daily:${day}`,null):null;
  if(validSession(saved,network)){resume(saved);return;}
  const seed=mode==='daily'?dailySeed(day,network.version):crypto.randomUUID();
  const config:Config={mode,difficulty:mode==='daily'?'easy':difficulty,seed,count:mode==='daily'?5:mode==='survival'?50:10,...(mode==='expert'?{line:lineCode}:{}),...(mode==='district'?{district}:{}),...(mode==='quick'?{districts:quickDistricts(quickSide,quickRegion)}:{}),...override};
  try{
   const qs=engine.generate(config);const s:Session={id:crypto.randomUUID(),config,version:network.version,engineVersion:ENGINE_VERSION,day,answers:[],index:0,deadline:mode==='quick'?Date.now()+5*60*1000:null,startedAt:Date.now()};
   setQuestions(qs);saveSession(s);setNow(Date.now());openQuiz(s.config.mode,s.id);setShareText('');
  }catch(e){notify((e as Error).message);}
 },[day,difficulty,lineCode,district,quickSide,quickRegion,engine,network,progress.daily,resume,saveSession,notify]);
 useEffect(()=>{if(view!=='game'||routeError||session?.id!==route.id||!session?.deadline)return;const t=setInterval(()=>{const time=Date.now();setNow(time);if(time>=session.deadline!)finish(session);},200);return ()=>clearInterval(t);},[view,route.id,routeError,session,finish]);
 const choose=useCallback((id:string)=>{
  if(!session||view!=='game'||session.answers[session.index])return;
  if(session.deadline&&Date.now()>=session.deadline){finish(session);return;}
  const q=questions[session.index];if(!q.options.some(o=>o.id===id))return;
  const answer:Answer={questionId:q.id,optionId:id,correct:id===q.correctId};saveSession({...session,answers:[...session.answers,answer]});
 },[session,view,questions,saveSession,finish,engine]);
 const openHint=useCallback(()=>{
  if(!session||view!=='game'||session.answers[session.index])return;
  if(session.deadline&&Date.now()>=session.deadline){finish(session);return;}
  const q=questions[session.index];
  const key=`${session.id}:${q.id}`;
  if(session.hintedQuestionIds?.includes(q.id)){setClosedHint(previous=>previous===key?null:key);return;}
  setClosedHint(null);
  saveSession({...session,hintedQuestionIds:[...(session.hintedQuestionIds||[]),q.id]});
 },[session,view,questions,saveSession,finish]);
 const next=useCallback(()=>{
  if(!session||!session.answers[session.index])return;
  if(session.index+1===questions.length||(session.config.mode==='survival'&&session.answers.filter(a=>!a.correct).length>=3)){finish(session);return;}
  saveSession({...session,index:session.index+1});
 },[session,questions.length,saveSession,finish]);
 useEffect(()=>{if(view==='game')questionHeading.current?.focus();},[view,session?.index]);
 useEffect(()=>{const handler=(event:KeyboardEvent)=>{
  if(view!=='game'||!session||event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA|BUTTON/.test((event.target as HTMLElement).tagName))return;
  const key=Number(event.key);if(key>=1&&key<=4){event.preventDefault();choose(questions[session.index].options[key-1].id);}
  if(event.key==='Enter'&&session.answers[session.index]){event.preventDefault();next();}
 };window.addEventListener('keydown',handler);return ()=>window.removeEventListener('keydown',handler);},[view,session,questions,choose,next]);
 useEffect(()=>{
  const ctx=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;
  if(!ctx?.registerTool)return;
  const ctrl=new AbortController();
  try{Promise.resolve(ctx.registerTool({name:'get_quiz_state',title:'Quiz durumunu oku',description:'Aktif oyunun modunu, soru metnini ve görünen seçeneklerini okur.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Boş nesne bekleniyor.');return {view,mode:session?.config.mode,question:view==='game'&&session?{number:session.index+1,prompt:questions[session.index]?.prompt,options:questions[session.index]?.options}:null};}},{signal:ctrl.signal})).catch(()=>{});}catch{/* Optional browser capability. */}
  return ()=>ctrl.abort();
 },[view,session,questions]);
 const copy=async(text:string)=>{setShareText(text);try{await navigator.clipboard.writeText(text);notify('Panoya kopyalandı.');}catch{notify('Metni aşağıdaki kutudan kopyalayabilirsin.');}};
 const duelLink=(seed:string,d:Difficulty,score?:number)=>{const url=new URL('/',location.origin);url.search=new URLSearchParams({duel:seed,v:network.version,ev:ENGINE_VERSION,d,...(score===undefined?{}:{score:String(score)})}).toString();return url.toString();};
 const shareResult=()=>{
  if(!result)return;
  const squares=result.answers.map(a=>a.correct?'🟩':'⬛').join('')+'⬜'.repeat(Math.max(0,result.total-result.answers.length));
  const text=`Son Durak · ${MODE_NAMES[result.mode]}\n${dateLabel(result.day+'T12:00:00+03:00')} · ${result.correct}/${result.total} · ${result.score} puan\nİpucu: ${result.hintsUsed||0} soru\n${squares}\n${result.mode==='duel'?duelLink(result.seed,result.difficulty,result.score):location.origin+location.pathname}\nVeri: ${result.version}`;
  void copy(text);
 };
 const current=session?questions[session.index]:undefined;
 const hint=useMemo(()=>current?questionHint(engine,current):null,[engine,current]);
 const hintUsed=!!current&&!!session?.hintedQuestionIds?.includes(current.id);
 const hintOpen=hintUsed&&closedHint!==`${session?.id}:${current?.id}`;
 const answer=session?.answers[session.index];
 const feedbackRef=useFeedbackScroll(view==='game'&&!routeError&&session&&session.id===route.id&&answer?`${session.id}:${session.index}`:null);
 const correct=session?.answers.filter(a=>a.correct).length||0;
 const seconds=session?.deadline?Math.max(0,Math.ceil((session.deadline-now)/1000)):null;
 const completed=!!progress.daily[day];
 const activeStreak=progress.lastDay===day||progress.lastDay===istanbulDay(new Date(Date.now()-86400000))?progress.streak:0;

 // Restore only on navigation; answer updates must not replay the saved question.
 useEffect(()=>{
  setRouteError('');
  if(!route.id||!route.mode)return;
  const completed=progress.results.find(r=>r.id===route.id)??Object.values(progress.daily).find(r=>r.id===route.id);
  if(completed){
   if(completed.mode!==route.mode){setRouteError('Tur kimliği bu oyun moduna ait değil.');return;}
   setResult(completed);openQuiz(completed.mode,completed.id,true,true);return;
  }
  const saved=session?.id===route.id?session:read<Session|null>(`son-durak:session:${route.id}`,null);
  if(!validSession(saved,network)||saved.config.mode!==route.mode){setRouteError('Bu tur bu tarayıcıda bulunamadı. Oyun alanından yeni bir tur başlatabilirsin.');return;}
  resume(saved,true);
 },[route.path,network,engine]);
 const nav=(target:PageView)=>{navigate(target);setShareText('');};
 return <div className="app-shell"><a className="skip-link" href="#main-content">İçeriğe geç</a>
  <aside className="sidebar">
   <button className="brand" onClick={()=>nav('home')} aria-label="Son Durak ana sayfa"><span className="brand-icon"><BusFront size={26}/></span><span>son durak<span className="brand-sub">İstanbul, oyun alanın.</span></span></button>
   <div className="sidebar-label">KEŞFE ÇIK</div>
   <nav className="main-nav" aria-label="Ana menü">
    <a className={['home','game','result'].includes(view)?'active':''} aria-label="Oyun alanı" aria-current={['home','game','result'].includes(view)?'page':undefined} href={PAGE_PATHS.home} onClick={event=>handlePageLink(event,()=>nav('home'))}><Gamepad2 size={20}/><span>Oyun alanı</span><span className="nav-dot"/></a>
    <a className={view==='explore'?'active':''} aria-label="Hatları keşfet" aria-current={view==='explore'?'page':undefined} href={PAGE_PATHS.explore} onClick={event=>handlePageLink(event,()=>nav('explore'))}><Route size={20}/><span>Hatları keşfet</span></a>
    <a className={view==='progress'?'active':''} aria-label="Yolculuğum" aria-current={view==='progress'?'page':undefined} href={PAGE_PATHS.progress} onClick={event=>handlePageLink(event,()=>nav('progress'))}><Trophy size={20}/><span>Yolculuğum</span></a>
   </nav>

   <button className={`source-nav ${view==='data'?'active':''}`} onClick={()=>nav('data')}><Database size={18}/> Veri ve kaynaklar</button>
   <div className="sidebar-bottom"><span className="local-dot"/> Yerel sürüm <span>v1.0</span></div>
  </aside>
  <div className="workspace">
   <header className="topbar"><div className="breadcrumb"><span className="breadcrumb-city">İstanbul</span> <ChevronRight size={14}/><strong>{view==='explore'?'Hatları keşfet':view==='progress'?'Yolculuğum':view==='data'?'Veri ve kaynaklar':view==='about'?'Hakkımızda':'Oyun alanı'}</strong></div><div className="topbar-right"><button className="theme-toggle" type="button" aria-label="Koyu tema" aria-pressed={theme==='dark'} title={theme==='dark'?'Açık temaya geç':'Koyu temaya geç'} onClick={toggleTheme}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button><span className="streak"><Flame size={17}/>{activeStreak} <span>gün seri</span></span><button className="profile" onClick={()=>nav('progress')}><span className="avatar">{rank(progress.xp)[0]}</span><span>{rank(progress.xp)}<small>{number(progress.xp)} XP</small></span></button></div></header>
   <main id="main-content" tabIndex={-1} className={`main-content ${view==='game'?'game-main':view==='home'?'home-main':''}`}>
   {(view==='notfound'||routeError)&&<RouteNotice error={routeError} onHome={()=>nav('home')}/> }
   {view==='game'&&!routeError&&(!session||session.id!==route.id||!current)&&<RouteNotice loading onHome={()=>nav('home')}/> }
   {view==='home'&&<>
    <HomeHeading/>
    {challenge&&<div className={`notice ${challenge.valid?'challenge':'error'}`}><Users size={23}/><div><strong>{challenge.valid?'Düelloya davetlisin!':'Bu düello bağlantısı açılamıyor.'}</strong><p>{challenge.valid?`Aynı 10 soruyu çöz, sonuçlarını karşılaştır.${challenge.hasScore&&Number.isFinite(challenge.score)?` Rakibinin paylaştığı puan: ${challenge.score}.`:''}`:'Bağlantının veri veya oyun sürümü bu cihazdakiyle eşleşmiyor. Aynı proje sürümünü kullanın.'}</p></div>{challenge.valid&&<button className="primary small" onClick={()=>start('duel',{seed:challenge.seed,difficulty:challenge.difficulty})}>Düelloyu başlat</button>}</div>}
    {session&&<div className="resume-bar"><Ticket size={20}/><span>Yarım kalan bir {MODE_NAMES[session.config.mode]} turun var.</span><button onClick={()=>resume(session)}>Devam et</button></div>}
    <HomeModes network={network} difficulty={difficulty} setDifficulty={setDifficulty} quickSide={quickSide} setQuickSide={setQuickSide} quickRegion={quickRegion} setQuickRegion={setQuickRegion} districts={districts} lineCode={lineCode} setLineCode={setLineCode} district={district} setDistrict={setDistrict} completed={completed} start={start}/>
   </>}
   {view==='game'&&!routeError&&session&&session.id===route.id&&current&&<>
    <div className="game-top"><button className="text-button" onClick={()=>nav('home')}><X size={18}/> Ara ver</button><span className="chip">{MODE_NAMES[session.config.mode]} · {session.config.difficulty==='hard'?'Zor':'Kolay'}</span><div className={`timer ${seconds!==null&&seconds<=15?'urgent':''}`}>{seconds!==null?<><Clock3 size={20}/>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}<small>dk:sn</small></>:session.config.mode==='survival'?<><Heart size={20}/>{3-session.answers.filter(a=>!a.correct).length}<small>can</small></>:<><Trophy size={19}/>{correct* (session.config.difficulty==='hard'?150:100)}</>}</div></div>
    <div className="question-progress"><span>SORU {String(session.index+1).padStart(2,'0')} <small>/ {session.config.count}</small></span><div><i style={{width:`${((session.index+1)/session.config.count)*100}%`}}/></div><span>{correct} doğru</span></div>
    <div className="game-question-layout"><section className="question-card"><div className="question-kicker"><span><Route size={16}/>{KIND_LABELS[current.kind]}</span><span>{session.config.difficulty==='hard'?150:100} PUAN</span></div><h1 ref={questionHeading} tabIndex={-1}>{current.prompt}</h1>
    {current.kind==='map'&&<RouteMap network={network} stopIds={current.stopIds} reveal={!!answer}/>}
    {!answer&&<div className="hint-actions"><button className="hint-button" onClick={openHint} aria-expanded={hintOpen} aria-controls={hintOpen?'question-hint-panel':undefined}><Lightbulb size={18}/>{hintOpen?'İpucunu kapat':hintUsed?'İpucunu aç':'İpucu al'}</button><span><CheckCircle2 size={14} aria-hidden="true"/>Puan düşmez.{session.config.mode==='quick'?' Süre devam eder.':''}</span></div>}
    {!answer&&hint&&!hint.map&&<HintReveal key={`${session.id}:${current.id}`} open={hintOpen}><HintPanel hint={hint} network={network}/></HintReveal>}
    <div className="answer-grid">{current.options.map((option,i)=>{const correctOption=!!answer&&option.id===current.correctId,wrong=!!answer&&answer.optionId===option.id&&!answer.correct;return <button key={option.id} className={`answer-option ${correctOption?'correct':''} ${wrong?'wrong':''}`} disabled={!!answer} onClick={()=>choose(option.id)}><span className="option-letter">{'ABCD'[i]}</span><span>{option.label}</span>{correctOption?<CheckCircle2 size={22}/>:wrong?<X size={22}/>:<span className="key-hint">{i+1}</span>}</button>;})}</div>
    {!answer&&<div className="question-hint"><Info size={15}/> Bir doğru cevap var. İstersen klavyede 1–4 tuşlarını kullan.</div>}
    {answer&&<div ref={feedbackRef} className={`answer-feedback ${answer.correct?'success':'incorrect'}`} role="status"><div className="feedback-title">{answer.correct?<CheckCircle2 size={23}/>:<Info size={23}/>}<strong>{answer.correct?'Doğru duraktasın!':'Bu kez durağı kaçırdın.'}</strong>{answer.correct&&<span>+{session.config.difficulty==='hard'?150:100} puan</span>}</div><p>{current.explanation}</p></div>}
    {answer&&<AutoAdvance key={`${session.id}:${current.id}`} label={session.index+1===questions.length||(session.config.mode==='survival'&&session.answers.filter(a=>!a.correct).length>=3)?'Sonucumu gör':'Sonraki soru'} onNext={next}/>}
    </section>
    {!answer&&hint?.map&&<HintReveal key={`${session.id}:${current.id}`} open={hintOpen}><HintPanel hint={hint} network={network}/></HintReveal>}
    </div>
    {answer&&current.kind!=='map'&&<div className="explanation-map"><div className="section-heading"><h2>Duraklara yakından bak</h2><span>{current.kind==='not-line'?current.correctId:current.lineCode} · İETT</span></div><RouteMap network={network} stopIds={current.stopIds} connect={current.kind!=='not-line'} excludedLine={current.kind==='not-line'?engine.lines.get(current.correctId):undefined} labels={current.kind==='not-line'?[`Sorulan durak · ${network.stops[current.stopIds[0]].name}`]:undefined}/></div>}
    {session.config.mode==='quick'&&<p className="quiet centered">5 dakikalık süre, açıklamalar okunurken ve ara verildiğinde de devam eder.</p>}
    {session.config.mode==='duel'&&<div className="duel-tools"><button className="secondary" onClick={()=>void copy(duelLink(session.config.seed,session.config.difficulty))}><Copy size={17}/> Aynı soruların bağlantısını kopyala</button><p>Arkadaşın aynı veri sürümünü açmalı. localhost bağlantıları yalnızca açıldıkları cihazda çalışır.</p></div>}
   </>}
   {view==='result'&&!routeError&&result&&result.id===route.id&&<section className="results-page"><div className="eyebrow">{MODE_NAMES[result.mode].toLocaleUpperCase('tr')} TAMAMLANDI</div><div className="result-icon"><Trophy size={42}/></div><h1>{result.correct===result.total?'İstanbul senden sorulur.':result.correct>=result.total/2?'Güzel bir yolculuktu.':'Her tur yeni bir keşif.'}</h1><p>{result.correct===result.total?'Bütün durakları doğru bildin.':`${result.total} sorudan ${result.correct} doğru. Bir sonraki turda yeni yollar seni bekliyor.`}</p><div className="result-stats"><div><strong>{number(result.score)}</strong><span>toplam puan</span></div><div><strong>{result.correct}<small>/{result.total}</small></strong><span>doğru cevap</span></div><div><strong>+{result.xp}</strong><span>kazanılan XP</span></div></div><p className="result-hints"><Lightbulb size={17}/>{result.hintsUsed||0} soruda ipucu kullanıldı.</p><div className="result-grid" aria-label="Cevapların özeti">{Array.from({length:result.total},(_,i)=><span key={i} className={result.answers[i]?.correct?'good':result.answers[i]?'bad':'empty'} title={`Soru ${i+1}: ${result.answers[i]?.correct?'Doğru':result.answers[i]?'Yanlış':'Yanıtlanmadı'}`}>{result.answers[i]?.correct?<Check size={18}/>:result.answers[i]?<X size={18}/>:i+1}</span>)}</div><div className="result-actions"><button className="primary" onClick={()=>start(result.mode==='daily'?'quick':result.mode)}>Yeni tur</button><button className="secondary" onClick={shareResult}><Share2 size={17}/> Sonucunu paylaş</button></div><button className="secondary" onClick={()=>nav('home')}><House size={18}/> Ana sayfaya dön</button>{result.mode==='duel'&&challenge?.hasScore&&Number.isFinite(challenge.score)&&result.seed===challenge.seed&&<p className="notice">Sen: {result.score} puan · Paylaşılan rakip puanı: {challenge.score} (beyan edilen sonuç)</p>}<div className="result-foot"><Award size={19}/>{rank(progress.xp)} · {number(progress.xp)} XP<span>İlerlemen bu tarayıcıda saklanıyor.</span></div></section>}
   {view==='explore'&&<Explorer network={network} initialCode={lineCode}/>}
   {view==='progress'&&<ProgressView progress={progress} streak={activeStreak}/>}
   {view==='data'&&<DataView network={network}/>}
   {view==='about'&&<AboutView onHome={()=>nav('home')} onData={()=>nav('data')}/>}
   {shareText&&<div className="share-panel"><label htmlFor="share">Paylaşım metni / bağlantısı</label><textarea id="share" readOnly value={shareText} onFocus={e=>e.target.select()} rows={4}/><p className="quiet">Yerel bağlantıyı başka bir cihazda açmak için o cihazda da aynı uygulama çalışmalıdır.</p><button className="text-button" onClick={()=>setShareText('')}>Kapat</button></div>}
   </main>
   <AppFooter dataDate={network.meta.dataDate?dateLabel(network.meta.dataDate+'T12:00:00Z'):'Kaynakta belirtilmemiş'} onData={()=>nav('data')} onAbout={()=>nav('about')}/>
  </div>
  {toast&&<div className="toast" role="status">{toast}<button onClick={()=>setToast('')} aria-label="Bildirimi kapat"><X size={17}/></button></div>}
 </div>;
}
export function Explorer({network,initialCode}:{network:Network;initialCode:string}){
 const [query,setQuery]=useState(''),[code,setCode]=useState(initialCode),[patternIndex,setPatternIndex]=useState(0);
 const line=network.lines.find(l=>l.code===code)!;
 const pattern=line.patterns[patternIndex]||line.patterns[0];
 const searchIndex=useMemo(()=>new Map(network.lines.map(l=>[l.code,normalize(`${l.code} ${l.name} ${l.districts.join(' ')} ${(l.stopIds||l.patterns.flatMap(p=>p.stops)).map(id=>network.stops[id].name).join(' ')}`)])),[network]);
 const filtered=useMemo(()=>network.lines.filter(l=>searchIndex.get(l.code)!.includes(normalize(query))),[network,query,searchIndex]);
 return <><div className="page-heading"><div><div className="eyebrow">ŞEHRİN HATLARI</div><h1>Yolu biraz daha iyi tanı.</h1><p>Bir hat seç, yönlerini ve sıralı duraklarını keşfet.</p></div><MapIcon size={36}/></div><div className="explorer"><aside className="line-browser"><label className="search-field"><Search size={18}/><input aria-label="Hat ara" placeholder="Hat kodu, durak veya ilçe…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="line-count">{filtered.length} hat bulundu</div><div className="line-list">{filtered.length===0?<p className="empty-state">Bu aramayla eşleşen hat yok.</p>:filtered.map(l=><button key={l.code} className={code===l.code?'selected':''} onClick={()=>{setCode(l.code);setPatternIndex(0);}}><span className="line-pill">{l.code}</span><span>{l.name}</span></button>)}</div></aside><section className="route-detail"><div className="route-title"><span className="line-pill large">{line.code}</span><div><h2>{line.name}</h2><p>{line.districts.join(' · ')}</p></div></div><label className="pattern-select">Yön ve güzergâh<select value={patternIndex} onChange={e=>setPatternIndex(Number(e.target.value))}>{line.patterns.map((p,i)=><option key={p.id} value={i}>{network.stops[p.stops[0]].name} → {network.stops[p.stops.at(-1)!].name} · {p.stops.length} durak · Varyant {i+1}{i===0?' (ana)':''}</option>)}</select></label><RouteMap network={network} stopIds={pattern.stops}/><div className="stop-list-title"><h3>Duraklar</h3><span>{pattern.stops.length} durak</span></div><ol className="stop-list">{pattern.stops.map((id,i)=>{const s=network.stops[id];return <li key={`${id}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{s.name}</strong><small>{s.district||'İlçe bilgisi yok'} · Durak {s.code}</small></div><span className="connecting-lines">{network.stopLines[s.group]?.length||0} hat</span></li>;})}</ol></section></div></>;
}
function ProgressView({progress,streak}:{progress:Progress;streak:number}){
 const levels=[0,500,2000,5000],nextLevel=levels.find(x=>x>progress.xp);const previous=levels.filter(x=>x<=progress.xp).at(-1)!;
 return <><div className="page-heading"><div><div className="eyebrow">YOLCULUĞUM</div><h1>Her turda bir durak ileri.</h1><p>Bu tarayıcıdaki skorların, günlük serin ve rozetlerin.</p></div><Trophy size={36}/></div><div className="progress-summary"><div className="rank-card"><span className="avatar big">{rank(progress.xp)[0]}</span><div><span>ŞU ANKİ SEVİYEN</span><h2>{rank(progress.xp)}</h2><p>{number(progress.xp)} XP {nextLevel?`· ${rank(nextLevel)} olmana ${number(nextLevel-progress.xp)} XP`:'· En üst seviyedesin'}</p><div className="xp-bar"><i style={{width:`${nextLevel?Math.min(100,(progress.xp-previous)/(nextLevel-previous)*100):100}%`}}/></div></div></div><div className="stat-card"><Flame/><strong>{streak}</strong><span>günlük seri</span></div><div className="stat-card"><Ticket/><strong>{progress.results.length}</strong><span>kayıtlı tur</span></div></div><div className="section-heading"><h2>Yolculuk rozetlerin</h2><span>{progress.badges.length} / {BADGES.length}</span></div><div className="badge-grid">{BADGES.map(b=><div key={b.id} className={`badge-card ${progress.badges.includes(b.id)?'unlocked':''}`}><Award size={29}/><strong>{b.name}</strong><p>{b.description}</p><span>{progress.badges.includes(b.id)?'Kazanıldı':'Henüz açılmadı'}</span></div>)}</div><div className="section-heading"><h2>Bu cihazın skor tablosu</h2><span>Son 100 tur</span></div>{progress.results.length?<div className="table-wrap"><table><thead><tr><th>Tarih</th><th>Oyun</th><th>Doğru</th><th>Puan</th><th>XP</th><th>İpucu</th></tr></thead><tbody>{[...progress.results].sort((a,b)=>b.score-a.score).map(r=><tr key={r.id}><td>{dateLabel(r.date)}</td><td>{MODE_NAMES[r.mode]}<small>{r.difficulty==='hard'?'Zor':'Kolay'}</small></td><td>{r.correct}/{r.total}</td><td><strong>{number(r.score)}</strong></td><td>+{r.xp}</td><td>{r.hintsUsed||0}</td></tr>)}</tbody></table></div>:<div className="empty-state"><Ticket size={32}/><h3>İlk biletin seni bekliyor.</h3><p>Bir tur tamamladığında skorun burada görünecek.</p></div>}</>;
}
export function DataView({network,remote=false,localServer=false}:{network:Network;remote?:boolean;localServer?:boolean}){return <><div className="page-heading"><div><div className="eyebrow">VERİ VE KAYNAKLAR</div><h1>Oyunun arkasındaki İstanbul.</h1><p>Sorular elle yazılmıyor; kayıtlı hat ve durak verisinden üretiliyor.</p></div><Database size={36}/></div><div className="data-stats">{[[network.meta.counts.lines,'hat'],[network.meta.counts.stops,'durak'],[network.meta.counts.patterns,'yön / güzergâh'],[network.meta.counts.groups,'durak grubu']].map(([n,l])=><div key={l}><strong>{number(Number(n))}</strong><span>{l}</span></div>)}</div><div className="info-card"><h2>Kaynak ve güncellik</h2><dl><div><dt>Birincil kaynak</dt><dd><a href={network.meta.sourceUrl} target="_blank" rel="noreferrer">{network.meta.source} <ArrowUpRight size={14}/></a></dd></div><div><dt>GTFS dosya tarihi</dt><dd>{network.meta.dataDate?dateLabel(network.meta.dataDate+'T12:00:00Z'):'Kaynakta belirtilmemiş'}</dd></div><div><dt>Yerel kopya oluşturma</dt><dd>{dateLabel(network.meta.downloadedAt)}</dd></div><div><dt>İlçe ve konum kaynağı</dt><dd>{network.meta.enrichment==='İETT GetDurak_json'?<a href="https://data.ibb.gov.tr/dataset/iett-hat-durak-guzergah-web-servisi" target="_blank" rel="noreferrer">İETT Hat-Durak-Güzergâh Web Servisi (GetDurak_json) <ArrowUpRight size={14}/></a>:network.meta.enrichment||'GTFS; ilçe bilgisi mevcut değil'}</dd></div><div><dt>Kullanım lisansı</dt><dd><a href={network.meta.licenseUrl} target="_blank" rel="noreferrer">{network.meta.license} <ArrowUpRight size={14}/></a></dd></div><div><dt>Veri sürümü</dt><dd><code>{network.version}</code></dd></div></dl><p>Atıf 4.0 Uluslararası (CC BY 4.0) kapsamında lisanslanan kamu sektörü bilgilerini içerir.</p><p>İBB ve İETT tarafından sağlanan veriler oyun için işlenmiş, duraklar gruplanmış ve kayıtlardan sorular üretilmiştir. Son Durak, İBB veya İETT’nin resmî uygulaması değildir; bu kurumlara bağlı değildir ve kurumların onayını temsil etmez.</p><p>Bu bir bilgi oyunudur. Güncel yolculuk planı ve sefer saatleri için <a href="https://iett.istanbul" target="_blank" rel="noreferrer">İETT’nin resmî kanallarını</a> kullan. Hatlar ve güzergâhlar bu kopyanın tarihinden sonra değişmiş olabilir.</p></div><div className="info-grid"><div className="info-card"><ShieldCheck size={24}/><h2>Sorular nasıl doğrulanıyor?</h2><p>Her sorunun dört farklı seçeneği ve yalnızca bir doğru cevabı kontrol edilir. Hat üyeliğinde bütün kayıtlı sefer varyantları dikkate alınır. Doğrudan rota sorularında durakların aynı seferde doğru sırada olması gerekir.</p><p>Aynı adlı duraklar ilçe içinde gruplanır. “Ana güzergâh”, veri setinde en çok seferi bulunan durak dizisidir; gidiş ve dönüş aynı kabul edilmez.</p><p>Zor seviyede durak seçenekleri mümkün olduğunda aynı ilçelerden seçilir. Günlük tur herkese aynı veri sürümünde ve İstanbul takvim gününde aynı soruları verir.</p></div><div className="info-card"><Info size={24}/><h2>Veri notları</h2>{network.meta.warnings.map(w=><p key={w}>{w}</p>)}<p>Haritadaki çizgiler durakları birleştirir; gerçek yol geometrisini temsil etmez. Alt harita OpenStreetMap’ten çevrim içi yüklenir.</p><p>{localServer?'Puanlar ve rozetler yerel SQLite veritabanındaki tek profile kaydedilir. Cevaplar ve skorlar Rust API tarafından doğrulanır.':remote?'Puanlar ve rozetler hesabına kaydedilir. Cevaplar ve skorlar sunucuda doğrulanır; düello bağlantısı aynı soruları paylaşır.':'Puanlar ve rozetler yalnızca bu tarayıcıda tutulur. Düello sonuçları paylaşım metniyle karşılaştırılır; canlı veya doğrulanmış bir çevrim içi sıralama yoktur.'}</p><p>Zor seviyedeki aktarma soruları iki hattın durak sırasını doğrular. Aynı adlı durak grubu içindeki peronlar arası yürüyüşü ve sefer saatlerini hesaplamaz.</p></div></div></>;}

export function AboutView({onHome,onData,remote=false,localServer=false}:{onHome:()=>void;onData:()=>void;remote?:boolean;localServer?:boolean}){
 return <>
  <div className="page-heading"><div><div className="eyebrow">HAKKIMIZDA</div><h1>İstanbul’u durak durak keşfet.</h1><p>Son Durak, İstanbul’un otobüs ağını oynayarak tanımak için hazırlanmış bağımsız bir bilgi oyunu.</p></div><BusFront size={36}/></div>
  <div className="info-card"><h2>Her hattın öğreteceği bir şey var.</h2><p>Her gün gördüğümüz hat numaralarının arkasında semtler, sokaklar ve binlerce durak var. Son Durak’ın amacı, bu ağı merak uyandıran sorularla keşfetmeni sağlamak. İster bildiğin bir hattın uzmanı ol, ister şehrin hiç gitmediğin bir köşesini tanı.</p></div>
  <div className="info-grid">
   <div className="info-card"><Gamepad2 size={24}/><h2>Nasıl oynanır?</h2><p>Ana sayfadan bir oyun modu ve zorluk seç. Durakları, hatları ve güzergâhları karşılaştırarak dört seçenek arasından doğru cevabı bul. Takıldığında ipucu açabilir, cevabından sonra açıklama ve haritayla yeni bir şey öğrenebilirsin.</p><p>Kısa bir mola için Hızlı Tur’u, her gün yeni sorular için Günlük Rota’yı ya da sevdiğin güzergâha odaklanmak için Hat Uzmanı’nı seç. Kazandığın XP, rozetler ve skorlar Yolculuğum bölümünde birikir.</p></div>
   <div className="info-card"><Database size={24}/><h2>Gerçek veriden üretilen sorular</h2><p>Sorular, İBB açık verisinden alınan hat ve durak kayıtları kullanılarak otomatik oluşturulur. Her sorunun tek doğru cevabı olması veri üzerinden kontrol edilir.</p><p>Güzergâhlar zamanla değişebilir. Oyundaki bilgiler kayıtlı veri tarihini yansıtır; haritalardaki çizgiler durakları birleştiren şematik gösterimlerdir.</p><button className="text-button" onClick={onData}>Veri ve kaynakları incele <ArrowUpRight size={16}/></button></div>
   <div className="info-card"><ShieldCheck size={24}/><h2>Bağımsız bir proje</h2><p>Son Durak, İETT veya İBB’nin resmî uygulaması değildir; bu kurumlara bağlı değildir. Bir yolculuk planlayıcısı ya da canlı sefer bilgisi hizmeti sunmaz.</p><p>Güncel güzergâh ve sefer bilgileri için <a href="https://iett.istanbul" target="_blank" rel="noreferrer">İETT’nin resmî sitesini</a> kullanabilirsin.</p></div>
   <div className="info-card"><Trophy size={24}/><h2>{localServer?'Yolculuğun yerel profilde':remote?'Yolculuğun hesabında':'Yolculuğun bu tarayıcıda'}</h2><p>{localServer?'Yerel geliştirme sürümünde hesap açmadan oynarsın. Skorların ve ilerlemen bu bilgisayardaki veritabanında tek bir profile kaydedilir.':remote?'Hesabınla giriş yaparak oynayabilirsin. Skorların, rozetlerin ve günlük serin sunucuda saklanır; aynı hesapla farklı cihazlardan devam edebilirsin.':'Oynamak için hesap açman gerekmez. Skorların, rozetlerin ve günlük serin kullandığın tarayıcıda saklanır. Tarayıcı verilerini temizlediğinde bu kayıtlar silinebilir; farklı cihazlar arasında otomatik eşitlenmez.'}</p><p>Arkadaş Düellosu’nda aynı soruları bir bağlantıyla paylaşabilir, sonuçlarınızı karşılaştırabilirsiniz.</p></div>
  </div>
  <button className="primary" onClick={onHome}><House size={18}/> Ana sayfaya dön</button>
 </>;
}
