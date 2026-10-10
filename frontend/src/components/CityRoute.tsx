/** Decorative route sketch, intentionally not a geographic map. */
export default function CityRoute() {
  return <svg className="city-route" viewBox="0 0 430 300" fill="none" aria-hidden="true">
    <path d="M253 -20C326 52 191 87 258 143S383 172 367 220S287 286 322 330" stroke="currentColor" strokeWidth="68" className="route-water" />
    <g stroke="currentColor" strokeWidth="1" className="route-streets">
      <path d="M20 40L165 120L78 290M5 110L202 207L193 310M65 0L122 102L38 185M4 212L167 276M129 0L193 88M305 34L419 94M317 105L414 166M386 182L423 242M93 56L6 78M98 177L199 116M176 158L222 56M207 252L247 302" />
      <path d="M-10 145L122 213L177 107L107 23M57 314L117 272L51 242M345 46L336 83L422 129M407 282L379 256L425 204" />
    </g>
    <path d="M55 218H119C141 218 151 207 151 185V138C151 115 162 105 185 105H284C306 105 319 91 319 69V48" className="route-track-shadow" strokeWidth="13" strokeLinecap="round" />
    <path d="M55 218H119C141 218 151 207 151 185V138C151 115 162 105 185 105H284C306 105 319 91 319 69V48" className="route-track" strokeWidth="5" strokeLinecap="round" />
    <g className="route-station" strokeWidth="4"><circle cx="55" cy="218" r="7" /><circle cx="151" cy="161" r="7" /><circle cx="227" cy="105" r="7" /><circle cx="319" cy="48" r="7" /></g>
    <g className="route-place"><text x="35" y="247">Karaköy</text><text x="113" y="147">Taksim</text><text x="205" y="87">Beşiktaş</text><text x="332" y="53">Ortaköy</text></g>
    <g transform="translate(264 109) rotate(-10)">
      <rect x="-28" y="-31" width="56" height="62" rx="17" className="route-bus-shadow" />
      <rect x="-25" y="-29" width="50" height="56" rx="15" fill="#ffca65" />
      <rect x="-14" y="-16" width="28" height="28" rx="7" fill="#573d1a" />
      <rect x="-10" y="-11" width="20" height="12" rx="3" fill="#fff3d3" />
      <path d="M-7 -21H7M-10 13V17M10 13V17" stroke="#573d1a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-8" cy="7" r="2" fill="#ffca65" /><circle cx="8" cy="7" r="2" fill="#ffca65" />
    </g>
    <g transform="translate(46 40)"><circle r="16" className="route-compass" /><path d="M0 -8L5 6L0 3L-5 6Z" fill="currentColor" /></g>
  </svg>;
}
