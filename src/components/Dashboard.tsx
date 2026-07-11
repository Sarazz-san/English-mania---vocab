import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDbWithSeed } from '../db';
import { introduceNewWords, getDueReviews } from '../srs';
import { Brain, Flame, Target, BookOpen, AlertTriangle, Download, X } from 'lucide-react';
import { startOfDay, subDays } from 'date-fns';

export default function Dashboard({ onStartReview }: { onStartReview: () => void }) {
 const [isSeeding, setIsSeeding] = useState(true);
 const [showLeeches, setShowLeeches] = useState(false);

 useEffect(() => {
 initDbWithSeed().then(() => setIsSeeding(false));
 }, []);

 const stats = useLiveQuery(async () => {
 const now = Date.now();
 const todayStr = startOfDay(new Date()).toISOString();
 
 const dueReviews = await getDueReviews();
 const allProgress = await db.progress.toArray();
 
 const newWords = allProgress.filter(p => p.status === 'new').length;
 const learning = allProgress.filter(p => p.status === 'learning').length;
 const acquired = allProgress.filter(p => p.status === 'acquired').length;
 const leechesIds = allProgress.filter(p => p.status === 'leech').map(p => p.wordId);
 
 const leechesWords = await db.words.where('id').anyOf(leechesIds).toArray();

 const session = await db.sessions.get(todayStr);
 const accuracy = session && session.reviewsCompleted > 0 
 ? Math.round((session.correctCount / session.reviewsCompleted) * 100) 
 : 0;

 // Calculate 7-day accuracy
 let totalReviews7d = 0;
 let totalCorrect7d = 0;
 for (let i = 0; i < 7; i++) {
 const dayStr = startOfDay(subDays(new Date(), i)).toISOString();
 const s = await db.sessions.get(dayStr);
 if (s) {
 totalReviews7d += s.reviewsCompleted;
 totalCorrect7d += s.correctCount;
 }
 }
 const accuracy7d = totalReviews7d > 0 ? Math.round((totalCorrect7d / totalReviews7d) * 100) : 0;

 const streakState = await db.appState.get('streak');
 const streak = streakState?.value?.currentStreak || 0;

 // Total bank size and registers
 const allWords = await db.words.toArray();
 const totalBank = allWords.length;
 const registers = allWords.reduce((acc, w) => {
 acc[w.register] = (acc[w.register] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);

 const settingsRow = await db.appState.get('settings');
 const dailyLimit = settingsRow?.value?.dailyLimit ?? 8;

 return {
 due: dueReviews.length,
 newWords,
 learning,
 acquired,
 leeches: leechesWords,
 accuracy,
 accuracy7d,
 streak,
 session,
 totalBank,
 registers,
 totalReviews7d,
 dailyLimit
 };
 });

 const handleIntroduce = async () => {
 if (stats) {
 await introduceNewWords(stats.dailyLimit);
 }
 };

 const copyWeeklySummary = () => {
 if (!stats) return;
 const summary = `📅 Weekly VocabSpaced Summary
🔥 Streak: ${stats.streak} days
🎯 7-day Accuracy: ${stats.accuracy7d}% (${stats.totalReviews7d} reviews)
🧠 Total words in bank: ${stats.totalBank}
🎓 Acquired words: ${stats.acquired}
⚠️ Leeches to check: ${stats.leeches.length}

Keep it up! 🚀`;
 navigator.clipboard.writeText(summary);
 alert('Weekly summary copied to clipboard!');
 };

 if (isSeeding || !stats) {
 return <div className="flex h-full items-center justify-center text-text-muted">Loading your knowledge base...</div>;
 }

 return (
 <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
 <header className="mb-8 flex justify-between items-end">
 <div>
 <h1 className="text-3xl font-semibold text-text-main tracking-tight">Overview</h1>
 <p className="text-text-muted">Your personal vocabulary space.</p>
 </div>
 <button onClick={copyWeeklySummary} className="flex items-center gap-2 px-3 py-2 text-sm bg-surface border border-border text-text-muted rounded-lg hover:bg-bg transition-colors shadow-sm">
 <Download className="w-4 h-4" /> Export Weekly Summary
 </button>
 </header>

 {/* Main Call to Action */}
 <div className="bg-surface p-6 rounded-3xl shadow-sm border border-border flex flex-col items-center justify-center text-center space-y-4 transition-colors">
 <div className="w-16 h-16 bg-primary-bg text-primary rounded-2xl flex items-center justify-center">
 <Brain className="w-8 h-8" />
 </div>
 <div>
 <h2 className="text-2xl font-bold text-text-main">{stats.due} reviews due</h2>
 <p className="text-text-muted mt-1">Keep your memory sharp by reviewing now.</p>
 </div>
 
 <div className="flex space-x-3 w-full sm:w-auto pt-2">
 {stats.due > 0 ? (
 <button 
 onClick={onStartReview}
 className="flex-1 sm:flex-none px-6 py-3 bg-primary hover:bg-primary-hover active:scale-95 transition-all text-surface font-medium rounded-xl shadow-sm"
 >
 Start Session
 </button>
 ) : (
 <button 
 disabled
 className="flex-1 sm:flex-none px-6 py-3 bg-surface-hover text-text-muted font-medium rounded-xl"
 >
 All Caught Up
 </button>
 )}
 
 <button 
 onClick={handleIntroduce}
 disabled={stats.newWords === 0 || (stats.session?.newWordsIntroduced || 0) >= stats.dailyLimit}
 className="flex-1 sm:flex-none px-6 py-3 bg-surface border border-border hover:bg-surface-hover active:scale-95 transition-all text-text-main font-medium rounded-xl disabled:opacity-50"
 >
 Learn New (+{stats.dailyLimit})
 </button>
 </div>
 
 {(stats.session?.newWordsIntroduced || 0) >= stats.dailyLimit && (
 <p className="text-xs text-text-muted">Daily limit of {stats.dailyLimit} new words reached.</p>
 )}
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col transition-colors">
 <span className="text-text-muted text-sm font-medium flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> Streak</span>
 <span className="text-2xl font-semibold mt-1 text-text-main">{stats.streak} <span className="text-sm font-normal text-text-muted">days</span></span>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col transition-colors">
 <span className="text-text-muted text-sm font-medium flex items-center gap-1.5"><Target className="w-4 h-4 text-emerald-500" /> Accuracy</span>
 <span className="text-2xl font-semibold mt-1 text-text-main">{stats.accuracy}%</span>
 <span className="text-[10px] text-text-muted mt-0.5">7-day: {stats.accuracy7d}%</span>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col transition-colors">
 <span className="text-text-muted text-sm font-medium flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-indigo-500" /> Acquired</span>
 <span className="text-2xl font-semibold mt-1 text-text-main">{stats.acquired}</span>
 </div>
 <button 
 onClick={() => setShowLeeches(true)}
 className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col hover:bg-danger-bg :bg-rose-900/20 transition-colors text-left"
 >
 <span className="text-text-muted text-sm font-medium flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-danger" /> Leeches</span>
 <span className="text-2xl font-semibold mt-1 text-text-main">{stats.leeches.length}</span>
 </button>
 </div>
 
 {/* Box Distribution */}
 <div className="bg-surface p-6 rounded-3xl shadow-sm border border-border transition-colors">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-sm font-medium text-text-muted">Knowledge Distribution</h3>
 <span className="text-xs text-text-muted font-medium">Bank size: {stats.totalBank} words</span>
 </div>
 <div className="flex gap-2 h-4 w-full rounded-full overflow-hidden">
 {stats.newWords > 0 && <div className="bg-blue-100" style={{ flex: stats.newWords }} title={`New: ${stats.newWords}`} />}
 {stats.learning > 0 && <div className="bg-indigo-300" style={{ flex: stats.learning }} title={`Learning: ${stats.learning}`} />}
 {stats.acquired > 0 && <div className="bg-emerald-400" style={{ flex: stats.acquired }} title={`Acquired: ${stats.acquired}`} />}
 {stats.leeches.length > 0 && <div className="bg-danger" style={{ flex: stats.leeches.length }} title={`Leeches: ${stats.leeches.length}`} />}
 {stats.totalBank === 0 && <div className="bg-surface-hover flex-1" />}
 </div>
 <div className="flex flex-wrap justify-between text-xs text-text-muted mt-3 gap-2 px-1">
 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-100" /> New ({stats.newWords})</div>
 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-300" /> Learning ({stats.learning})</div>
 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Acquired ({stats.acquired})</div>
 {stats.leeches.length > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger" /> Leeches ({stats.leeches.length})</div>}
 </div>
 </div>
 
 {/* Leeches Modal */}
 {showLeeches && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-surface rounded-3xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 border border-border">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-xl font-bold flex items-center gap-2 text-danger"><AlertTriangle className="w-5 h-5" /> Leeches</h3>
 <button onClick={() => setShowLeeches(false)} className="p-2 text-text-muted hover:text-text-main :text-surface bg-surface-hover rounded-full"><X className="w-4 h-4" /></button>
 </div>
 <p className="text-sm text-text-muted mb-4">These words have been reset to box 1 multiple times. Consider adding notes, examples, or deleting them.</p>
 <div className="overflow-y-auto flex-1 border border-border rounded-xl">
 {stats.leeches.length === 0 ? (
 <div className="p-8 text-center text-text-muted">No leeches currently! Great job.</div>
 ) : (
 <ul className="divide-y divide-border">
 {stats.leeches.map(w => (
 <li key={w.id} className="p-4 flex flex-col gap-1 hover:bg-bg :bg-zinc-800/50">
 <div className="font-bold text-text-main">{w.en}</div>
 <div className="text-sm text-text-muted">{w.fr}</div>
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
