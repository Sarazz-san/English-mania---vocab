const fs = require('fs');
const content = `import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { processReview } from '../srs';
import { Word } from '../types';
import confetti from 'canvas-confetti';
import { Play, Trophy, Clock, Zap, X } from 'lucide-react';

interface Card {
  id: string; // unique visual ID for key
  wordId: string;
  text: string;
  lang: 'en' | 'fr';
}

export default function VocabMatch() {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [level, setLevel] = useState(1);
  
  const [cardsEn, setCardsEn] = useState<Card[]>([]);
  const [cardsFr, setCardsFr] = useState<Card[]>([]);
  const [selected, setSelected] = useState<{idx: number, lang: 'en'|'fr', wordId: string}[]>([]);
  
  const poolRef = useRef<Word[]>([]);
  const poolIdxRef = useRef(0);
  const matchesInLevel = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vocabMatchBestScore');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const getNextWord = async (): Promise<Word | null> => {
    if (poolRef.current.length === 0) {
      let words = await db.words.toArray();
      if (words.length === 0) return null;
      poolRef.current = words.sort(() => 0.5 - Math.random());
      poolIdxRef.current = 0;
    }
    
    if (poolIdxRef.current >= poolRef.current.length) {
      poolRef.current = [...poolRef.current].sort(() => 0.5 - Math.random());
      poolIdxRef.current = 0;
    }
    return poolRef.current[poolIdxRef.current++];
  };

  const startNewGame = async () => {
    // Initial words setup
    let words = await db.words.toArray();
    if (words.length < 3) {
      alert("You need at least 3 words in your dictionary to play.");
      return;
    }
    
    poolRef.current = words.sort(() => 0.5 - Math.random());
    poolIdxRef.current = 0;

    let pairsCount = 5;
    if (window.innerHeight < 600) pairsCount = 3;
    else if (window.innerHeight < 800) pairsCount = 4;
    
    if (pairsCount > words.length) pairsCount = words.length;

    const initialWords = [];
    for (let i = 0; i < pairsCount; i++) {
      initialWords.push(poolRef.current[poolIdxRef.current++]);
    }

    let en: Card[] = [];
    let fr: Card[] = [];
    initialWords.forEach(w => {
      en.push({ id: \`en-\${w.id}-\${Date.now()}\`, wordId: w.id, text: w.en, lang: 'en' });
      fr.push({ id: \`fr-\${w.id}-\${Date.now()}\`, wordId: w.id, text: w.fr, lang: 'fr' });
    });

    setCardsEn(en.sort(() => 0.5 - Math.random()));
    setCardsFr(fr.sort(() => 0.5 - Math.random()));
    
    setSelected([]);
    setScore(0);
    setTimeLeft(40);
    setLevel(1);
    matchesInLevel.current = 0;
    setGameOver(false);
    setPlaying(true);
  };

  useEffect(() => {
    if (playing && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, gameOver]);

  const handleGameOver = () => {
    setGameOver(true);
    setPlaying(false);
    setBestScore(prev => {
      if (score > prev) {
        localStorage.setItem('vocabMatchBestScore', score.toString());
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        return score;
      }
      return prev;
    });
  };

  const handleCardClick = async (idx: number, lang: 'en'|'fr', wordId: string) => {
    if (selected.find(s => s.lang === lang)) return; // Prevent selecting two from same column
    if (selected.length >= 2) return;

    const newSel = [...selected, { idx, lang, wordId }];
    setSelected(newSel);

    if (newSel.length === 2) {
      if (newSel[0].wordId === newSel[1].wordId) {
        // MATCH
        const enItem = newSel.find(s => s.lang === 'en')!;
        const frItem = newSel.find(s => s.lang === 'fr')!;
        
        // Add time & score
        setTimeLeft(prev => Math.min(75, prev + 4));
        setScore(prev => prev + 10 * level);
        
        matchesInLevel.current += 1;
        if (matchesInLevel.current >= 6) {
          matchesInLevel.current = 0;
          setLevel(l => Math.min(5, l + 1));
        }

        setTimeout(async () => {
          const nextW = await getNextWord();
          if (nextW) {
            setCardsEn(prev => {
              const arr = [...prev];
              arr[enItem.idx] = { id: \`en-\${nextW.id}-\${Date.now()}\`, wordId: nextW.id, text: nextW.en, lang: 'en' };
              return arr;
            });
            setCardsFr(prev => {
              const arr = [...prev];
              arr[frItem.idx] = { id: \`fr-\${nextW.id}-\${Date.now()}\`, wordId: nextW.id, text: nextW.fr, lang: 'fr' };
              return arr;
            });
          }
          setSelected([]);
        }, 200);

        // process SRS
        processReview(newSel[0].wordId, true, 'exposure').catch(() => {});

      } else {
        // MISMATCH
        setTimeLeft(prev => prev - 4);
        setTimeout(() => {
          setSelected([]);
        }, 500);
      }
    }
  };

  if (!playing && !gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-8 animate-in fade-in zoom-in">
        <div className="w-24 h-24 bg-primary-bg rounded-[2rem] flex items-center justify-center rotate-12 shadow-sm border border-primary/20">
          <Zap className="w-12 h-12 text-primary" fill="currentColor" />
        </div>
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-text-main">Survival Match</h2>
          <p className="text-text-muted mt-3 text-lg">Match pairs quickly. +4s for correct, -4s for wrong.</p>
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
        <div className="text-text-main">
          <h2 className="text-3xl font-bold mb-2">Time\'s Up!</h2>
          {isNewRecord && <div className="text-success font-bold text-lg mb-4 animate-bounce">New Record! 🎉</div>}
          
          <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm">
            <div className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Final Score</div>
            <div className="text-6xl font-black text-text-main mb-6">{score}</div>
            
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

  const renderCard = (card: Card, idx: number, lang: 'en'|'fr') => {
    const isSelected = selected.some(s => s.lang === lang && s.idx === idx);
    const isMatched = selected.length === 2 && selected[0].wordId === selected[1].wordId && isSelected;
    const isError = selected.length === 2 && selected[0].wordId !== selected[1].wordId && isSelected;
    
    let btnClass = "relative w-full h-full flex-1 flex items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 text-base sm:text-lg font-medium shadow-sm select-none ";
    
    if (isMatched) {
      btnClass += "border-success bg-success-bg text-success-text scale-[0.98]";
    } else if (isError) {
      btnClass += "border-danger bg-danger-bg text-danger-text animate-shake";
    } else if (isSelected) {
      btnClass += "border-primary bg-primary-bg text-primary scale-[1.02] shadow-md ring-4 ring-primary/20";
    } else {
      btnClass += "border-border bg-surface hover:border-text-muted text-text-main cursor-pointer hover:-translate-y-0.5";
    }

    return (
      <div 
        key={card.id} 
        onClick={() => handleCardClick(idx, lang, card.wordId)}
        className={btnClass}
      >
        <span className="text-center line-clamp-3 leading-tight">{card.text}</span>
      </div>
    );
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return "bg-primary";
    if (timeLeft > 10) return "bg-warning";
    return "bg-danger animate-pulse";
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pt-2 pb-6 animate-in fade-in overflow-hidden">
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
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-lg font-bold">
            <Clock className={\`w-5 h-5 \${timeLeft <= 10 ? 'text-danger' : 'text-text-muted'}\`} />
            <span className={timeLeft <= 10 ? 'text-danger' : 'text-text-main'}>{timeLeft}s</span>
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
      <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mb-6 shrink-0">
        <div 
          className={\`h-full transition-all duration-1000 ease-linear \${getTimerColor()}\`} 
          style={{ width: \`\${Math.min(100, (timeLeft / 75) * 100)}%\` }}
        />
      </div>

      {/* Play Area */}
      <div className="flex-1 flex gap-3 sm:gap-6 min-h-0">
        <div className="flex-1 flex flex-col gap-3 h-full">
          {cardsEn.map((c, i) => renderCard(c, i, 'en'))}
        </div>
        <div className="flex-1 flex flex-col gap-3 h-full">
          {cardsFr.map((c, i) => renderCard(c, i, 'fr'))}
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/components/VocabMatch.tsx', content, 'utf8');
