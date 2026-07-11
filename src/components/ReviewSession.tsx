import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { processReview, getDueReviews } from '../srs';
import { Progress, Word } from '../types';
import confetti from 'canvas-confetti';
import { Check, X, ArrowRight, CornerDownLeft, Target, Brain } from 'lucide-react';

interface ReviewItem {
 progress: Progress;
 word: Word;
}

export default function ReviewSession({ onFinish }: { onFinish: () => void }) {
 const [queue, setQueue] = useState<ReviewItem[]>([]);
 const [currentIndex, setCurrentIndex] = useState(0);
 const [loading, setLoading] = useState(true);
 const [input, setInput] = useState('');
 const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
 
 // QCM state
 const [options, setOptions] = useState<string[]>([]);
 const [selectedOption, setSelectedOption] = useState<string | null>(null);

 // Session summary state
 const [isFinished, setIsFinished] = useState(false);
 const [correctCount, setCorrectCount] = useState(0);

 useEffect(() => {
 async function load() {
 const due = await getDueReviews();
 const items: ReviewItem[] = [];
 for (const p of due) {
 const w = await db.words.get(p.wordId);
 if (w) items.push({ progress: p, word: w });
 }
 setQueue(items);
 setLoading(false);
 }
 load();
 }, []);

 const currentItem = queue[currentIndex];
 const isProduction = currentItem ? currentItem.progress.box >= 4 : false;

 useEffect(() => {
 if (currentItem && !isProduction) {
 generateOptions(currentItem.word);
 }
 }, [currentItem, isProduction]);

 const generateOptions = async (correctWord: Word) => {
 const allWords = await db.words.toArray();
 const others = allWords.filter(w => w.id !== correctWord.id).map(w => w.fr);
 
 // Shuffle and pick 3
 const shuffled = others.sort(() => 0.5 - Math.random());
 const distractors = shuffled.slice(0, 3);
 
 const opts = [...distractors, correctWord.fr].sort(() => 0.5 - Math.random());
 setOptions(opts);
 };

 const handleNext = () => {
 setFeedback(null);
 setInput('');
 setSelectedOption(null);
 
 if (currentIndex + 1 >= queue.length) {
 setIsFinished(true);
 confetti({
 particleCount: 100,
 spread: 70,
 origin: { y: 0.6 },
 colors: ['#4f46e5', '#10b981', '#f59e0b']
 });
 } else {
 setCurrentIndex(c => c + 1);
 }
 };

 const submitProduction = async (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 if (feedback !== null || !input.trim()) return;

 // Normalize: lowercase, replace punctuation with space, remove extra spaces
 const normalize = (s: string) => s.toLowerCase().replace(/[''-]/g, ' ').replace(/\s+/g, ' ').trim();
 
 const normalizedInput = normalize(input);
 const normalizedCorrect = normalize(currentItem.word.en);
 
 const isCorrect = normalizedInput === normalizedCorrect;
 setFeedback(isCorrect ? 'correct' : 'wrong');
 if (isCorrect) setCorrectCount(c => c + 1);
 
 await processReview(currentItem.word.id, isCorrect, 'production');
 };

 const submitRecognition = async (opt: string) => {
 if (feedback !== null) return;
 setSelectedOption(opt);
 
 const isCorrect = opt === currentItem.word.fr;
 setFeedback(isCorrect ? 'correct' : 'wrong');
 if (isCorrect) setCorrectCount(c => c + 1);
 
 await processReview(currentItem.word.id, isCorrect, 'recognition');
 };

 if (loading) return <div className="flex h-full items-center justify-center">Loading session...</div>;
 
 if (queue.length === 0 && !isFinished) {
 return (
 <div className="flex flex-col h-full items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
 <div className="w-16 h-16 bg-success-bg text-success rounded-full flex items-center justify-center">
 <Check className="w-8 h-8" />
 </div>
 <h2 className="text-2xl font-bold tracking-tight text-text-main">All caught up!</h2>
 <p className="text-text-muted max-w-sm">You have no pending reviews. Come back later or add new words.</p>
 <button onClick={onFinish} className="px-6 py-2 mt-4 bg-text-main text-surface rounded-lg hover:bg-surface-hover transition-colors">Return to Dashboard</button>
 </div>
 );
 }

 if (isFinished) {
 const accuracy = Math.round((correctCount / queue.length) * 100) || 0;
 return (
 <div className="flex flex-col h-full items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
 <div className="w-20 h-20 bg-primary-bg text-primary rounded-3xl shadow-sm flex items-center justify-center">
 <Brain className="w-10 h-10" />
 </div>
 <div>
 <h2 className="text-3xl font-bold tracking-tight text-text-main">Session Complete!</h2>
 <p className="text-text-muted mt-2">Great job. You've completed your reviews for now.</p>
 </div>
 
 <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
 <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm transition-colors">
 <div className="text-text-muted text-sm font-medium mb-1">Reviewed</div>
 <div className="text-2xl font-bold text-text-main">{queue.length}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm transition-colors">
 <div className="text-text-muted text-sm font-medium mb-1">Accuracy</div>
 <div className="text-2xl font-bold text-text-main flex items-center justify-center gap-1">
 <Target className="w-5 h-5 text-indigo-500 " />
 {accuracy}%
 </div>
 </div>
 </div>

 <button 
 onClick={onFinish} 
 className="px-8 py-3 mt-4 bg-text-main text-surface rounded-xl font-medium hover:bg-zinc-800 :bg-surface-hover transition-colors shadow-md active:scale-95"
 >
 Return to Dashboard
 </button>
 </div>
 );
 }

 const progressPct = ((currentIndex) / queue.length) * 100;

 return (
 <div className="max-w-xl mx-auto h-full flex flex-col pt-8 pb-12 animate-in fade-in slide-in-from-bottom-4">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <button onClick={onFinish} className="text-sm font-medium text-text-muted hover:text-text-main :text-zinc-200">Cancel</button>
 <div className="text-sm font-semibold text-text-muted font-mono">
 {currentIndex + 1} / {queue.length}
 </div>
 </div>
 
 {/* Progress bar */}
 <div className="w-full h-1.5 bg-surface-hover rounded-full mb-12 overflow-hidden">
 <div className="h-full bg-primary-bg0 transition-all duration-300 ease-out" style={{ width: `${progressPct}%` }} />
 </div>

 {/* Card */}
 <div className="flex-1 flex flex-col justify-center">
 <div className="bg-surface rounded-3xl shadow-sm border border-border p-8 text-center relative overflow-hidden transition-colors">
 
 <div className="absolute top-4 left-4">
 <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-main ">
 Box {currentItem.progress.box}
 </span>
 </div>

 <h3 className="text-sm font-medium text-text-muted tracking-widest uppercase mt-4 mb-2">
 {isProduction ? 'Translate to English' : 'What does this mean?'}
 </h3>
 
 <div className="text-4xl font-bold text-text-main mb-8 mt-4 tracking-tight">
 {isProduction ? currentItem.word.fr : currentItem.word.en}
 </div>

 {/* Interaction Area */}
 <div className="mt-8">
 {isProduction ? (
 <form onSubmit={submitProduction} className="flex flex-col items-center">
 <input
 type="text"
 autoFocus
 value={input}
 onChange={e => setInput(e.target.value)}
 disabled={feedback !== null}
 placeholder="Type the English word..."
 className={`w-full max-w-sm text-center text-xl p-4 border-2 rounded-2xl outline-none transition-all ${
 feedback === null ? 'border-border focus:border-primary text-text-main' :
 feedback === 'correct' ? 'border-emerald-500 bg-success-bg text-success-text' : 'border-rose-500 bg-danger-bg text-danger-text'
 }`}
 />
 </form>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {options.map((opt, i) => {
 let btnClass = "p-4 rounded-2xl border-2 text-left font-medium transition-all ";
 if (feedback === null) {
 btnClass += "border-border hover:border-primary hover:bg-primary-bg :bg-indigo-900/20 text-text-main";
 } else {
 if (opt === currentItem.word.fr) {
 btnClass += "border-emerald-500 bg-success-bg text-success";
 } else if (opt === selectedOption) {
 btnClass += "border-rose-500 bg-danger-bg text-danger";
 } else {
 btnClass += "border-border bg-surface-hover text-text-muted opacity-50";
 }
 }
 
 return (
 <button
 key={i}
 onClick={() => submitRecognition(opt)}
 disabled={feedback !== null}
 className={btnClass}
 >
 {opt}
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Feedback Area */}
 <div className={`mt-8 h-24 flex items-center justify-center transition-opacity duration-300 ${feedback ? 'opacity-100' : 'opacity-0'}`}>
 {feedback && (
 <div className="flex flex-col items-center animate-in slide-in-from-bottom-2">
 <div className={`flex items-center gap-2 font-semibold text-lg ${feedback === 'correct' ? 'text-success' : 'text-danger'}`}>
 {feedback === 'correct' ? <><Check className="w-6 h-6" /> Correct</> : <><X className="w-6 h-6" /> Incorrect</>}
 </div>
 
 {feedback === 'wrong' && (
 <div className="mt-2 text-text-main text-lg">
 Answer: <span className="font-bold">{isProduction ? currentItem.word.en : currentItem.word.fr}</span>
 </div>
 )}
 
 <button 
 onClick={handleNext} 
 autoFocus
 className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-text-main text-surface rounded-xl font-medium hover:bg-surface-hover focus:ring-4 focus:ring-zinc-200 :ring-zinc-700"
 >
 Continue <CornerDownLeft className="w-4 h-4 opacity-70" />
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
