import { useId, useState, type ReactNode } from 'react';
import { ArrowRight, BusFront, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, Database, Heart, MapPin, Play, Route, Users, Zap } from 'lucide-react';
import type { Network, Difficulty, Mode } from '../lib/types';
import { REGIONS, type Side } from '../lib/regions';
import LinePicker from './LinePicker';
import SegmentedControl from './SegmentedControl';
import CityRoute from './CityRoute';

const difficulties = [{value:'easy',label:'Kolay'},{value:'hard',label:'Zor'}] as const;
const sides = [{value:'all',label:'Tüm İstanbul'},{value:'europe',label:'Avrupa'},{value:'asia',label:'Anadolu'}] as const;

function ModeDisclosure({icon, title, description, meta, tone, children}: {
 icon: ReactNode; title: string; description: string; meta: string; tone: string; children: ReactNode;
}) {
 const [open,setOpen]=useState(false);
 const id=useId();
 return <div className={`home-mode ${tone}`}>
  <button type="button" className="home-mode-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
   <span className="mode-icon">{icon}</span><span className="mode-card-meta">{meta}</span>
   <span className="mode-copy"><strong>{title}</strong><small>{description}</small></span>
   <span className="mode-open-label">{open?'Ayrıntıları kapat':'Modu keşfet'}<ChevronDown size={16}/></span>
  </button>
  <div id={id} className="home-mode-panel" inert={!open} data-open={open}><div className="home-mode-panel-inner"><div className="home-mode-body">{children}</div></div></div>
 </div>;
}

type Props={network:Network; difficulty:Difficulty; setDifficulty:(value:Difficulty)=>void; quickSide:Side; setQuickSide:(value:Side)=>void; quickRegion:string; setQuickRegion:(value:string)=>void; districts:string[]; lineCode:string; setLineCode:(value:string)=>void; district:string; setDistrict:(value:string)=>void; completed:boolean; start:(mode:Mode)=>void; nav:(target:'data')=>void;canStart?:(mode:Mode)=>boolean;};

export default function HomeModes({network,difficulty,setDifficulty,quickSide,setQuickSide,quickRegion,setQuickRegion,districts,lineCode,setLineCode,district,setDistrict,completed,start,nav,canStart}:Props){
 const now = new Date();
 const day = new Intl.DateTimeFormat('tr-TR',{day:'2-digit',timeZone:'Europe/Istanbul'}).format(now);
 const month = new Intl.DateTimeFormat('tr-TR',{month:'long',timeZone:'Europe/Istanbul'}).format(now);
 const weekday = new Intl.DateTimeFormat('tr-TR',{weekday:'long',timeZone:'Europe/Istanbul'}).format(now);
 return <>
  <div className="home-toolbar"><span>Bugün hangi yoldan gidelim?</span><div className="difficulty-setting"><span>Zorluk</span><SegmentedControl label="Zorluk seviyesi" value={difficulty} options={difficulties} onChange={setDifficulty}/></div></div>
  <div className="home-featured">
   <section className="home-start" aria-label="Hızlı Tur">
    <div className="quick-intro"><span className="home-caption"><Zap size={15}/> HIZLI TUR</span><h2>İstanbul’a bir<br/>mola ver.</h2><p>Tanıdık sokaklar, yeni sorular.<br/>Bir sonraki durağı sen bul.</p><div className="quick-facts"><span><Route size={15}/> 10 soru</span><span><Clock3 size={15}/> 5 dakika</span></div><button className="primary" disabled={canStart?.('quick')===false} onClick={()=>start('quick')}><Play size={16} fill="currentColor"/> Tura başla<ArrowRight size={17}/></button></div>
    <CityRoute/>
    <div className="quick-filters"><div className="quick-filter-heading"><span><MapPin size={14}/> Oyun bölgesi</span><span>Senin şehrin, senin rotan.</span></div><SegmentedControl label="Hızlı Tur yakası" value={quickSide} options={sides} onChange={value=>{setQuickSide(value);setQuickRegion('');}} className="quick-side"/>
     {quickSide!=='all'&&<div className="quick-regions" role="group" aria-label="Hızlı Tur bölgesi"><button type="button" aria-pressed={quickRegion===''} onClick={()=>setQuickRegion('')}>Tümü</button>{REGIONS.filter(region=>region.side===quickSide).map(region=><button type="button" key={region.id} aria-pressed={quickRegion===region.id} disabled={!region.districts.some(d=>districts.includes(d))} onClick={()=>setQuickRegion(region.id)}>{region.name}</button>)}</div>}
     {quickRegion&&<p className="quick-region-districts">{REGIONS.find(region=>region.id===quickRegion)?.districts.join(' · ')}</p>}
     {quickSide!=='all'&&<p className="quick-filter-note">Sorular bu bölgedeki duraklar ve buraya uğrayan hatlardan seçilir.</p>}
    </div>
   </section>
   <section className="home-daily" aria-label="Günlük Rota">
    <div className="daily-top"><span className="home-caption"><CalendarDays size={15}/> GÜNLÜK ROTA</span><span className={`daily-status ${completed?'completed':''}`}>{completed?'Tamamlandı':'Her gün yeni'}</span></div>
    <div className="daily-calendar"><strong>{day}</strong><span>{month}<small>{weekday}</small></span><span className="calendar-decoration" aria-hidden="true"><Route size={46} strokeWidth={1}/></span></div>
    <h2>Yeni gün. Yeni rota.</h2><p>İstanbul’dan 5 soru.<br/>Bugünün keşfinde herkes aynı yolda.</p>
    <div className="daily-stops" aria-label={completed?'Günlük rota tamamlandı':'5 soruluk günlük rota'}>{[1,2,3,4,5].map(n=><span key={n} className={completed?'done':''}>{completed?<Check size={14}/>:n}</span>)}</div>
    <button className="secondary" disabled={canStart?.('daily')===false} onClick={()=>start('daily')}>{completed?'Bugünkü sonucunu gör':'Günün rotasını çöz'}<ArrowRight size={17}/></button>
    <span className="daily-note">5 soru · Kolay seviye · Herkese aynı rota</span>
   </section>
  </div>
  <section className="home-modes" aria-labelledby="other-modes-title"><div className="section-heading"><div><h2 id="other-modes-title">Kendi yolunu seç.</h2><p>Biraz merak, biraz rekabet. Sana göre bir yol var.</p></div><span>4 farklı deneyim</span></div>
   <div className="home-mode-list">
    <ModeDisclosure icon={<Heart size={23}/>} title="Son Yolcu" description="Üç canın var. Bakalım son durağa kim kalacak?" meta="3 CAN · 50 SORU" tone="coral"><p>Üç yanlışta tur biter. Her doğruyla bir durak daha ilerle.</p><button className="primary" disabled={canStart?.('survival')===false} onClick={()=>start('survival')}>Yola çık <ChevronRight size={17}/></button></ModeDisclosure>
    <ModeDisclosure icon={<BusFront size={23}/>} title="Hat Uzmanı" description="Her gün bindiğin hattı gerçekten tanıyor musun?" meta="BİR HAT · 10 SORU" tone="purple"><LinePicker lines={network.lines} value={lineCode} onChange={setLineCode}/><button className="primary" disabled={canStart?.('expert')===false} onClick={()=>start('expert')}>Hattını test et <ChevronRight size={17}/></button></ModeDisclosure>
    <ModeDisclosure icon={<MapPin size={23}/>} title="Mahalleni Tanı" description="Bildiğin sokaklarda küçük bir keşfe çık." meta="BİR İLÇE · 10 SORU" tone="teal"><label className="home-field">İlçeni seç<select aria-label="Oyun ilçesi" value={district} onChange={e=>setDistrict(e.target.value)}>{districts.map(d=><option key={d}>{d}</option>)}</select></label><button className="primary" disabled={canStart?.('district')===false} onClick={()=>start('district')}>Semtini keşfet <ChevronRight size={17}/></button></ModeDisclosure>
    <ModeDisclosure icon={<Users size={23}/>} title="Arkadaş Düellosu" description="Aynı şehir, aynı sorular. Peki kim daha iyi biliyor?" meta="BİR DAVET · 10 SORU" tone="amber"><p>Turunu başlat, bağlantısını arkadaşına gönder ve sonuçlarınızı karşılaştırın.</p><button className="primary" disabled={canStart?.('duel')===false} onClick={()=>start('duel')}>Düelloya başla <ChevronRight size={17}/></button></ModeDisclosure>
   </div>
  </section>
  <button className="home-data-link" onClick={()=>nav('data')}><span className="data-link-icon"><Database size={20}/></span><span><strong>Bu şehrin hikâyesi, gerçek verilerde.</strong><small>İBB açık verilerinden {network.meta.counts.lines.toLocaleString('tr-TR')} hat ve {network.meta.counts.stops.toLocaleString('tr-TR')} durak.</small></span><span className="data-link-action">Veriyi keşfet<ArrowRight size={16}/></span></button>
 </>;
}
