import Dexie, { type Table } from 'dexie';
import { Word, Progress, ReviewLog, Session, DictionaryCacheEntry } from './types';

export class VocabDatabase extends Dexie {
  words!: Table<Word, string>;
  progress!: Table<Progress, string>;
  reviewLogs!: Table<ReviewLog, string>;
  sessions!: Table<Session, string>;
  appState!: Table<{ id: string; value: any }, string>;
  dictionaryCache!: Table<DictionaryCacheEntry, string>;

  constructor() {
    super('VocabDB');
    this.version(1).stores({
      words: 'id, dateAdded, archived',
      progress: 'wordId, nextDueAt, status, box',
      reviewLogs: 'id, wordId, timestamp',
      sessions: 'date',
      appState: 'id'
    });
    this.version(2).stores({
      words: 'id, dateAdded, archived',
      progress: 'wordId, nextDueAt, status, box',
      reviewLogs: 'id, wordId, timestamp',
      sessions: 'date',
      appState: 'id',
      dictionaryCache: 'word'
    });
  }
}

export const db = new VocabDatabase();

export async function initDbWithSeed() {
  const count = await db.words.count();
  if (count > 0) return;

  const seedWords = [
    { en: 'ubiquitous', fr: 'omniprésent', pos: 'adj', register: 'academic' },
    { en: 'to jot down', fr: 'noter rapidement', pos: 'phrasal_v', register: 'conversational' },
    { en: 'relentless', fr: 'implacable, acharné', pos: 'adj', register: 'neutral' },
    { en: 'bottleneck', fr: 'goulot d\'étranglement', pos: 'n', register: 'neutral' },
    { en: 'to foster', fr: 'favoriser, encourager', pos: 'v', register: 'academic' },
    { en: 'overwhelming', fr: 'accablant', pos: 'adj', register: 'neutral' },
    { en: 'insightful', fr: 'perspicace, instructif', pos: 'adj', register: 'academic' },
    { en: 'to wrap up', fr: 'conclure, terminer', pos: 'phrasal_v', register: 'conversational' },
  ];

  const now = Date.now();
  
  for (const w of seedWords) {
    const id = crypto.randomUUID();
    await db.words.add({
      id,
      en: w.en,
      fr: w.fr,
      pos: w.pos as any,
      register: w.register as any,
      source: 'seed',
      context: null,
      notes: null,
      dateAdded: now,
      archived: false
    });
    
    await db.progress.add({
      wordId: id,
      box: 1,
      status: 'new',
      timesSeen: 0,
      timesCorrect: 0,
      timesWrong: 0,
      consecutiveResets: 0,
      lastReviewedAt: null,
      nextDueAt: now,
      exposureCount: 0
    });
  }
}
