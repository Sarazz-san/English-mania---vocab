import { addDays, isSameDay, startOfDay } from 'date-fns';
import { db } from './db';
import { Progress, ReviewMode } from './types';
import { v4 as uuidv4 } from 'uuid';

const BOX_INTERVALS = [0, 1, 2, 4, 8, 16, 30]; // Index 1 is Box 1, etc.

export async function processReview(wordId: string, correct: boolean, mode: ReviewMode) {
  const progress = await db.progress.get(wordId);
  if (!progress) return;

  const now = Date.now();
  const boxBefore = progress.box;
  let boxAfter = boxBefore;
  
  if (mode === 'exposure') {
    // VocabMatch exposure, just update count
    await db.progress.update(wordId, { exposureCount: progress.exposureCount + 1 });
    await db.reviewLogs.add({
      id: uuidv4(),
      wordId,
      timestamp: now,
      mode,
      correct: null,
      boxBefore,
      boxAfter
    });
    return;
  }

  // Actual SRS Review
  progress.timesSeen += 1;
  progress.lastReviewedAt = now;

  if (correct) {
    progress.timesCorrect += 1;
    progress.consecutiveResets = 0; // reset consecutive failures
    boxAfter = Math.min(boxBefore + 1, 6);
    if (boxAfter === 6) {
      progress.status = 'acquired';
      if (boxBefore === 6) {
        progress.box6CorrectCount = (progress.box6CorrectCount || 0) + 1;
      } else {
        progress.box6CorrectCount = 1;
      }
    } else {
      progress.status = 'learning';
      progress.box6CorrectCount = 0;
    }
  } else {
    progress.timesWrong += 1;
    progress.consecutiveResets += 1;
    boxAfter = 1; // Strict reset to box 1
    progress.box6CorrectCount = 0;
    
    if (progress.consecutiveResets >= 4) {
      progress.status = 'leech';
    } else {
      progress.status = 'learning';
    }
  }

  progress.box = boxAfter;
  // Compute next due date using interval. If acquired (box 6), keep adding progressive maintenance days (30 -> 60 -> 90)
  let daysToAdd = BOX_INTERVALS[boxAfter];
  if (boxAfter === 6) {
    const c = progress.box6CorrectCount || 1;
    daysToAdd = c === 1 ? 30 : c === 2 ? 60 : 90;
  }
  progress.nextDueAt = addDays(now, daysToAdd).getTime();

  await db.progress.put(progress);
  
  await db.reviewLogs.add({
    id: uuidv4(),
    wordId,
    timestamp: now,
    mode,
    correct,
    boxBefore,
    boxAfter
  });

  // Update session stats
  await updateSessionStats(correct);
}

async function updateSessionStats(correct: boolean) {
  const todayStr = startOfDay(new Date()).toISOString();
  let session = await db.sessions.get(todayStr);
  
  if (!session) {
    session = {
      date: todayStr,
      newWordsIntroduced: 0,
      reviewsCompleted: 0,
      correctCount: 0,
      durationSeconds: 0
    };
  }

  session.reviewsCompleted += 1;
  if (correct) {
    session.correctCount += 1;
  }
  
  await db.sessions.put(session);
  await updateStreak(todayStr);
}

async function updateStreak(todayStr: string) {
  const stateRow = await db.appState.get('streak');
  let currentStreak = stateRow?.value?.currentStreak || 0;
  let lastStreakDate = stateRow?.value?.lastStreakDate || null;

  if (lastStreakDate !== todayStr) {
    if (lastStreakDate) {
      const yesterday = startOfDay(addDays(new Date(), -1)).toISOString();
      if (lastStreakDate === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1; // First time
    }
    await db.appState.put({ id: 'streak', value: { currentStreak, lastStreakDate: todayStr } });
  }
}

export async function introduceNewWords(count: number = 8) {
  const todayStr = startOfDay(new Date()).toISOString();
  let session = await db.sessions.get(todayStr);
  
  const introducedToday = session?.newWordsIntroduced || 0;
  const remainingAllowed = Math.max(0, count - introducedToday);
  
  if (remainingAllowed === 0) return 0;

  // Get words that are 'new'
  const newProgresses = await db.progress
    .where('status').equals('new')
    .limit(remainingAllowed)
    .toArray();

  if (newProgresses.length === 0) return 0;

  const now = Date.now();
  for (const p of newProgresses) {
    p.status = 'learning';
    p.nextDueAt = now; // Ready to review right now
    await db.progress.put(p);
  }

  if (!session) {
    session = { date: todayStr, newWordsIntroduced: 0, reviewsCompleted: 0, correctCount: 0, durationSeconds: 0 };
  }
  session.newWordsIntroduced += newProgresses.length;
  await db.sessions.put(session);

  return newProgresses.length;
}

export async function getDueReviews() {
  const now = Date.now();
  // Get progress where nextDueAt <= now and status != 'archived'
  // and we only want to pick learning, acquired, or leech (or newly introduced 'learning' ones)
  const due = await db.progress
    .where('nextDueAt').belowOrEqual(now)
    .toArray();
    
  // Sort by nextDueAt ascending (most overdue first), then by box ascending (fragile first)
  return due
    .filter(p => p.status !== 'new') // strictly filter out un-introduced 'new' words
    .sort((a, b) => {
      if (a.nextDueAt !== b.nextDueAt) return a.nextDueAt - b.nextDueAt;
      return a.box - b.box;
    });
}
