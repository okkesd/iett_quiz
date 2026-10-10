import { QuizEngine, random, shuffled } from './quiz';
import type { Question } from './types';

export interface QuestionHint {
  title: string;
  text: string;
  eliminatedOptionIds: [];
  map?: { stopIds: string[]; labels?: string[] };
}

/** Independent seed: opening a hint never changes the question sequence. */
export function questionHint(engine: QuizEngine, question: Question): QuestionHint {
  const rng = random(`hint-v1:${question.id}`);
  const groups = question.evidence.groups ?? [];
  const pattern = engine.lines.get(question.lineCode)!.patterns.find(p => p.id === question.patternId)!;
  const stops = engine.network.stops;
  const groupStop = (group: string) => engine.groups.get(group)!;
  const located = (id: string) => stops[id]?.lat != null && stops[id]?.lon != null;
  const locationHint = (title: string, text: string, stopIds: string[], labels?: string[]): QuestionHint => {
    const available = stopIds.some(located);
    const missing = stopIds.some(id => !located(id));
    return {
      title,
      text: available
        ? `${text}${missing ? ' Konumu bilinmeyen duraklar haritada gösterilemiyor.' : ''}`
        : 'Bu durakların konum bilgisi mevcut değil; harita ipucu gösterilemiyor.',
      eliminatedOptionIds: [],
      ...(available ? { map: { stopIds, labels } } : {}),
    };
  };

  switch (question.kind) {
    case 'common':
      return locationHint(
        'Ortak durağın konumu',
        'İşaret, iki hattın ortak durağının yerini gösteriyor. Durak adı gizli; çevredeki sokaklardan yola çık.',
        [groupStop(question.correctId).id],
      );
    case 'not-stop':
      return locationHint(
        'Seçeneklerdeki durakların konumları',
        'A, B, C ve D işaretleri aynı harfli seçeneklerin duraklarını gösteriyor. Hattın güzergâhını düşünerek karşılaştır.',
        question.options.map(option => groupStop(option.id).id),
        question.options.map((_, i) => 'ABCD'[i]),
      );
    case 'not-line':
    case 'at-stop':
      return locationHint(
        'Sorulan durağın konumu',
        'İşaret, soruda adı geçen durağı gösteriyor. Çevresindeki semtleri ve buradan geçen güzergâhları düşün.',
        [groupStop(groups[0]).id],
      );
    case 'endpoints': {
      const end = stops[pattern.stops.at(-1)!];
      const previous = stops[pattern.stops.at(-2)!];
      const clues = [end.district ? `Son durak ${end.district} ilçesinde.` : ''];
      if (previous.name !== end.name) clues.push(`Ana güzergâhta ondan hemen önce ${previous.name} durağı var.`);
      if (!clues.some(Boolean)) clues.push(`Bu yöndeki ana güzergâhta ${pattern.stops.length} durak var.`);
      return { title: 'Son durağa yaklaşırken', text: clues.filter(Boolean).join(' '), eliminatedOptionIds: [] };
    }
    case 'direct': {
      const sequence = pattern.stops.map(id => stops[id].group);
      const from = sequence.indexOf(groups[0]);
      const to = sequence.indexOf(groups[1], from + 1);
      const between = pattern.stops.slice(from + 1, to).filter(id => !groups.includes(stops[id].group));
      const middle = between[Math.floor(between.length / 2)];
      const endpoints = [pattern.stops[from], pattern.stops[to]];
      return {
        title: 'Yolun üzerindeki bir durak',
        text: `${middle ? `Bu yöndeki yolculukta ${stops[middle].name} durağından da geçiliyor. ` : ''}Önce A noktasına, sonra B noktasına uğrayan hattı düşün.`,
        eliminatedOptionIds: [],
        ...(endpoints.every(located) ? { map: { stopIds: endpoints, labels: ['A · Başlangıç', 'B · Varış'] } } : {}),
      };
    }
    case 'map': {
      const first = stops[pattern.stops[0]], last = stops[pattern.stops.at(-1)!];
      return {
        title: 'Güzergâhın iki ucu',
        text: `Başlangıç: ${engine.label(first.group)}. Varış: ${engine.label(last.group)}. Bu iki noktayı bağlayan hattı düşün.`,
        eliminatedOptionIds: [],
      };
    }
    case 'order': {
      const sequences = question.evidence.sequences!;
      const correct = sequences[question.correctId];
      const pairs = shuffled(correct.flatMap((a, i) => correct.slice(i + 1).map(b => [a, b])), rng);
      for (const [a, b] of pairs) {
        const remaining = Object.values(sequences).filter(s => s.indexOf(a) < s.indexOf(b)).length;
        // A partial order should help, without identifying the sole answer.
        if (remaining < 2 || remaining > 3) continue;
        return {
          title: 'İki durağın sırasını çöz',
          text: `Bu yönde ${groupStop(a).name}, ${groupStop(b).name} durağından önce gelir. Diğer durağı bu sıraya yerleştir.`,
          eliminatedOptionIds: [],
        };
      }
      return {
        title: 'Yolculuğun yönünü düşün',
        text: 'Soruda belirtilen yolculuk yönünü esas al. Dönüş yönünde durakların sırası değişebilir.',
        eliminatedOptionIds: [],
      };
    }
    case 'transfer': {
      const sets = question.evidence.sets!;
      const first = sets[question.correctId][0];
      return {
        title: 'İlk hattı buldun',
        text: `Başlangıçtan ${groupStop(groups[1]).name} aktarma durağına ${first} hattıyla gidebilirsin. Şimdi ikinci hattın varış durağına doğru yönde gidip gitmediğini düşün.`,
        eliminatedOptionIds: [],
      };
    }
  }
}
