import type { Config, Kind, Line, Network, Option, Pattern, Question, Stop } from './types';
export const ENGINE_VERSION = '6';
export const KIND_LABELS: Record<Kind,string> = { 'not-stop':'Durak dedektifi', 'not-line':'Hattı yakala', endpoints:'Nereden nereye?', direct:'Rota bulucu', common:'Yollar kesişince', map:'Haritayı oku', order:'Durak sırası', 'at-stop':'Bu duraktan geçenler', transfer:'Aktarma zamanı' };
export function random(seed: string) { let h=2166136261; for (const c of seed) h=Math.imul(h^c.charCodeAt(0),16777619); return () => { h+=0x6D2B79F5; let t=h; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
export function shuffled<T>(items: readonly T[], rng:()=>number): T[] { const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const unique = <T,>(a:T[])=>[...new Set(a)];
const ANATOLIAN_DISTRICTS = new Set(['Adalar','Ataşehir','Beykoz','Çekmeköy','Kadıköy','Kartal','Maltepe','Pendik','Sancaktepe','Sultanbeyli','Şile','Tuzla','Ümraniye','Üsküdar']);
const NEARBY_RADII_KM = [3, 6, 10];
function distanceKm(a:Stop,b:Stop){
  const radians=Math.PI/180;
  const lat=(b.lat!-a.lat!)*radians,lon=(b.lon!-a.lon!)*radians;
  const h=Math.sin(lat/2)**2+Math.cos(a.lat!*radians)*Math.cos(b.lat!*radians)*Math.sin(lon/2)**2;
  return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function normalize(value:string){return value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');}
export function istanbulDay(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function dailySeed(day:string,version:string){return `daily:${ENGINE_VERSION}:${version}:${day}`;}
export class QuizEngine {
  lines = new Map<string,Line>(); groups = new Map<string,Stop>(); lineGroups = new Map<string,Set<string>>(); groupList:string[]; districtGroups = new Map<string,string[]>();
  private stopLineCodes = new Map<string,string[]>();
  private nearbyCache = new Map<string,{code:string;distance:number}[]>();
  private nearbyStopCache = new Map<string,{group:string;distance:number}[]>();
  constructor(public network:Network) {
    for(const stop of Object.values(network.stops)) if(!this.groups.has(stop.group)) this.groups.set(stop.group,stop);
    this.groupList=[...this.groups.keys()].sort();
    for(const group of this.groupList){const d=this.groups.get(group)!.district;this.districtGroups.set(d,[...(this.districtGroups.get(d)||[]),group]);}
    for(const line of network.lines){
      const stopIds=unique(line.stopIds||line.patterns.flatMap(p=>p.stops));
      this.lines.set(line.code,line);
      this.lineGroups.set(line.code,new Set(stopIds.map(s=>network.stops[s].group)));
      for(const id of stopIds){
        const codes=this.stopLineCodes.get(id)||[];
        codes.push(line.code);this.stopLineCodes.set(id,codes);
      }
    }
  }
  label(group:string){const s=this.groups.get(group)!;return `${s.name}${s.district ? ` · ${s.district}` : ''}`;}
  serves(code:string,group:string){return this.lineGroups.get(code)?.has(group)??false;}
  ordered(code:string,groups:string[]){return this.lines.get(code)?.patterns.some(p=>{const seq=p.stops.map(id=>this.network.stops[id].group);let after=-1;return groups.every(g=>{after=seq.indexOf(g,after+1);return after>=0;});})??false;}
  private nearbyStopGroups(group:string){
    const cached=this.nearbyStopCache.get(group);if(cached)return cached;
    const anchor=this.groups.get(group);
    if(!anchor?.district||anchor.lat===null||anchor.lon===null)return [];
    const nearby=this.groupList.flatMap(id=>{
      const stop=this.groups.get(id)!;
      if(id===group||!stop.district||stop.lat===null||stop.lon===null||ANATOLIAN_DISTRICTS.has(stop.district)!==ANATOLIAN_DISTRICTS.has(anchor.district))return [];
      const distance=distanceKm(anchor,stop);
      return distance<=10?[{group:id,distance}]:[];
    }).sort((a,b)=>a.distance-b.distance||a.group.localeCompare(b.group,'en'));
    this.nearbyStopCache.set(group,nearby);
    return nearby;
  }
  private nearbyNonServingLines(group:string){
    const cached=this.nearbyCache.get(group);if(cached)return cached;
    const anchor=this.groups.get(group);
    if(!anchor?.district||anchor.lat===null||anchor.lon===null)return [];
    const distances=new Map<string,number>();
    for(const [id,codes] of this.stopLineCodes){
      const stop=this.network.stops[id];
      if(!stop.district||stop.lat===null||stop.lon===null||ANATOLIAN_DISTRICTS.has(stop.district)!==ANATOLIAN_DISTRICTS.has(anchor.district))continue;
      const distance=distanceKm(anchor,stop);
      if(distance>10)continue;
      for(const code of codes){
        if(!this.serves(code,group)&&distance<(distances.get(code)??Infinity))distances.set(code,distance);
      }
    }
    // Physical stop membership avoids borrowing a nearby coordinate from a
    // different platform with the same name. Never fall back to city-wide lines.
    const nearby=[...distances].map(([code,distance])=>({code,distance})).sort((a,b)=>a.distance-b.distance||a.code.localeCompare(b.code,'en'));
    this.nearbyCache.set(group,nearby);
    return nearby;
  }
  private threeLineChoices(group:string,rng:()=>number,allowed?:Set<string>):string[][]|null{
    const nearby=this.nearbyNonServingLines(group).filter(l=>!allowed||allowed.has(l.code));
    const goodPool=shuffled(this.network.stopLines[group]||[],rng).slice(0,12);
    const good=goodPool.slice(0,3);
    if(good.length<3)return null;
    for(const radius of NEARBY_RADII_KM){
      const bad=shuffled(nearby.filter(l=>l.distance<=radius).slice(0,24).map(l=>l.code),rng).slice(0,12);
      const pool=[...goodPool,...bad];
      if(!bad.length||pool.length<6)continue;
      const candidates:string[][]=[];
      for(let a=0;a<pool.length-2;a++)for(let b=a+1;b<pool.length-1;b++)for(let c=b+1;c<pool.length;c++){
        const triple=[pool[a],pool[b],pool[c]];
        if(triple.every(code=>this.serves(code,group)))continue;
        if(triple.filter(code=>good.includes(code)).length>1)continue;
        candidates.push(triple);
      }
      const choices=shuffled(candidates,rng);
      const sets=[good];
      let budget=10000;
      const complete=(from:number):boolean=>{
        if(sets.length===4)return true;
        for(let i=from;i<choices.length;i++){
          if(--budget<0)return false;
          const triple=choices[i];
          if(sets.some(s=>triple.filter(code=>s.includes(code)).length>1))continue;
          sets.push(triple);
          if(complete(i+1))return true;
          sets.pop();
        }
        return false;
      };
      // Backtracking also supports sparse areas with few non-serving lines.
      // A line may recur, but no pair of choices may share two lines.
      if(complete(0))return sets.map(s=>shuffled(s,rng));
    }
    return null;
  }
  generate(config:Config):Question[]{
    const rng=random(config.seed), result:Question[]=[],seen=new Set<string>();
    const types:Kind[]=['not-stop','not-line','endpoints','direct','common','map','order','at-stop'];
    const eligible=this.network.lines.filter(l=>(!config.line||l.code===config.line)&&(!config.district||l.districts.includes(config.district))&&(!config.districts||l.districts.some(d=>config.districts!.includes(d))));
    if(!eligible.length)throw new Error('Bu seçim için yeterli hat verisi bulunamadı.');
    for(let attempt=0;result.length<config.count&&attempt<config.count*100;attempt++){
      const line=eligible[Math.floor(rng()*eligible.length)];
      const baseKind=types[result.length%types.length];
      const kind=baseKind==='direct'&&config.difficulty==='hard'?'transfer':baseKind;
      const q=this.make(kind,line,config,rng) ?? this.make('not-stop',line,config,rng);
      if(q&&this.validate(q)&&!seen.has(q.id)){seen.add(q.id);result.push(q);}
    }
    if(result.length<config.count) throw new Error('Bu seçimle yeterli farklı soru oluşturulamadı. Başka bir hat veya ilçe seç.');
    return result;
  }
  make(kind:Kind,line:Line,config:Config,rng:()=>number):Question|null{
    const pick=<T,>(a:T[])=>a[Math.floor(rng()*a.length)];
    const pattern=line.patterns[0];
    const seq=pattern.stops.map(id=>this.network.stops[id].group);
    const lineGroups=[...this.lineGroups.get(line.code)!];
    const scope=config.district?[config.district]:config.districts;
    const local=(gs:string[])=>scope?gs.filter(g=>scope.includes(this.groups.get(g)!.district)):gs;
    const regionalLines=config.districts?this.network.lines.filter(l=>l.districts.some(d=>config.districts!.includes(d))):this.network.lines;
    const allowed=config.districts?new Set(regionalLines.map(l=>l.code)):undefined;
    let prompt='',explanation='',correctId='',options:Option[]=[],stopIds=[...pattern.stops];
    let evidence:Question['evidence']={};
    const opt=(id:string,label=id)=>({id,label});
    const served=(g:string)=>this.network.stopLines[g]||[];
    const lineOptions=(good:string[],bad:string[])=>{const a=pick(good);correctId=a;return [a,...shuffled(bad,rng).slice(0,3)].map(c=>opt(c));};
    if(kind==='not-stop'){
      const anchors=shuffled(local(lineGroups).filter(g=>{const s=this.groups.get(g)!;return !!s.district&&s.lat!==null&&s.lon!==null;}),rng);
      let valid:string[]=[],wrong:string|undefined;
      search:for(const radius of NEARBY_RADII_KM)for(const anchor of anchors){
        const nearby=this.nearbyStopGroups(anchor).filter(s=>s.distance<=radius&&(!scope||local([s.group]).length>0));
        const servedNearby=shuffled(nearby.filter(s=>this.serves(line.code,s.group)).map(s=>s.group),rng);
        if(servedNearby.length<2)continue;
        valid=[anchor,...servedNearby.filter(g=>distanceKm(this.groups.get(g)!,this.groups.get(servedNearby[0])!)<=radius).slice(0,2)];
        if(valid.length<3)continue;
        const alternatives=nearby.filter(s=>!this.serves(line.code,s.group)&&valid.every(g=>distanceKm(this.groups.get(g)!,this.groups.get(s.group)!)<=radius));
        wrong=pick(alternatives.slice(0,24))?.group;
        if(wrong)break search;
      }
      if(!wrong)return null;
      correctId=wrong;options=[...valid,wrong].map(g=>opt(g,this.label(g)));evidence={groups:[...valid,wrong]};
      prompt=`Hangisi ${line.code} hattının duraklarından biri değildir?`;
      explanation=`${this.label(wrong)}, bu veri setindeki ${line.code} seferlerinin hiçbirinde yer almıyor. Diğer üç durak, hattın en az bir güzergâhında bulunuyor.`;
      stopIds=valid.map(g=>(line.stopIds||line.patterns.flatMap(p=>p.stops)).find(id=>this.network.stops[id].group===g)!);
    } else if(kind==='not-line'){
      const group=pick(local(lineGroups).filter(g=>served(g).length>=3));if(!group)return null;
      const valid=shuffled(served(group),rng).slice(0,3);const bad=pick(regionalLines.filter(l=>!this.serves(l.code,group)));if(!bad)return null;
      correctId=bad.code;options=[...valid,bad.code].map(c=>opt(c));evidence={groups:[group]};stopIds=[this.groups.get(group)!.id];
      prompt=`Hangi hat ${this.label(group)} durağından geçmez?`;
      explanation=`${valid.join(', ')} bu durak grubuna uğrar. ${bad.code} hattının kayıtlı güzergâhlarında bu durak yok.`;
    } else if(kind==='endpoints'){
      if(config.district&&!local([seq[0],seq.at(-1)!]).length)return null;
      if(config.districts&&local([seq[0],seq.at(-1)!]).length!==2)return null;
      const end=seq.at(-1)!;
      const nearby=this.nearbyStopGroups(end).filter(s=>s.group!==seq[0]&&(!config.districts||local([s.group]).length>0));
      // Both difficulties use neighboring stops on the same bank. Sparse areas
      // can widen locally, but never fall back to unrelated city-wide choices.
      const radius=NEARBY_RADII_KM.find(r=>nearby.filter(s=>s.distance<=r).length>=3);
      if(radius===undefined)return null;
      const wrong=shuffled(nearby.filter(s=>s.distance<=radius).slice(0,24).map(s=>s.group),rng).slice(0,3);
      correctId=end;options=[end,...wrong].map(g=>opt(g,this.label(g)));evidence={groups:[seq[0],end]};
      prompt=`${line.code}, ana güzergâhında ${this.groups.get(seq[0])!.name} durağından nereye gider?`;
      explanation=`Veri setinde en fazla seferi olan güzergâh: ${this.label(seq[0])} → ${this.label(end)}. ${pattern.stops.length} durak; diğer yön ve varyantların uçları farklı olabilir.`;
    } else if(kind==='direct'){
      const pairs=seq.flatMap((a,i)=>seq.slice(i+3).map(b=>[a,b])).filter(([a,b])=>a!==b&&(!scope||(local([a,b]).length===2)));
      const pair=pick(pairs);if(!pair)return null;
      const good=[line.code];
      const bad=regionalLines.filter(l=>!this.ordered(l.code,pair)).map(l=>l.code);if(bad.length<3)return null;
      options=lineOptions(good,bad);evidence={groups:pair};
      prompt=`${this.label(pair[0])} → ${this.label(pair[1])}: hangi hatla aktarmasız gidilir?`;
      explanation=`${correctId}, bu iki durağa verilen sırayla uğruyor. Diğer seçeneklerde bu yönde doğrudan bir sefer yok. Soru, sefer saatlerini veya anlık değişiklikleri kapsamaz.`;
    } else if(kind==='transfer'){
      const middle=pick(local(unique(seq.slice(2,-2))).filter(g=>served(g).some(c=>c!==line.code)));if(!middle)return null;
      const start=pick(local(seq.slice(0,seq.indexOf(middle))).filter(g=>g!==middle));if(!start)return null;
      const other=pick(served(middle).filter(c=>c!==line.code));
      const otherPattern=pick(this.lines.get(other)!.patterns.filter(p=>p.stops.some(id=>this.network.stops[id].group===middle)));if(!otherPattern)return null;
      const secondSeq=otherPattern.stops.map(id=>this.network.stops[id].group);
      const end=pick(local(secondSeq.slice(secondSeq.indexOf(middle)+1)).filter(g=>g!==middle&&g!==start));if(!end)return null;
      const good=[line.code,other];
      const wrongFirst=shuffled(regionalLines.filter(l=>!this.ordered(l.code,[start,middle])).map(l=>l.code),rng);
      const wrongSecond=shuffled(regionalLines.filter(l=>!this.ordered(l.code,[middle,end])).map(l=>l.code),rng);
      if(wrongFirst.length<2||!wrongSecond.length)return null;
      const pairs=[good,[wrongFirst[0],other],[line.code,wrongSecond[0]],[wrongFirst[1],wrongSecond[0]]];
      correctId='pair-0';options=pairs.map((p,i)=>opt(`pair-${i}`,`${p[0]} → ${p[1]}`));evidence={groups:[start,middle,end],sets:Object.fromEntries(pairs.map((p,i)=>[`pair-${i}`,p]))};
      prompt=`${this.label(start)} → ${this.label(end)}: ${this.groups.get(middle)!.name} durağında aktarma yaparak hangi iki hatla gidilir?`;
      explanation=`Önce ${line.code} ile ${this.groups.get(start)!.name} → ${this.groups.get(middle)!.name}, sonra ${other} ile ${this.groups.get(end)!.name}. Her iki bölümde de durak sırası kontrol edildi. Aktarma aynı ad ve ilçedeki durak grubundadır; peronlar arası yürüyüş ve sefer saatleri hesaplanmaz.`;
      const firstSlice=pattern.stops.slice(seq.indexOf(start),seq.indexOf(middle)+1);
      const secondSlice=otherPattern.stops.slice(secondSeq.indexOf(middle),secondSeq.indexOf(end,secondSeq.indexOf(middle)+1)+1);
      stopIds=[...firstSlice,...secondSlice];
    } else if(kind==='common'){
      const anchor=pick(local(lineGroups).filter(g=>served(g).some(c=>c!==line.code)));if(!anchor)return null;
      const other=pick(served(anchor).filter(c=>c!==line.code));const intersection=local(lineGroups.filter(g=>this.serves(other,g)));
      const correct=pick(intersection);
      const stop=this.groups.get(correct)!;
      const candidates=config.difficulty==='hard'?(this.districtGroups.get(stop.district)||[]):local(this.groupList);
      const wrong=candidates.filter(g=>!this.serves(line.code,g)||!this.serves(other,g));
      let bad:string[];
      if(config.difficulty==='hard'){
        if(!stop.district||stop.lat===null||stop.lon===null)return null;
        const nearby=wrong.flatMap(g=>{
          const candidate=this.groups.get(g)!;
          return candidate.lat===null||candidate.lon===null?[]:[{group:g,distance:distanceKm(stop,candidate)}];
        });
        // Keep hard choices in the same district and immediate surroundings.
        // Sparse areas may widen to 10 km, but never to unrelated city-wide stops.
        const radius=NEARBY_RADII_KM.find(r=>nearby.filter(s=>s.distance<=r).length>=3);
        if(radius===undefined)return null;
        bad=shuffled(nearby.filter(s=>s.distance<=radius).map(s=>s.group),rng).slice(0,3);
      }else{
        bad=shuffled(wrong,rng).slice(0,3);
      }
      if(bad.length<3)return null;
      correctId=correct;options=[correct,...bad].map(g=>opt(g,this.label(g)));evidence={groups:[correct,...bad],otherLine:other};stopIds=[this.groups.get(correct)!.id];
      prompt=`${line.code} ile ${other} hatlarının ortak durağı hangisi?`;
      explanation=`Her iki hat da ${this.label(correct)} durak grubuna uğruyor. Diğer seçenekler bu iki hattın ortak durakları arasında değil.`;
    } else if(kind==='map'){
      if(config.district)return null;
      if(config.districts&&local(seq).length!==seq.length)return null;
      const points=pattern.stops.filter(id=>this.network.stops[id].lat!==null&&this.network.stops[id].lon!==null);if(points.length<4)return null;
      const signature=(p:Pattern)=>p.stops.map(id=>{const s=this.network.stops[id];return s.lat!==null&&s.lon!==null?`${s.lat},${s.lon}`:'';}).join('|');
      const shape=signature(pattern);
      const bad=regionalLines.filter(l=>!l.patterns.some(p=>signature(p)===shape)).map(l=>l.code);
      if(bad.length<3)return null;options=lineOptions([line.code],bad);stopIds=pattern.stops;
      prompt='Haritadaki durak dizisi hangi hatta ait?';
      explanation=`${line.code} · ${line.name}. Çizgi, durak konumlarını sırayla birleştirir; otobüsün izlediği yolların birebir geometrisi değildir.`;
    } else if(kind==='order'){
      const choices=shuffled(unique(local(seq)).filter(g=>seq.filter(s=>s===g).length===1),rng).slice(0,3);if(choices.length<3)return null;
      const ordered=choices.sort((a,b)=>seq.indexOf(a)-seq.indexOf(b));
      const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].map(p=>p.map(i=>ordered[i]));
      const picked=[ordered,...shuffled(permutations.slice(1),rng).slice(0,3)];
      correctId='sequence-0';options=picked.map((p,i)=>opt(`sequence-${i}`,p.map(g=>this.groups.get(g)!.name).join(' → ')));evidence={sequences:Object.fromEntries(picked.map((p,i)=>[`sequence-${i}`,p]))};
      prompt=`${line.code} ana güzergâhında, ${this.groups.get(seq[0])!.name} kalkışlı yönde doğru sıra hangisi?`;
      explanation=`En fazla seferi olan ${this.groups.get(seq[0])!.name} → ${this.groups.get(seq.at(-1)!)!.name} güzergâhındaki sıra: ${options[0].label}.`;
    } else {
      const group=pick(local(lineGroups).filter(g=>served(g).length>=3));if(!group)return null;
      const sets=this.threeLineChoices(group,rng,allowed);if(!sets)return null;
      const good=sets[0];
      correctId='set-0';options=sets.map((s,i)=>opt(`set-${i}`,s.join(' · ')));evidence={groups:[group],sets:Object.fromEntries(sets.map((s,i)=>[`set-${i}`,s]))};stopIds=[this.groups.get(group)!.id];
      prompt=`Hangi üç hattın tamamı ${this.label(group)} durağından geçer?`;
      explanation=`${good.join(', ')} hatlarının tamamı bu durak grubuna uğruyor. Diğer seçeneklerde aynı çevrede çalışan, ancak bu durağa uğramayan en az bir hat var.`;
    }
    if(options.length!==4)return null;
    const id=`${kind}:${line.code}:${pattern.id}:${options.map(o=>o.id).sort().join(',')}:${JSON.stringify(evidence)}`;
    return {id,kind,prompt,options:shuffled(options,rng),correctId,explanation,lineCode:line.code,patternId:pattern.id,stopIds,evidence};
  }
  validate(q:Question):boolean{
    if(q.options.length!==4||new Set(q.options.map(o=>o.id)).size!==4||new Set(q.options.map(o=>o.label)).size!==4)return false;
    const pattern=this.lines.get(q.lineCode)?.patterns.find(p=>p.id===q.patternId);if(!pattern)return false;
    const groups=q.evidence.groups||[];
    if(q.kind==='at-stop'){
      const sets=q.options.map(o=>q.evidence.sets?.[o.id]);
      if(sets.some(s=>!s||s.length!==3||new Set(s).size!==3||s.some(c=>!this.lines.has(c))))return false;
      if(sets.some((s,i)=>sets.slice(i+1).some(other=>s!.filter(c=>other!.includes(c)).length>1)))return false;
      const nearby=new Set(this.nearbyNonServingLines(groups[0]).map(l=>l.code));
      if(sets.some(s=>s!.some(c=>!this.serves(c,groups[0])&&!nearby.has(c))))return false;
    }
    const isCorrect=(o:Option)=>{
      switch(q.kind){
        case 'not-stop':return !this.serves(q.lineCode,o.id);
        case 'not-line':return !this.serves(o.id,groups[0]);
        case 'endpoints':return o.id===this.network.stops[pattern.stops.at(-1)!].group;
        case 'direct':return this.ordered(o.id,groups);
        case 'transfer':{const pair=q.evidence.sets![o.id];return this.ordered(pair[0],groups.slice(0,2))&&this.ordered(pair[1],groups.slice(1));}
        case 'common':return this.serves(q.lineCode,o.id)&&this.serves(q.evidence.otherLine!,o.id);
        case 'map':{const sig=(p:Pattern)=>p.stops.map(s=>{const x=this.network.stops[s];return x.lat!==null&&x.lon!==null?`${x.lat},${x.lon}`:'';}).join('|');return this.lines.get(o.id)?.patterns.some(p=>sig(p)===sig(pattern))??false;}
        case 'order':{const seq=pattern.stops.map(s=>this.network.stops[s].group);let i=-1;return q.evidence.sequences![o.id].every(g=>{i=seq.indexOf(g,i+1);return i>=0;});}
        case 'at-stop':return q.evidence.sets![o.id].every(c=>this.serves(c,groups[0]));
      }
    };
    const correct=q.options.filter(isCorrect);return correct.length===1&&correct[0].id===q.correctId;
  }
}
