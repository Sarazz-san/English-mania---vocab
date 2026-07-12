export type Pos = 'n' | 'v' | 'adj' | 'adv' | 'prep' | 'conj' | 'pron' | 'interj' | 'art' | 'phrasal_v' | 'expr';
export type Register = 'academic' | 'neutral' | 'conversational';
export type Source = 'seed' | 'import';
export type WordStatus = 'new' | 'learning' | 'acquired' | 'leech';
export type ReviewMode = 'recognition' | 'production' | 'exposure';

export interface Word {
  id: string;
  en: string;
  fr: string;
  pos: Pos;
  register: Register;
  source: Source;
  context: string | null;
  notes: string | null;
  dateAdded: number; // timestamp
  archived: boolean;
}

export interface Progress {
  wordId: string;
  box: number; // 1 to 6
  status: WordStatus;
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  consecutiveResets: number;
  lastReviewedAt: number | null;
  nextDueAt: number; // timestamp
  exposureCount: number;
  box6CorrectCount?: number; // count of consecutive correct reviews in Box 6 for maintenance spacing (30 -> 60 -> 90 days)
}

export interface ReviewLog {
  id: string;
  wordId: string;
  timestamp: number;
  mode: ReviewMode;
  correct: boolean | null;
  boxBefore: number;
  boxAfter: number;
}

export interface Session {
  date: string; // YYYY-MM-DD
  newWordsIntroduced: number;
  reviewsCompleted: number;
  correctCount: number;
  durationSeconds: number;
}

export interface AppState {
  lastStreakDate: string | null;
  currentStreak: number;
}

export interface DictionaryCacheEntry {
  word: string; // key (queried word, lowercase & trimmed)
  sourceLanguage: string; // 'en' or 'fr'
  candidates: {
    word: string;
    example: string;
  }[];
  pos: Pos;
  register: Register;
  timestamp: number;
}


