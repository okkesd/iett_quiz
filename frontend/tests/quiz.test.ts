import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { QuizEngine,dailySeed,istanbulDay,normalize,random,ENGINE_VERSION } from '../src/lib/quiz';
import type { Config,Network,Question } from '../src/lib/types';
import { emptyProgress,record,resultFrom,type Session } from '../src/lib/storage';
const network:Network=JSON.parse(readFileSync('public/data/network.json','utf-8'));
const engine=new QuizEngine(network);
const base:Config={mode:'quick',difficulty:'easy',seed:'test-istanbul',count:10};
const rawGroups=(code:string)=>new Set((network.lines.find(l=>l.code===code)!.stopIds||network.lines.find(l=>l.code===code)!.patterns.flatMap(p=>p.stops)).map(s=>network.stops[s].group));
function independentlyCheck(q:Question){
 expect(q.options).toHaveLength(4);expect(new Set(q.options.map(o=>o.label)).size).toBe(4);
 const correct=q.options.find(o=>o.id===q.correctId)!;expect(correct).toBeDefined();
 if(q.kind==='not-stop'){const all=rawGroups(q.lineCode);expect(q.options.filter(o=>!all.has(o.id))).toEqual([correct]);}
 if(q.kind==='not-line'){const group=q.evidence.groups![0];expect(q.options.filter(o=>!rawGroups(o.id).has(group))).toEqual([correct]);}
 if(q.kind==='common'){const first=rawGroups(q.lineCode),second=rawGroups(q.evidence.otherLine!);expect(q.options.filter(o=>first.has(o.id)&&second.has(o.id))).toEqual([correct]);}
 if(q.kind==='at-stop'){
  const group=q.evidence.groups![0];
  expect(q.options.filter(o=>q.evidence.sets![o.id].every(code=>rawGroups(code).has(group)))).toEqual([correct]);
  const sets=Object.values(q.evidence.sets!);
  for(const [i,set] of sets.entries()){
   expect(new Set(set).size).toBe(3);
   for(const other of sets.slice(i+1))expect(set.filter(code=>other.includes(code)).length).toBeLessThanOrEqual(1);
  }
 }
 if(q.kind==='transfer'){const [a,m,b]=q.evidence.groups!;const ordered=(code:string,from:string,to:string)=>network.lines.find(l=>l.code===code)!.patterns.some(p=>{const gs=p.stops.map(s=>network.stops[s].group);return gs.some((g,i)=>g===from&&gs.slice(i+1).includes(to));});expect(q.options.filter(o=>{const [first,second]=q.evidence.sets![o.id];return ordered(first,a,m)&&ordered(second,m,b);})).toEqual([correct]);}
 if(q.kind==='direct'){
  const [a,b]=q.evidence.groups!;
  const valid=q.options.filter(o=>network.lines.find(l=>l.code===o.id)!.patterns.some(p=>{const groups=p.stops.map(s=>network.stops[s].group);return groups.some((g,i)=>g===a&&groups.slice(i+1).includes(b));}));
  expect(valid).toEqual([correct]);
 }
 expect(engine.validate(q)).toBe(true);
 expect(engine.validate({...q,correctId:q.options.find(o=>o.id!==q.correctId)!.id})).toBe(false);
}
describe('official network and generated questions',()=>{
 it('has full, consistent directional data and distinct line variants',()=>{
  expect(network.lines.length).toBeGreaterThan(700);expect(Object.keys(network.stops).length).toBeGreaterThan(13000);
  expect(engine.lines.get('77A')).toBeDefined();expect(engine.lines.get('77')).toBeDefined();expect(engine.lines.get('77A')).not.toEqual(engine.lines.get('77'));
  for(const l of network.lines)for(const p of l.patterns)for(const id of p.stops){expect(network.stops[id]).toBeDefined();expect(network.stopLines[network.stops[id].group]).toContain(l.code);}
 });
 it('makes independently verified, unique questions across real data',()=>{
  const kinds=new Set<string>();for(let i=0;i<12;i++){const qs=engine.generate({...base,count:24,seed:`property-${i}`,difficulty:i%2?'hard':'easy'});expect(new Set(qs.map(q=>q.id)).size).toBe(qs.length);for(const q of qs){kinds.add(q.kind);independentlyCheck(q);}}
  expect(kinds.size).toBe(9);
 });
 it('reproduces a shared or daily seed exactly',()=>{
  const cfg={...base,seed:dailySeed('2026-10-03',network.version)};
  expect(engine.generate(cfg)).toEqual(new QuizEngine(network).generate(cfg));
  expect(engine.generate({...cfg,seed:dailySeed('2026-10-04',network.version)})).not.toEqual(engine.generate(cfg));
 });
 it('scopes expert questions to the selected line and district questions to local anchors',()=>{
  for(const code of ['77A','25G','500T','15F']){const qs=engine.generate({...base,mode:'expert',line:code});expect(qs.every(q=>q.lineCode===code)).toBe(true);qs.forEach(independentlyCheck);}
  for(const district of ['Kadıköy','Beşiktaş','Şişli','Üsküdar','Sarıyer']){
   const qs=engine.generate({...base,mode:'district',district,difficulty:'hard'});
   for(const q of qs){independentlyCheck(q);expect(q.kind).not.toBe('map');const gs=q.evidence.groups||Object.values(q.evidence.sequences||{}).flat();expect(gs.some(g=>engine.groups.get(g)?.district===district)).toBe(true);}
  }
 });
 it('rejects missing filters instead of returning a partial game',()=>{expect(()=>engine.generate({...base,line:'DOES-NOT-EXIST'})).toThrow();expect(()=>engine.generate({...base,district:'Ankara'})).toThrow();});
 it('uses Istanbul midnight and Turkish search normalization',()=>{expect(istanbulDay(new Date('2026-10-03T21:01:00Z'))).toBe('2026-10-04');expect(istanbulDay(new Date('2026-10-03T20:59:00Z'))).toBe('2026-10-03');expect(normalize('ŞİŞLİ KADIKÖY')).toBe('sisli kadikoy');});
});
describe('common stop geography',()=>{
 function fixture(nearbyCount=3):Network{
  const stops:Network['stops']={};
  const add=(id:string,district:string,lat:number|null,lon:number|null)=>{stops[id]={id,code:id,name:id,group:id,district,lat,lon};};
  add('common','Beyoğlu',41.036,28.977);
  add('also-common','Beyoğlu',41.037,28.977);
  for(let i=0;i<nearbyCount;i++)add(`near-${i}`,'Beyoğlu',41.04+i*.001,28.977);
  add('far-same-district','Beyoğlu',41.2,28.977);
  add('missing-location','Beyoğlu',null,null);
  add('cross-bank','Üsküdar',41.034,29.0);
  add('esenyurt','Esenyurt',41.03,28.68);
  add('beylikduzu','Beylikdüzü',41.0,28.64);
  add('sariyer','Sarıyer',41.17,29.05);
  add('pendik','Pendik',40.88,29.23);
  const lines=['A','B'].map(code=>({code,name:code,districts:['Beyoğlu'],patterns:[{id:code,direction:'0',stops:['common','also-common'],name:code,variant:code,tripCount:1}]}));
  return {...network,stops,lines,stopLines:{common:['A','B'],'also-common':['A','B']}};
 }
 it('keeps hard choices nearby in the same district with exactly one common stop',()=>{
  const data=fixture(),localEngine=new QuizEngine(data);
  for(let seed=0;seed<30;seed++){
   const q=localEngine.make('common',data.lines[0],{...base,difficulty:'hard'},random(`common-${seed}`))!;
   expect(q).not.toBeNull();expect(localEngine.validate(q)).toBe(true);
   expect(q.options.filter(o=>o.id!==q.correctId).map(o=>o.id).sort()).toEqual(['near-0','near-1','near-2']);
   expect(q.options.filter(o=>localEngine.serves('A',o.id)&&localEngine.serves('B',o.id))).toHaveLength(1);
  }
 });
 it('skips sparse or unmapped hard questions instead of adding distant stops',()=>{
  const sparse=fixture(2);
  expect(new QuizEngine(sparse).make('common',sparse.lines[0],{...base,difficulty:'hard'},random('sparse'))).toBeNull();
  const unmapped=fixture();unmapped.stops.common.lat=null;unmapped.stops['also-common'].lat=null;
  expect(new QuizEngine(unmapped).make('common',unmapped.lines[0],{...base,difficulty:'hard'},random('unmapped'))).toBeNull();
 });
 it('preserves broader choices in easy mode',()=>{
  const data=fixture(0),localEngine=new QuizEngine(data);
  const q=localEngine.make('common',data.lines[0],base,random('easy-common'))!;
  expect(q).not.toBeNull();expect(localEngine.validate(q)).toBe(true);
  expect(q.options.some(o=>data.stops[o.id].district!=='Beyoğlu')).toBe(true);
 });
 it('keeps real hard questions local and reproducible',()=>{
  let produced=0;
  for(const district of ['Esenyurt','Beylikdüzü','Sarıyer','Pendik']){
   const eligible=network.lines.filter(l=>l.districts.includes(district));
   let districtProduced=0;
   for(let seed=0;seed<20;seed++){
    const config={...base,district,difficulty:'hard' as const};
    const q=engine.make('common',eligible[seed%eligible.length],config,random(`common-${district}-${seed}`));
    if(!q)continue;
    produced++;districtProduced++;independentlyCheck(q);
    expect(engine.make('common',eligible[seed%eligible.length],config,random(`common-${district}-${seed}`))).toEqual(q);
    const anchor=engine.groups.get(q.correctId)!;
    for(const o of q.options){
     const stop=engine.groups.get(o.id)!;
     expect(stop.district).toBe(district);
     const distance=Math.hypot((stop.lat!-anchor.lat!)*111.2,(stop.lon!-anchor.lon!)*111.2*Math.cos(anchor.lat!*Math.PI/180));
     expect(distance).toBeLessThan(10.1);
    }
   }
   expect(districtProduced).toBeGreaterThan(0);
  }
  expect(produced).toBeGreaterThan(20);
 });
});
describe('progress and rewards',()=>{
 const session:Session={id:'test-1',config:{...base,mode:'daily'},version:network.version,engineVersion:ENGINE_VERSION,day:'2026-10-03',answers:Array.from({length:5},(_,i)=>({questionId:String(i),optionId:'a',correct:true})),index:4,deadline:null,startedAt:0};
 it('awards a completion once and prevents duplicate daily XP',()=>{const r=resultFrom(session,5),p=record(emptyProgress(),r);expect(p.xp).toBe(130);expect(p.badges).toContain('perfect');expect(record(p,r)).toBe(p);expect(record(p,{...r,id:'second-attempt'})).toBe(p);});
 it('updates the daily streak only on consecutive dates',()=>{const p=record(emptyProgress(),resultFrom(session,5));const next=record(p,resultFrom({...session,id:'next',day:'2026-10-04'},5));expect(next.streak).toBe(2);const gap=record(next,resultFrom({...session,id:'gap',day:'2026-10-06'},5));expect(gap.streak).toBe(1);});
 it('counts unanswered timed questions as incomplete and grants no completion XP without answers',()=>{const r=resultFrom({...session,config:{...base,mode:'quick'},answers:[]},10);expect(r.correct).toBe(0);expect(r.total).toBe(10);expect(r.xp).toBe(0);});
});

describe('local and varied three-line choices',()=>{
 function fixture(nearbyCount=8):Network{
  const data:Network={...network,lines:[],stops:{},stopLines:{}};
  data.stops.anchor={id:'anchor',code:'anchor',name:'Test Durağı',group:'anchor',district:'Beyoğlu',lat:41.036,lon:28.977};
  const add=(code:string,lat:number,lon:number,district:string,serving=false)=>{
   const ids=Array.from({length:4},(_,i)=>`${code}-${i}`);
   for(const [i,id] of ids.entries())data.stops[id]={id,code:id,name:id,group:id,district,lat:lat+i*.0001,lon};
   if(serving)ids[0]='anchor';
   data.lines.push({code,name:code,stopIds:ids,districts:[district],patterns:[{id:code,direction:'0',stops:ids,name:code,variant:code,tripCount:1}]});
   for(const id of ids)(data.stopLines[data.stops[id].group]??=[]).push(code);
  };
  for(let i=1;i<=3;i++)add(`G${i}`,41.036,28.977,'Beyoğlu',true);
  for(let i=1;i<=nearbyCount;i++)add(`N${i}`,41.036+i*.003,28.977,'Beyoğlu');
  add('SILIVRI',41.08,28.2,'Silivri');
  add('TUZLA',40.83,29.3,'Tuzla');
  // Across the strait, geographically close but not a local same-bank line.
  add('ASIAN',41.034,29.0,'Üsküdar');
  return data;
 }
 it('varies whole triples, excludes distant and cross-bank lines, and keeps one true answer',()=>{
  const data=fixture(),localEngine=new QuizEngine(data);
  for(const difficulty of ['easy','hard'] as const)for(let seed=0;seed<30;seed++){
   const q=localEngine.make('at-stop',data.lines[0],{...base,difficulty},random(`nearby-${seed}`))!;
   expect(q).not.toBeNull();expect(localEngine.validate(q)).toBe(true);
   const sets=Object.values(q.evidence.sets!);
   expect(sets.filter(s=>s.every(c=>c.startsWith('G')))).toHaveLength(1);
   for(const [i,set] of sets.entries()){
    expect(set.every(c=>c.startsWith('G')||c.startsWith('N'))).toBe(true);
    expect(new Set(set).size).toBe(3);
    for(const other of sets.slice(i+1))expect(set.filter(c=>other.includes(c)).length).toBeLessThanOrEqual(1);
   }
   const wrongId=q.options.find(o=>o.id!==q.correctId)!.id;
   const invalid=structuredClone(q);
   const badIndex=invalid.evidence.sets![wrongId].findIndex(c=>c.startsWith('N'));
   invalid.evidence.sets![wrongId][badIndex]='SILIVRI';
   expect(localEngine.validate(invalid)).toBe(false);
  }
 });
 it('does not fill sparse areas with unrelated city-wide lines',()=>{
  const data=fixture(2),localEngine=new QuizEngine(data);
  expect(localEngine.make('at-stop',data.lines[0],base,random('sparse'))).toBeNull();
 });
 it('generates diverse nearby choices in Beyoğlu, Tuzla and Silivri using real stops',()=>{
  for(const district of ['Beyoğlu','Tuzla','Silivri']){
   let produced=0;
   const eligible=network.lines.filter(l=>l.districts.includes(district));
   for(let seed=0;seed<30;seed++){
    const q=engine.make('at-stop',eligible[seed%eligible.length],{...base,district},random(`${district}-${seed}`));
    if(!q)continue;
    produced++;independentlyCheck(q);
    const anchor=engine.groups.get(q.evidence.groups![0])!;
    for(const code of Object.values(q.evidence.sets!).flat()){
     if(rawGroups(code).has(anchor.group))continue;
     const line=network.lines.find(l=>l.code===code)!;
     // Independent local planar calculation, sufficient for this <=10 km bound.
     const distances=line.stopIds!.map(id=>network.stops[id]).filter(s=>s.lat!==null&&s.lon!==null).map(s=>Math.hypot((s.lat!-anchor.lat!)*111.2,(s.lon!-anchor.lon!)*111.2*Math.cos(anchor.lat!*Math.PI/180)));
     expect(Math.min(...distances)).toBeLessThan(10.1);
    }
   }
   expect(produced).toBeGreaterThan(10);
  }
 });
});
