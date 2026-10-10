export interface Stop { id: string; code: string; name: string; group: string; district: string; lat: number | null; lon: number | null }
export interface Pattern { id: string; direction: string; stops: string[]; name: string; variant: string; tripCount: number }
export interface Line { code: string; name: string; patterns: Pattern[]; stopIds?: string[]; districts: string[] }
export interface Network { schemaVersion: number; version: string; meta: { source: string; sourceUrl: string; license: string; licenseUrl: string; dataDate: string | null; downloadedAt: string; enrichment: string | null; warnings: string[]; counts: { lines: number; stops: number; groups: number; patterns: number } }; lines: Line[]; stops: Record<string, Stop>; stopLines: Record<string, string[]> }
export type Kind = 'not-stop' | 'not-line' | 'endpoints' | 'direct' | 'common' | 'map' | 'order' | 'at-stop' | 'transfer';
export type Mode = 'quick' | 'daily' | 'survival' | 'expert' | 'district' | 'duel';
export type Difficulty = 'easy' | 'hard';
export interface Option { id: string; label: string }
export interface Question { id: string; kind: Kind; prompt: string; options: Option[]; correctId: string; explanation: string; lineCode: string; patternId: string; stopIds: string[]; evidence: { groups?: string[]; otherLine?: string; sequences?: Record<string,string[]>; sets?: Record<string,string[]> } }
export interface Config { mode: Mode; difficulty: Difficulty; line?: string; district?: string; districts?: string[]; seed: string; count: number }
export interface Answer { questionId: string; optionId: string; correct: boolean }
export interface Result { id: string; date: string; day: string; mode: Mode; difficulty: Difficulty; score: number; total: number; correct: number; xp: number; answers: Answer[]; seed: string; version: string; hintsUsed?: number }
export interface Progress { xp: number; results: Result[]; daily: Record<string,Result>; streak: number; lastDay: string; badges: string[] }
