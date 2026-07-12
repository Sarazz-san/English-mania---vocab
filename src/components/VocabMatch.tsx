import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { processReview } from '../srs';
import { Word } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Zap, X, HelpCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WordEntry {
  id: string;        // id d'origine dans `words`
  en: string;        // mot anglais, tel quel
  fr: string;        // traduction française, telle quelle
  turnsOnBoard?: number;
}

interface PendingHalf {
  id: string;
  visibleSide: 'en' | 'fr';
  entry: WordEntry;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

function AutoSizedText({ text }: { text: string }) {
  let fontSizeClass = "text-base font-medium";
  if (text.length > 25) {
    fontSizeClass = "text-xs font-medium truncate max-w-full";
  } else if (text.length > 15) {
    fontSizeClass = "text-sm font-medium truncate max-w-full";
  }
  return (
    <span className={`${fontSizeClass} text-center select-none leading-tight px-1 block w-full whitespace-nowrap overflow-hidden text-ellipsis`}>
      {text}
    </span>
  );
}

function getPenalizedEntry(pool: WordEntry[], currentPending: PendingHalf | null): WordEntry | null {
  const STALE_THRESHOLD = 6;
  const staleCandidates = pool.filter(w => {
    const isTrapped = currentPending && currentPending.id === w.id;
    return (w.turnsOnBoard || 0) > STALE_THRESHOLD && !isTrapped;
  });

  if (staleCandidates.length === 0) return null;

  // Sort by turnsOnBoard descending, and then by id ascending as a stable tie-breaker
  staleCandidates.sort((a, b) => {
    const turnsA = a.turnsOnBoard || 0;
    const turnsB = b.turnsOnBoard || 0;
    if (turnsB !== turnsA) {
      return turnsB - turnsA;
    }
    return a.id < b.id ? -1 : 1;
  });

  return staleCandidates[0];
}

export default function VocabMatch() {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [level, setLevel] = useState(1);
  const [pairsCount, setPairsCount] = useState(5);
  const [trapMode, setTrapMode] = useState(false);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingLock, setLoadingLock] = useState(true);

  const [activePool, setActivePool] = useState<WordEntry[]>([]);
  const [usedThisCycle, setUsedThisCycle] = useState<Set<string>>(new Set());
  const usedThisCycleRef = useRef<Set<string>>(new Set());
  const [cycleCompletedNotif, setCycleCompletedNotif] = useState<boolean>(false);
  const [leftDisplayOrder, setLeftDisplayOrder] = useState<string[]>([]);
  const [rightDisplayOrder, setRightDisplayOrder] = useState<string[]>([]);
  const [pendingHalf, setPendingHalf] = useState<PendingHalf | null>(null);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const [feedbackState, setFeedbackState] = useState<'correct' | 'incorrect' | null>(null);
  const [feedbackLeftId, setFeedbackLeftId] = useState<string | null>(null);
  const [feedbackRightId, setFeedbackRightId] = useState<string | null>(null);

  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  const [validPairs, setValidPairs] = useState<Map<string, Set<string>>>(new Map());
  const [validPairsReverse, setValidPairsReverse] = useState<Map<string, Set<string>>>(new Map());

  // Cached full lists
  const bankRef = useRef<Word[]>([]);
  const progressMapRef = useRef<Map<string, any>>(new Map());

  // Refs for logic
  const matchesInLevel = useRef(0);
  const endTimeRef = useRef<number>(0);

  // Load best score & calculate appropriate row count on mount
  useEffect(() => {
    const saved = localStorage.getItem('vocabMatchBestScore');
    if (saved) setBestScore(parseInt(saved, 10));

    const calcPairs = () => {
       const viewportHeight = window.visualViewport?.height || window.innerHeight;
       const availableHeight = viewportHeight - 200; 
       const rowHeight = 72; // Card height (approx h-14/16 = 56/64px) + Gap (12px)
       const rowCount = Math.floor(availableHeight / rowHeight);
       return Math.min(8, Math.max(3, rowCount));
    };
    setPairsCount(calcPairs());
    const handleResize = () => setPairsCount(calcPairs());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check locking state and discovered count
  useEffect(() => {
    async function checkDiscovered() {
      try {
        const progresses = await db.progress.toArray();
        const nonNewProgressWordIds = new Set(
          progresses.filter(p => p.status !== 'new').map(p => p.wordId)
        );
        const activeWords = await db.words.filter(w => !w.archived && nonNewProgressWordIds.has(w.id)).toArray();
        setDiscoveredCount(activeWords.length);
        setIsLocked(activeWords.length < 20);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLock(false);
      }
    }
    checkDiscovered();
  }, [playing, gameOver]);

  // Assert no row alignment check
  const assertNoRowAlignment = (leftOrder: string[], rightOrder: string[]) => {
    const minLen = Math.min(leftOrder.length, rightOrder.length);
    const aligned = leftOrder.slice(0, minLen).filter((id, index) => rightOrder[index] === id);
    if (aligned.length > 0) {
      console.error("BUG: id(s) affiché(s) à la même position des deux côtés", aligned);
    }
  };

  const getWordTier = (w: Word) => {
    const p = progressMapRef.current.get(w.id);
    return p ? p.box : 1;
  };

  const weightedRandomPick = (pool: Word[]): WordEntry => {
    let totalWeight = 0;
    const weights = pool.map(w => {
      const box = getWordTier(w); // returns progress.box or 1
      const weight = 7 - box; // lower box = higher weight (box 1 gets 6, box 6 gets 1)
      totalWeight += weight;
      return weight;
    });

    let r = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        const w = pool[i];
        return { id: w.id, en: w.en, fr: w.fr };
      }
    }
    const w = pool[Math.floor(Math.random() * pool.length)];
    return { id: w.id, en: w.en, fr: w.fr };
  };

  const triggerCycleComplete = () => {
    setCycleCompletedNotif(true);
    confetti({
      particleCount: 60,
      spread: 45,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      setCycleCompletedNotif(false);
    }, 1800);
  };

  const drawNewEntry = (
    currentTier: number,
    activeEnKeys: Set<string>,
    activeFrKeys: Set<string>,
    usedSet: Set<string>
  ): WordEntry | null => {
    // A. Normal case: respect the current cycle of the bank
    let pool = bankRef.current.filter(w =>
      !activeEnKeys.has(normalize(w.en)) &&
      !activeFrKeys.has(normalize(w.fr)) &&
      !usedSet.has(normalize(w.en))
    );
    if (pool.length > 0) return weightedRandomPick(pool);

    // C. Cycle completed: reset the cycle and notify
    usedSet.clear();
    setUsedThisCycle(new Set());
    triggerCycleComplete();

    pool = bankRef.current.filter(w =>
      !activeEnKeys.has(normalize(w.en)) &&
      !activeFrKeys.has(normalize(w.fr))
    );
    if (pool.length > 0) return weightedRandomPick(pool);

    // D. Ultimate safety net
    pool = bankRef.current.filter(w =>
      !activeEnKeys.has(normalize(w.en))
    );
    if (pool.length === 0) return null;
    return weightedRandomPick(pool);
  };

  const recomputeDisplay = (pool: WordEntry[], currentPending: PendingHalf | null) => {
    // English display order contains all IDs except if it is pending and visibleSide is 'fr' (English hidden)
    const leftIds = pool
      .filter(w => !(currentPending && currentPending.id === w.id && currentPending.visibleSide === 'fr'))
      .map(w => w.id);

    // French display order contains all IDs except if it is pending and visibleSide is 'en' (French hidden)
    const rightIds = pool
      .filter(w => !(currentPending && currentPending.id === w.id && currentPending.visibleSide === 'en'))
      .map(w => w.id);

    let leftOrder = shuffleArray([...leftIds]);
    let rightOrder = shuffleArray([...rightIds]);

    const commonIds = leftOrder.filter(id => rightOrder.includes(id));
    
    if (commonIds.length > 1) {
      let attempts = 0;
      while (attempts < 100) {
        let aligned = false;
        const minLen = Math.min(leftOrder.length, rightOrder.length);
        for (let i = 0; i < minLen; i++) {
          if (leftOrder[i] === rightOrder[i]) {
            aligned = true;
            break;
          }
        }
        if (!aligned) break;
        rightOrder = shuffleArray([...rightIds]);
        attempts++;
      }
    }

    assertNoRowAlignment(leftOrder, rightOrder);

    return { leftOrder, rightOrder };
  };

  const startNewGame = async () => {
    const words = await db.words.toArray();
    const progresses = await db.progress.toArray();

    const nonNewWordIds = new Set(
      progresses.filter(p => p.status !== 'new').map(p => p.wordId)
    );

    // Cache bank & progress maps (discovered words only, not archived)
    bankRef.current = words.filter(
      w => w.en && w.fr && w.en.trim() !== "" && w.fr.trim() !== "" && !w.archived && nonNewWordIds.has(w.id)
    );
    progressMapRef.current = new Map(progresses.map(p => [p.wordId, p]));

    if (bankRef.current.length < 20) {
      alert("Vous devez découvrir au moins 20 mots dans vos sessions d'apprentissage pour jouer au mode Match.");
      return;
    }

    // Load settings for trapMode
    const settingsRow = await db.appState.get('settings');
    const isTrapModeEnabled = !!settingsRow?.value?.trapMode;
    setTrapMode(isTrapModeEnabled);

    // Build equivalence maps
    const pairsMap = new Map<string, Set<string>>();
    const pairsReverseMap = new Map<string, Set<string>>();

    bankRef.current.forEach(w => {
      const enKey = normalize(w.en);
      const frKey = normalize(w.fr);

      if (!pairsMap.has(enKey)) pairsMap.set(enKey, new Set());
      pairsMap.get(enKey)!.add(frKey);

      if (!pairsReverseMap.has(frKey)) pairsReverseMap.set(frKey, new Set());
      pairsReverseMap.get(frKey)!.add(enKey);
    });

    setValidPairs(pairsMap);
    setValidPairsReverse(pairsReverseMap);

    // Grid size setup
    let actualPairsCount = pairsCount;
    if (actualPairsCount > bankRef.current.length) {
      actualPairsCount = bankRef.current.length;
    }
    actualPairsCount = Math.min(8, Math.max(3, actualPairsCount));

    // Choose initial words uniquely
    const shuffledBank = shuffleArray([...bankRef.current]);
    const initialPool: WordEntry[] = [];
    const activeEnKeys = new Set<string>();
    const activeFrKeys = new Set<string>();

    for (const w of shuffledBank) {
      if (initialPool.length >= actualPairsCount) break;
      const enKey = normalize(w.en);
      const frKey = normalize(w.fr);
      if (!activeEnKeys.has(enKey) && !activeFrKeys.has(frKey)) {
        initialPool.push({ id: w.id, en: w.en, fr: w.fr, turnsOnBoard: 0 });
        activeEnKeys.add(enKey);
        activeFrKeys.add(frKey);
      }
    }

    // fallback if uniqueness constraints prevent filled count
    if (initialPool.length < actualPairsCount && bankRef.current.length >= actualPairsCount) {
      for (const w of shuffledBank) {
        if (initialPool.length >= actualPairsCount) break;
        if (!initialPool.some(p => p.id === w.id)) {
          initialPool.push({ id: w.id, en: w.en, fr: w.fr, turnsOnBoard: 0 });
        }
      }
    }

    // Set up initial displays (no traps at very beginning of level 1)
    const { leftOrder, rightOrder } = recomputeDisplay(initialPool, null);

    setActivePool(initialPool);
    setLeftDisplayOrder(leftOrder);
    setRightDisplayOrder(rightOrder);
    setPendingHalf(null);

    // Reset gameplay states
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setFeedbackLeftId(null);
    setFeedbackRightId(null);
    setFeedbackState(null);
    setLocked(false);
    setScore(0);
    setUsedThisCycle(new Set());
    usedThisCycleRef.current = new Set();
    setTimeLeft(40);
    endTimeRef.current = Date.now() + 40000;
    setLevel(1);
    matchesInLevel.current = 0;
    setGameOver(false);
    setPlaying(true);
  };

  const activePoolRef = useRef<WordEntry[]>([]);
  const pendingHalfRef = useRef<PendingHalf | null>(null);

  useEffect(() => {
    activePoolRef.current = activePool;
    pendingHalfRef.current = pendingHalf;
  }, [activePool, pendingHalf]);

  // Real seconds timer
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (playing && !gameOver) {
      lastTickRef.current = Date.now();
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - lastTickRef.current;
        lastTickRef.current = now;

        // Count stagnant pairs
        const pool = activePoolRef.current;
        const currentPending = pendingHalfRef.current;
        const STALE_THRESHOLD = 6;
        const DECAY_PER_STALE_WORD = 0.25;
        const MAX_STALE_MULTIPLIER = 3;

        const stagnantEntries = pool.filter(w => {
          const isTrapped = currentPending && currentPending.id === w.id;
          return (w.turnsOnBoard || 0) > STALE_THRESHOLD && !isTrapped;
        });

        const stagnantCount = Math.min(stagnantEntries.length, MAX_STALE_MULTIPLIER);

        if (stagnantCount > 0) {
          const extraDecayRate = stagnantCount * DECAY_PER_STALE_WORD; // seconds per second
          const msToSubtract = extraDecayRate * elapsedMs;
          endTimeRef.current -= msToSubtract;
        }

        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          handleGameOver();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [playing, gameOver]);

  // Handle Resize in active game
  useEffect(() => {
    if (!playing || gameOver || activePool.length === 0) return;
    if (activePool.length === pairsCount) return;

    setActivePool(prevPool => {
      if (prevPool.length === pairsCount) return prevPool;

      let updatedPool = [...prevPool];
      let currentPending = pendingHalf;

      if (updatedPool.length < pairsCount) {
        const activeEnKeys = new Set<string>(updatedPool.map(w => normalize(w.en)));
        const activeFrKeys = new Set<string>(updatedPool.map(w => normalize(w.fr)));

        while (updatedPool.length < pairsCount) {
          const nextW = drawNewEntry(level, activeEnKeys, activeFrKeys, usedThisCycleRef.current);
          if (nextW) {
            updatedPool.push(nextW);
            activeEnKeys.add(normalize(nextW.en));
            activeFrKeys.add(normalize(nextW.fr));
          } else {
            break; // Bank exhausted
          }
        }
      } else {
        const countToKeep = pairsCount;
        const keptPool = updatedPool.slice(0, countToKeep);
        
        if (currentPending && !keptPool.some(w => w.id === currentPending!.id)) {
          setPendingHalf(null);
          currentPending = null;
        }
        updatedPool = keptPool;
      }

      const { leftOrder, rightOrder } = recomputeDisplay(updatedPool, currentPending);
      setLeftDisplayOrder(leftOrder);
      setRightDisplayOrder(rightOrder);

      const keptIds = new Set(updatedPool.map(w => w.id));
      if (selectedLeftId && !keptIds.has(selectedLeftId)) setSelectedLeftId(null);
      if (selectedRightId && !keptIds.has(selectedRightId)) setSelectedRightId(null);

      return updatedPool;
    });
  }, [pairsCount, playing, gameOver]);

  const handleGameOver = () => {
    setGameOver(true);
    setPlaying(false);
    setBestScore(prev => {
      let finalScore = 0;
      setScore(s => { finalScore = s; return s; });
      if (finalScore > prev) {
        localStorage.setItem('vocabMatchBestScore', finalScore.toString());
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        return finalScore;
      }
      return prev;
    });
  };

  const handleMatchCorrect = (leftId: string, rightId: string) => {
    const leftWord = activePool.find(w => w.id === leftId);
    if (leftWord) {
      const enKey = normalize(leftWord.en);
      usedThisCycleRef.current.add(enKey);
    }
    const rightWord = activePool.find(w => w.id === rightId);
    if (rightWord && rightId !== leftId) {
      const enKey = normalize(rightWord.en);
      usedThisCycleRef.current.add(enKey);
    }
    setUsedThisCycle(new Set(usedThisCycleRef.current));

    setActivePool(prevPool => {
      // Resolve pending half if active
      let currentPending = pendingHalf;
      if (currentPending && (currentPending.id === leftId || currentPending.id === rightId)) {
        setPendingHalf(null);
        currentPending = null;
      }

      // Filter out matched and increment others
      let updatedPool = prevPool
        .filter(w => w.id !== leftId && w.id !== rightId)
        .map(w => {
          const isTrapped = currentPending && currentPending.id === w.id;
          if (isTrapped) {
            return w; // keep turnsOnBoard as is (normally 0, starts once both sides are displayed)
          }
          return {
            ...w,
            turnsOnBoard: (w.turnsOnBoard || 0) + 1
          };
        });

      // Roll for a new trap
      let isNewTrap = false;
      let newPending: PendingHalf | null = null;

      if (trapMode && level >= 2 && !currentPending && Math.random() < 0.20) {
        isNewTrap = true;
      }

      // Draw new entries until we reach pairsCount
      while (updatedPool.length < pairsCount) {
        const activeEnKeys = new Set<string>(updatedPool.map(w => normalize(w.en)));
        const activeFrKeys = new Set<string>(updatedPool.map(w => normalize(w.fr)));
        const nextW = drawNewEntry(level, activeEnKeys, activeFrKeys, usedThisCycleRef.current);
        if (nextW) {
          updatedPool.push({ ...nextW, turnsOnBoard: 0 });

          if (isNewTrap && updatedPool.length === pairsCount) {
            const visibleSide = Math.random() < 0.5 ? 'en' : 'fr';
            newPending = { id: nextW.id, visibleSide, entry: nextW };
            setPendingHalf(newPending);
          }
        } else {
          break; // Bank exhausted
        }
      }

      const { leftOrder, rightOrder } = recomputeDisplay(updatedPool, newPending || currentPending);
      setLeftDisplayOrder(leftOrder);
      setRightDisplayOrder(rightOrder);

      return updatedPool;
    });
  };

  const showLevelUpNotification = () => {
    setLevelUpMessage("Difficulté accrue ! Palier supérieur ! 🎉");
    setTimeout(() => {
      setLevelUpMessage(null);
    }, 1800);
  };

  // Score Counting Animation on Game Over
  useEffect(() => {
    if (gameOver) {
      const duration = 1000;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress * (2 - progress); // easeOutQuad
        const current = Math.floor(ease * score);
        setAnimatedScore(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setAnimatedScore(score);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [gameOver, score]);

  const handleCardClick = (id: string, lang: 'en' | 'fr') => {
    if (locked) return;

    if (lang === 'en') {
      if (selectedLeftId === id) {
        setSelectedLeftId(null);
      } else {
        setSelectedLeftId(id);
      }
    } else {
      if (selectedRightId === id) {
        setSelectedRightId(null);
      } else {
        setSelectedRightId(id);
      }
    }
  };

  // Match validation effect
  useEffect(() => {
    if (!selectedLeftId || !selectedRightId || locked) return;

    setLocked(true);

    const leftWord = activePool.find(w => w.id === selectedLeftId);
    const rightWord = activePool.find(w => w.id === selectedRightId);

    if (!leftWord || !rightWord) {
      setLocked(false);
      return;
    }

    const leftKey = normalize(leftWord.en);
    const rightKey = normalize(rightWord.fr);

    const isCorrect = validPairs.get(leftKey)?.has(rightKey) ?? false;

    setFeedbackLeftId(selectedLeftId);
    setFeedbackRightId(selectedRightId);

    if (isCorrect) {
      setFeedbackState('correct');
      setScore(prev => prev + 10 * level);
      endTimeRef.current = Math.min(Date.now() + 75000, endTimeRef.current + 4000);

      matchesInLevel.current += 1;
      if (matchesInLevel.current >= 6) {
        matchesInLevel.current = 0;
        setLevel(l => {
          const nextLevel = Math.min(5, l + 1);
          if (nextLevel > l) {
            showLevelUpNotification();
          }
          return nextLevel;
        });
      }

      // Process SRS in background
      processReview(leftWord.id, true, 'exposure').catch(() => {});

      setTimeout(() => {
        handleMatchCorrect(selectedLeftId, selectedRightId);
        setSelectedLeftId(null);
        setSelectedRightId(null);
        setFeedbackLeftId(null);
        setFeedbackRightId(null);
        setFeedbackState(null);
        setLocked(false);
      }, 420);
    } else {
      setFeedbackState('incorrect');
      endTimeRef.current = endTimeRef.current - 4000;

      const STALE_THRESHOLD = 6;
      const ATTEMPT_CREDIT = Math.ceil(STALE_THRESHOLD / 2); // 3

      setActivePool(prevPool => {
        return prevPool.map(w => {
          if (w.id === selectedLeftId || w.id === selectedRightId) {
            if ((w.turnsOnBoard || 0) > STALE_THRESHOLD) {
              return {
                ...w,
                turnsOnBoard: Math.max(0, (w.turnsOnBoard || 0) - ATTEMPT_CREDIT)
              };
            }
          }
          return w;
        });
      });

      setTimeout(() => {
        setSelectedLeftId(null);
        setSelectedRightId(null);
        setFeedbackLeftId(null);
        setFeedbackRightId(null);
        setFeedbackState(null);
        setLocked(false);
      }, 450);
    }
  }, [selectedLeftId, selectedRightId]);

  const renderCard = (id: string, lang: 'en' | 'fr') => {
    const entry = activePool.find(w => w.id === id);
    if (!entry) return null;

    const isSelected = (lang === 'en' ? selectedLeftId : selectedRightId) === id;
    const isFeedbackLeft = feedbackLeftId === id;
    const isFeedbackRight = feedbackRightId === id;

    const isCorrect = feedbackState === 'correct' && (isFeedbackLeft || isFeedbackRight);
    const isIncorrect = feedbackState === 'incorrect' && (isFeedbackLeft || isFeedbackRight);

    const isTrapped = pendingHalf && pendingHalf.id === id;

    const text = lang === 'en' ? entry.en : entry.fr;
    const cardKey = `${lang}-${id}`;

    let containerClass = "relative w-full h-14 sm:h-16 flex items-center justify-center px-4 rounded-2xl border-2 transition-all duration-200 select-none overflow-hidden ";

    if (isCorrect) {
      containerClass += "border-success bg-success-bg text-success-text shadow-sm";
    } else if (isIncorrect) {
      containerClass += "border-danger bg-danger-bg text-danger-text";
    } else if (isSelected) {
      containerClass += "border-primary bg-primary-bg text-primary shadow-md ring-4 ring-primary/20 scale-[1.02]";
    } else if (isTrapped) {
      containerClass += "border-dashed border-text-muted/60 bg-surface text-text-main hover:border-primary/60 cursor-pointer shadow-xs";
    } else {
      const STALE_THRESHOLD = 6;
      const isCardTrapped = pendingHalf && pendingHalf.id === id;
      const isStagnant = (entry.turnsOnBoard || 0) > STALE_THRESHOLD && !isCardTrapped && lang === 'en';

      if (isStagnant) {
        const tob = entry.turnsOnBoard || 0;
        if (tob >= 8) {
          containerClass += "border-red-500 dark:border-red-600 bg-surface text-text-main cursor-pointer hover:-translate-y-0.5 animate-pulse shadow-sm shadow-red-500/10";
        } else {
          containerClass += "border-orange-500 dark:border-orange-600 bg-surface text-text-main cursor-pointer hover:-translate-y-0.5 shadow-sm shadow-orange-500/10";
        }
      } else {
        containerClass += "border-border bg-surface hover:border-text-muted text-text-main cursor-pointer hover:-translate-y-0.5 shadow-xs";
      }
    }

    const variants = {
      normal: { scale: 1 },
      correct: { scale: [1, 1.06, 1], transition: { duration: 0.3 } },
      incorrect: { x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.35 } }
    };

    let activeAnimation = "normal";
    if (isCorrect) activeAnimation = "correct";
    if (isIncorrect) activeAnimation = "incorrect";

    return (
      <motion.div
        key={cardKey}
        layout
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full min-w-0"
      >
        <motion.button
          animate={activeAnimation}
          variants={variants}
          onClick={() => handleCardClick(id, lang)}
          disabled={locked && !isSelected}
          className={containerClass}
        >
          <AutoSizedText text={text} />
          {isTrapped && (
            <div className="absolute right-2.5 top-2.5 text-text-muted/50" title="La correspondance arrive bientôt (Mode Piège)">
              <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
            </div>
          )}
        </motion.button>
      </motion.div>
    );
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return "bg-primary";
    if (timeLeft > 10) return "bg-warning";
    return "bg-danger animate-pulse";
  };

  const STALE_THRESHOLD = 6;
  const DECAY_PER_STALE_WORD = 0.25;
  const MAX_STALE_MULTIPLIER = 3;

  const stagnantEntriesCount = activePool.filter(w => {
    const isTrapped = pendingHalf && pendingHalf.id === w.id;
    return (w.turnsOnBoard || 0) > STALE_THRESHOLD && !isTrapped;
  }).length;

  const hasPression = stagnantEntriesCount > 0;
  const currentPressionDecay = Math.min(stagnantEntriesCount, MAX_STALE_MULTIPLIER) * DECAY_PER_STALE_WORD;

  if (!playing && !gameOver) {
    if (loadingLock) {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4 animate-in fade-in">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-text-muted text-sm">Chargement du jeu...</p>
        </div>
      );
    }

    if (isLocked) {
      const remaining = 20 - discoveredCount;
      const progressPercent = Math.min(100, (discoveredCount / 20) * 100);

      return (
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-8 animate-in fade-in zoom-in">
          <div className="w-24 h-24 bg-surface border border-border rounded-[2rem] flex items-center justify-center rotate-12 shadow-sm text-text-muted">
            <Lock className="w-12 h-12 text-text-muted" />
          </div>
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-text-main">Survival Match</h2>
            <p className="text-text-muted mt-3 text-lg">
              Associez les mots et leurs traductions le plus rapidement possible.
            </p>
            <p className="text-sm text-text-muted mt-4 max-w-xs mx-auto">
              Ce mode est verrouillé. Vous devez d'abord rencontrer au moins 20 mots lors de vos sessions d'apprentissage pour y jouer.
            </p>
          </div>

          <div className="w-full bg-surface border border-border rounded-2xl p-6 shadow-sm font-sans">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-text-muted">Mots découverts</span>
              <span className="text-primary font-bold">{discoveredCount} / 20</span>
            </div>
            <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-text-muted font-medium">
              Encore <span className="text-text-main font-bold">{remaining}</span> mot{remaining > 1 ? 's' : ''} à découvrir !
            </p>
          </div>

          <button 
            disabled
            className="px-8 py-4 bg-border text-text-muted rounded-2xl font-bold text-lg cursor-not-allowed opacity-60 w-full"
          >
            Mode verrouillé
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-8 animate-in fade-in zoom-in">
        <div className="w-24 h-24 bg-primary-bg rounded-[2rem] flex items-center justify-center rotate-12 shadow-sm border border-primary/20">
          <Zap className="w-12 h-12 text-primary" fill="currentColor" />
        </div>
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-text-main">Survival Match</h2>
          <p className="text-text-muted mt-3 text-lg">Match pairs quickly. +4s for correct, -4s for wrong.</p>
          {trapMode && (
            <p className="text-xs text-text-muted mt-2 bg-surface border border-border px-3 py-1.5 rounded-xl inline-block">
              ⚠️ Mode Piège Activé (traductions différées)
            </p>
          )}
        </div>

        {bestScore > 0 && (
          <div className="flex items-center gap-2 text-warning bg-warning/10 px-4 py-2 rounded-xl font-bold">
            <Trophy className="w-5 h-5" />
            Best Score: {bestScore}
          </div>
        )}

        <button 
          onClick={startNewGame}
          className="px-8 py-4 bg-primary text-primary-text rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all"
        >
          Play Now
        </button>
      </div>
    );
  }

  if (gameOver) {
    const isNewRecord = score > 0 && score >= bestScore;
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8">
        <div className="text-text-main w-full">
          <h2 className="text-3xl font-bold mb-2">Time's Up!</h2>
          {isNewRecord && <div className="text-success font-bold text-lg mb-4 animate-bounce">New Record! 🎉</div>}

          <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm">
            <div className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Final Score</div>
            <div className="text-6xl font-black text-text-main mb-6">{animatedScore}</div>

            <div className="flex justify-center items-center gap-4 text-sm font-medium">
              <div className="bg-surface-hover px-4 py-2 rounded-xl text-text-muted">
                Level {level}
              </div>
              <div className="bg-warning/10 text-warning px-4 py-2 rounded-xl flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> {bestScore}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={startNewGame}
          className="px-8 py-4 bg-primary text-primary-text rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all w-full max-w-[240px]"
        >
          Play Again
        </button>
        <button 
          onClick={() => { setGameOver(false); setPlaying(false); }}
          className="text-text-muted font-medium hover:text-text-main transition-colors"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const totalAccessible = bankRef.current.length;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pt-2 pb-6 animate-in fade-in overflow-hidden relative">
      {/* Level Up Micro-notification */}
      <AnimatePresence>
        {levelUpMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-text px-4 py-2 rounded-full shadow-lg font-semibold text-sm pointer-events-none"
          >
            {levelUpMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour Complet Notification */}
      <AnimatePresence>
        {cycleCompletedNotif && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-base pointer-events-none border border-yellow-300 animate-pulse flex items-center gap-2"
          >
            <Trophy className="w-5 h-5 text-white fill-current animate-bounce" />
            <span>Tour complet !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <div className="flex justify-between items-center mb-4 shrink-0 px-2">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Score</span>
            <span className="text-2xl font-black text-text-main leading-none">{score}</span>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Level</span>
            <span className="text-xl font-bold text-text-main leading-none text-primary">{level}</span>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Tour</span>
            <span className="text-xl font-bold text-text-main leading-none">
              {usedThisCycle.size}/{totalAccessible}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasPression && (
            <div className="flex items-center gap-1.5 text-xs bg-red-500/15 text-red-500 font-bold px-2.5 py-1.5 rounded-xl animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Pression: -{currentPressionDecay.toFixed(2)}s/s
            </div>
          )}
          <div className="flex items-center gap-1.5 text-lg font-bold">
            <Clock className={`w-5 h-5 ${timeLeft <= 10 || hasPression ? 'text-danger' : 'text-text-muted'}`} />
            <span className={timeLeft <= 10 || hasPression ? 'text-danger' : 'text-text-main'}>{timeLeft}s</span>
          </div>
          <button 
            onClick={() => { setPlaying(false); setGameOver(false); }} 
            className="w-10 h-10 flex items-center justify-center bg-surface-hover hover:bg-border rounded-xl text-text-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mb-6 shrink-0 relative">
        <motion.div 
          className={`h-full transition-all duration-200 ease-out ${getTimerColor()}`} 
          style={{ width: `${Math.min(100, (timeLeft / 40) * 100)}%` }}
          animate={timeLeft <= 8 ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={timeLeft <= 8 ? { repeat: Infinity, duration: 1 } : {}}
        />
      </div>

      {/* Play Area - Fixed dimensions and completely bounded to avoid overflows */}
      <div className="flex-1 flex gap-3 sm:gap-6 min-h-0 items-center select-none w-full max-w-full overflow-hidden">
        <div className="flex-1 flex flex-col gap-3 justify-center h-full min-w-0 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {leftDisplayOrder.slice(0, pairsCount).map(id => renderCard(id, 'en'))}
          </AnimatePresence>
        </div>
        <div className="flex-1 flex flex-col gap-3 justify-center h-full min-w-0 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {rightDisplayOrder.slice(0, pairsCount).map(id => renderCard(id, 'fr'))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
