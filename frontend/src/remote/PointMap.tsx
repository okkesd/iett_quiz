import { useEffect,useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
export default function PointMap({points,connect=false}:{points:{lat:number;lon:number;label?:string|null}[];connect?:boolean}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!container.current||!points.length)return;
  const map=L.map(container.current,{scrollWheelZoom:false});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const coords=points.map(p=>[p.lat,p.lon] as [number,number]);
  if(connect)L.polyline(coords,{className:'route-path',weight:4}).addTo(map);
  points.forEach(p=>{const marker=L.circleMarker([p.lat,p.lon],{className:'route-stop route-endpoint',radius:connect?4:7,fillOpacity:1}).addTo(map);if(p.label){const text=document.createElement('span');text.textContent=p.label;marker.bindTooltip(text,{permanent:true,direction:'top'});}});
  map.fitBounds(L.latLngBounds(coords),{padding:[28,28],maxZoom:15});
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(container.current);
  return ()=>{observer.disconnect();map.remove();};
 },[points,connect]);
 return <div className="map-wrap"><div ref={container} className="route-map" role="img" aria-label="Soru konumlarını gösteren harita"/><div className="map-note">{connect?'Duraklar arası şematik çizgi · ':''}Alt harita için internet gerekir</div></div>;
}
