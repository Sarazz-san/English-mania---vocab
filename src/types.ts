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

export interface SearchHistory {
  id: string;
  term: string;
  timestamp: number; // last searched
  occurrences: number;
}
