import L from 'leaflet';

export function busStopIcon() {
  return L.divIcon({
    className:'bus-stop-marker route-stop',
    html:'<span class="bus-stop-pin"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 3v8M16 3v8M7 19v2M17 19v2M8 15h.01M16 15h.01"/></svg></span>',
    iconSize:[34,42],iconAnchor:[17,40],tooltipAnchor:[0,-36],
  });
}
