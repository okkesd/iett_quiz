import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { questionHint } from '../src/lib/hints';
import { dailySeed, ENGINE_VERSION, QuizEngine } from '../src/lib/quiz';
import { resultFrom, type Session } from '../src/lib/storage';
import type { Config, Kind, Network, Question } from '../src/lib/types';

const network: Network = JSON.parse(readFileSync('public/data/network.json', 'utf8'));
const engine = new QuizEngine(network);
const config: Config = { mode:'expert', line:'77A', difficulty:'easy', seed:'hint-test', count:24 };
const questions: Question[] = [];
for (let i=0; i<8; i++) questions.push(...engine.generate({...config,seed:`hint-${i}`,difficulty:i%2?'hard':'easy'}));
const sample = (kind: Kind) => questions.find(q => q.kind === kind)!;

describe('question-specific hints', () => {
  it('covers all question types without eliminating any choice', () => {
    expect(new Set(questions.map(q=>q.kind)).size).toBe(9);
    for (const q of questions) {
      const hint=questionHint(engine,q);
      expect(hint.title).toBeTruthy(); expect(hint.text).toBeTruthy();
      expect(hint.eliminatedOptionIds).toEqual([]);
      for (const id of hint.map?.stopIds??[]) {
        expect(network.stops[id].lat).not.toBeNull(); expect(network.stops[id].lon).not.toBeNull();
      }
    }
  });
  it('uses the actual common stop location without including its name or a tooltip label', () => {
    const q=sample('common'),hint=questionHint(engine,q);
    const stop=network.stops[hint.map!.stopIds[0]];
    expect(stop.group).toBe(q.correctId);
    expect(hint.map!.labels).toBeUndefined();
    expect(hint.text).not.toContain(stop.name);
    expect(hint.eliminatedOptionIds).toEqual([]);
  });
  it('draws direct-route endpoints in travel order and gives an intermediate stop from that sequence', () => {
    const q=sample('direct'),hint=questionHint(engine,q);
    expect(hint.map!.stopIds.map(id=>network.stops[id].group)).toEqual(q.evidence.groups);
    const pattern=engine.lines.get(q.lineCode)!.patterns.find(p=>p.id===q.patternId)!;
    const start=pattern.stops.indexOf(hint.map!.stopIds[0]),end=pattern.stops.indexOf(hint.map!.stopIds[1],start+1);
    expect(end).toBeGreaterThan(start);
    expect(pattern.stops.slice(start+1,end).some(id=>hint.text.includes(network.stops[id].name))).toBe(true);
    expect(hint.map!.labels).toEqual(['A · Başlangıç','B · Varış']);
  });
  it('shows factual location and first-leg clues without eliminating choices', () => {
    for (const kind of ['not-stop','not-line','at-stop','transfer'] as const) {
      const q=sample(kind),hint=questionHint(engine,q);
      expect(hint.eliminatedOptionIds).toEqual([]);
      if (kind==='not-stop') {
        expect(hint.map!.stopIds.map(id=>network.stops[id].group)).toEqual(q.options.map(o=>o.id));
        expect(hint.map!.labels).toEqual(['A','B','C','D']);
      } else if (kind==='transfer') {
        expect(hint.text).toContain(q.evidence.sets![q.correctId][0]);
        expect(hint.text).toContain(engine.groups.get(q.evidence.groups![1])!.name);
      } else {
        expect(hint.map!.stopIds.map(id=>network.stops[id].group)).toEqual([q.evidence.groups![0]]);
      }
    }
  });
  it('preserves question generation and gives the same hint after a reload', () => {
    const cfg={...config,mode:'daily' as const,count:5,seed:dailySeed('2026-10-04',network.version)};
    const before=engine.generate(cfg);
    for(const q of before)expect(questionHint(engine,q)).toEqual(questionHint(new QuizEngine(network),q));
    expect(engine.generate(cfg)).toEqual(before);
  });
  it('falls back safely when map coordinates are unavailable', () => {
    const q=sample('common'),stop=engine.groups.get(q.correctId)!;
    const data=structuredClone(network);data.stops[stop.id].lat=null;
    const hint=questionHint(new QuizEngine(data),q);
    expect(hint.map).toBeUndefined();expect(hint.eliminatedOptionIds).toEqual([]);
    expect(hint.text).toContain('konum bilgisi mevcut değil');
    expect(hint.eliminatedOptionIds).not.toContain(q.correctId);
  });
  it('counts hinted questions once, keeps points unchanged, and supports old saves', () => {
    const session:Session={id:'hints',config,version:network.version,engineVersion:ENGINE_VERSION,day:'2026-10-04',index:0,deadline:null,startedAt:0,answers:[{questionId:'a',optionId:'x',correct:true}]};
    const ordinary=resultFrom(session,10);
    const withHints=resultFrom({...session,hintedQuestionIds:['a','a','b']},10);
    expect(ordinary.hintsUsed).toBe(0);expect(withHints.hintsUsed).toBe(2);
    expect(withHints.score).toBe(ordinary.score);expect(withHints.xp).toBe(ordinary.xp);
  });
});
