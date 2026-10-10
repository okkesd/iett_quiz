import { useEffect,useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Line, Network } from '../lib/types';
export default function RouteMap({network,stopIds,reveal=true,connect=true,labels,excludedLine}:{network:Network;stopIds:string[];reveal?:boolean;connect?:boolean;labels?:string[];excludedLine?:Line}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!container.current)return;
  const stops=stopIds.map(id=>network.stops[id]).filter(s=>s&&s.lat!==null&&s.lon!==null);
  const map=L.map(container.current,{scrollWheelZoom:false,attributionControl:true,zoomControl:true});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const points=stops.map(s=>[s.lat!,s.lon!] as [number,number]);
  const boundsPoints=[...points];
  if(excludedLine){
   const seen=new Set<string>();
   for(const pattern of excludedLine.patterns){
    const signature=pattern.stops.join('|');
    if(seen.has(signature))continue;
    seen.add(signature);
    let segment:[number,number][]=[];
    const drawSegment=()=>{
     if(segment.length>1){
      const label=document.createElement('span');
      label.textContent=`${excludedLine.code} · ${pattern.name || pattern.direction}`;
      L.polyline(segment,{color:'#ea580c',weight:4,opacity:.7}).bindTooltip(label).addTo(map);
     }
     segment=[];
    };
    for(const id of pattern.stops){
     const stop=network.stops[id];
     if(stop?.lat==null||stop.lon==null){drawSegment();continue;}
     const point:[number,number]=[stop.lat,stop.lon];
     segment.push(point);boundsPoints.push(point);
    }
    drawSegment();
   }
  }
  if(points.length){
   if(connect)L.polyline(points,{className:'route-path',color:'#274b40',weight:4,opacity:.85}).addTo(map);
   stops.forEach((s,i)=>{
    const edge=!connect||i===0||i===stops.length-1;
    const marker=L.circleMarker([s.lat!,s.lon!],{className:edge?'route-stop route-endpoint':'route-stop',radius:edge?7:3,color:'#274b40',weight:2,fillColor:edge?'#e8f574':'#fff',fillOpacity:1}).addTo(map);
    const hintLabel=labels?.[stopIds.indexOf(s.id)];
    if(reveal||hintLabel){const label=document.createElement('span');label.textContent=hintLabel||`${i+1}. ${s.name}${s.district?` · ${s.district}`:''}`;marker.bindTooltip(label,{permanent:!!hintLabel,direction:hintLabel?'top':'auto'});}
   });
  }
  if(boundsPoints.length)map.fitBounds(L.latLngBounds(boundsPoints),{padding:[36,36],maxZoom:15});
  else map.setView([41.025,28.97],11);
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(container.current);
  return ()=>{observer.disconnect();map.remove();};
 },[network,stopIds,reveal,connect,labels,excludedLine]);
 return <div className="map-wrap"><div ref={container} className="route-map" role="img" aria-label={excludedLine?'Sorulan durak ve buradan geçmeyen hattın güzergâhları':connect?'Durakların konumlarını gösteren etkileşimli harita':'İpucu konumlarını gösteren etkileşimli harita'}/><div className="map-note">{excludedLine?`Yeşil işaret: sorulan durak · Turuncu: ${excludedLine.code} hattının kayıtlı yön ve varyantları · Çizgiler duraklar arası şematiktir, gerçek yol geometrisi değildir`:connect?'Duraklar arası şematik çizgi':'İşaretler ipucu konumlarını gösterir'} · Alt harita için internet gerekir</div></div>;
}
