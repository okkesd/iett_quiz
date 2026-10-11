import { Lightbulb } from 'lucide-react';
import type { Network } from '../lib/types';
import type { QuestionHint } from '../lib/hints';
import RouteMap from './RouteMap';

export default function HintPanel({hint,network}:{hint:QuestionHint;network:Network}) {
  return <section className="hint-panel" id="question-hint-panel" aria-labelledby="hint-title">
    <h2 id="hint-title"><Lightbulb size={19}/>{hint.title}</h2>
    <p role="status">{hint.text}</p>
    {hint.map && <RouteMap network={network} stopIds={hint.map.stopIds} reveal={false} connect={false} labels={hint.map.labels} stationMarkers/>}
  </section>;
}
