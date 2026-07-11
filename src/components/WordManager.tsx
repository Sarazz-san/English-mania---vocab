import React, { useState, useRef, useEffect } from "react";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Word, Pos, Register } from '../types';
import { Search, Plus, Sparkles, Loader2, Archive, Upload, Download, Zap, Trash2, AlertTriangle, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function WordManager({ initialWord, onClearInitial }: { initialWord?: {en: string, fr: string}, onClearInitial?: () => void }) {
 const [activeTab, setActiveTab] = useState<'list' | 'add' | 'tools'>(initialWord ? 'add' : 'list');

 useEffect(() => {
 if (initialWord) setActiveTab('add');
 }, [initialWord]);

 return (
 <div className="max-w-4xl mx-auto h-full flex flex-col pt-4 pb-8 animate-in fade-in">
 <div className="flex bg-surface-hover p-1 rounded-xl mb-6 self-center sm:self-start overflow-x-auto max-w-full">
 <button 
 onClick={() => setActiveTab('list')}
 className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main :text-zinc-200'}`}
 >
 My Words
 </button>
 <button 
 onClick={() => setActiveTab('add')}
 className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'add' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main :text-zinc-200'}`}
 >
 Add New
 </button>
 <button 
 onClick={() => setActiveTab('tools')}
 className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'tools' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main :text-zinc-200'}`}
 >
 Tools & Backup
 </button>
 </div>

 <div className="flex-1 overflow-y-auto">
 {activeTab === 'list' && <WordList />}
 {activeTab === 'add' && <AddWord onAdded={() => { setActiveTab('list'); onClearInitial?.(); }} initialWord={initialWord} />}
 {activeTab === 'tools' && <ToolsPanel />}
 </div>
 </div>
 );
}

function ToolsPanel() {
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [isImporting, setIsImporting] = useState(false);
 const [message, setMessage] = useState('');

 const exportDB = async () => {
 try {
 const allWords = await db.words.toArray();
 const allProgress = await db.progress.toArray();
 const data = { words: allWords, progress: allProgress };
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `vocabspaced-backup-${new Date().toISOString().split('T')[0]}.json`;
 a.click();
 URL.revokeObjectURL(url);
 } catch (e) {
 console.error(e);
 setMessage("Export failed.");
 }
 }

 const importDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setIsImporting(true);
 setMessage('');
 
 try {
 const text = await file.text();
 // Simple JSON import (replace/add approach)
 if (file.name.endsWith('.json')) {
 const data = JSON.parse(text);
 if (data.words && Array.isArray(data.words)) {
 // Use a transaction to safely import
 await db.transaction('rw', db.words, db.progress, async () => {
 for (const w of data.words) {
 await db.words.put(w);
 }
 if (data.progress && Array.isArray(data.progress)) {
 for (const p of data.progress) {
 await db.progress.put(p);
 }
 }
 });
 setMessage(`Successfully imported ${data.words.length} words!`);
 } else {
 setMessage('Invalid JSON format for backup.');
 }
 } else if (file.name.endsWith('.csv')) {
 // Basic CSV parsing for bulk import (en,fr,pos,register,context)
 const lines = text.split('\n');
 let count = 0;
 const now = Date.now();
 for (const line of lines) {
 const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
 if (cols.length >= 2 && cols[0] && cols[1] && cols[0] !== 'en') { // skip header
 const id = uuidv4();
 await db.words.add({
 id,
 en: cols[0],
 fr: cols[1],
 pos: (cols[2] as Pos) || 'n',
 register: (cols[3] as Register) || 'neutral',
 source: 'import',
 context: cols[4] || null,
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
 count++;
 }
 }
 setMessage(`Successfully imported ${count} words from CSV!`);
 }
 } catch (err) {
 console.error(err);
 setMessage("Import failed. Check file format.");
 } finally {
 setIsImporting(false);
 if (fileInputRef.current) fileInputRef.current.value = '';
 }
 }

 return (
 <div className="space-y-6 max-w-2xl">
 <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm transition-colors">
 <h3 className="text-lg font-bold flex items-center gap-2 text-text-main"><Download className="w-5 h-5 text-primary" /> Export Backup</h3>
 <p className="text-text-muted text-sm mt-2 mb-4">Download a full JSON backup of your vocabulary and learning progress. Safe and offline.</p>
 <button onClick={exportDB} className="px-6 py-2.5 bg-text-main text-surface rounded-xl text-sm font-medium hover:bg-zinc-800 :bg-surface-hover transition-colors">
 Download JSON
 </button>
 </div>

 <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm transition-colors">
 <h3 className="text-lg font-bold flex items-center gap-2 text-text-main"><Upload className="w-5 h-5 text-primary" /> Import Words</h3>
 <p className="text-text-muted text-sm mt-2 mb-4">Restore from a JSON backup, or upload a CSV file to bulk add words (Format: <code>en, fr, pos, register, context</code>).</p>
 <input type="file" accept=".json,.csv" className="hidden" ref={fileInputRef} onChange={importDB} />
 <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-6 py-2.5 bg-surface border border-zinc-300 text-text-main rounded-xl text-sm font-medium hover:bg-bg transition-colors disabled:opacity-50">
 {isImporting ? 'Importing...' : 'Select File (.json or .csv)'}
 </button>
 {message && <p className="mt-4 text-sm font-medium text-success">{message}</p>}
 </div>
 </div>
 )
}

function WordList() {
 const [search, setSearch] = useState('');
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);
  
  const handleDelete = async () => {
    if (wordToDelete && wordToDelete.id) {
      await db.words.delete(wordToDelete.id);
      setWordToDelete(null);
    }
  };
 
 const words = useLiveQuery(async () => {
 let collection = db.words;
 let items = await collection.orderBy('dateAdded').reverse().toArray();
 
 if (search.trim()) {
 const s = search.trim().toLowerCase();
 items = items.filter(w => (w.en || '').toLowerCase().includes(s) || (w.fr || '').toLowerCase().includes(s));
 }
 
 return items;
 }, [search]);

 if (!words) return <div className="text-text-muted text-center py-10">Loading...</div>;

 return (
 <div className="space-y-4">
 <div className="relative">
 <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
 <input 
 type="text" 
 placeholder="Search your vocabulary..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary-bg transition-all text-text-main"
 />
 </div>

 <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm transition-colors">
 {words.length === 0 ? (
 <div className="p-10 text-center text-text-muted">No words found.</div>
 ) : (
 <ul className="divide-y divide-border">
 {words.map(w => (
 <li key={w.id} className="p-4 hover:bg-bg/50 flex items-center justify-between transition-colors">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-semibold text-lg text-text-main">{w.en || "Unknown"}</span>
 <span className="text-sm px-2 py-0.5 rounded-full bg-surface-hover text-text-muted font-mono">{w.pos}</span>
 </div>
 <div className="text-text-muted">{w.fr}</div>
 </div>
 <div className="text-xs text-text-muted flex flex-col items-end">
 {w.archived && <span className="flex items-center gap-1 text-danger bg-danger-bg px-2 py-1 rounded-md mb-1"><Archive className="w-3 h-3" /> Archived</span>}
 <span>{new Date(w.dateAdded).toLocaleDateString()}</span>
 </div>
            <button
              onClick={(e) => { e.stopPropagation(); setWordToDelete(w); }}
              className="ml-4 p-2 text-text-muted hover:text-danger hover:bg-danger-bg rounded-xl transition-colors"
              title="Delete word"
            >
              <Trash2 className="w-5 h-5" />
            </button>
 </li>
 ))}
 </ul>
 )}
 </div>
 
      {wordToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-lg border border-border animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-danger-bg text-danger rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Delete Word</h3>
                <p className="text-sm text-text-muted mt-1">
                  Are you sure you want to permanently delete "{wordToDelete.en}" / "{wordToDelete.fr}"? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setWordToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main bg-surface-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-surface bg-danger hover:bg-rose-600 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
</div>
 );
}

function AddWord({ onAdded, initialWord }: { onAdded: () => void, initialWord?: { en: string, fr: string } }) {
 const [en, setEn] = useState(initialWord?.en || '');
 const [fr, setFr] = useState(initialWord?.fr || '');
 const [pos, setPos] = useState<Pos>('n');
 const [register, setRegister] = useState<Register>('neutral');
 const [context, setContext] = useState('');
 const [notes, setNotes] = useState('');
 const [isTranslating, setIsTranslating] = useState(false);
 const [autoFilledPos, setAutoFilledPos] = useState(false);
 const [autoFilledRegister, setAutoFilledRegister] = useState(false);

 useEffect(() => {
 if (initialWord && initialWord.en) {
 handleAutoDetect(initialWord.en);
 }
 }, [initialWord]);

 const handleAutoDetect = async (word: string) => {
 if (!word || !navigator.onLine) return;
 
 // POS detection via Free Dictionary API
 try {
 const posRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
 if (posRes.ok) {
 const data = await posRes.json();
 if (data && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
 const rawPos = data[0].meanings[0].partOfSpeech;
 const posMap: Record<string, Pos> = {
 'noun': 'n', 'verb': 'v', 'adjective': 'adj', 'adverb': 'adv',
 'preposition': 'prep', 'conjunction': 'conj', 'pronoun': 'pron', 'interjection': 'interj'
 };
 if (posMap[rawPos]) {
 setPos(posMap[rawPos]);
 setAutoFilledPos(true);
 }
 }
 }
 } catch (e) { console.error('POS fetch error', e); }

 // Register detection via Datamuse API
 try {
 const regRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=f`);
 if (regRes.ok) {
 const data = await regRes.json();
 const exactMatch = data.find((d: any) => d.word.toLowerCase() === word.toLowerCase());
 if (exactMatch && exactMatch.tags) {
 const fTag = exactMatch.tags.find((t: string) => t.startsWith('f:'));
 if (fTag) {
 const freq = parseFloat(fTag.replace('f:', ''));
 if (freq > 50) setRegister('conversational');
 else if (freq > 10) setRegister('neutral');
 else setRegister('academic');
 setAutoFilledRegister(true);
 }
 }
 }
 } catch (e) { console.error('Register fetch error', e); }
 };

 const translate = async () => {
    if (!en.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(en)}&langpair=en|fr`);
      const data = await res.json();
      
      let bestTranslation = "";
      if (data && data.matches) {
        const validMatches = data.matches.filter((m: any) => {
          if (m.match < 0.7) return false;
          const translated = m.translation.trim();
          const latinRegex = /^[a-zA-ZÀ-ÿ\s\'\-.,!?()]+$/;
          if (!latinRegex.test(translated)) return false;
          return true;
        });
        if (validMatches.length > 0) {
          validMatches.sort((a: any, b: any) => b.match - a.match);
          bestTranslation = validMatches[0].translation.trim().toLowerCase();
        }
      }
      
      if (bestTranslation) {
        setFr(bestTranslation);
      } else {
        setFr("Aucune traduction fiable");
      }
      handleAutoDetect(en);
    } catch (e) {
      console.error(e);
      setFr("Aucune traduction fiable");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!en.trim() || !fr.trim()) return;

 const id = uuidv4();
 const now = Date.now();

 await db.words.add({
 id,
 en: en.trim(),
 fr: fr.trim(),
 pos,
 register,
 source: 'import',
 context: context.trim() || null,
 notes: notes.trim() || null,
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

 onAdded();
 };

 return (
 <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm max-w-2xl mx-auto transition-colors">
 <h2 className="text-xl font-bold mb-6 text-text-main">Add a new word</h2>
 <form onSubmit={handleAdd} className="space-y-5">
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-main">English Word/Expression *</label>
 <div className="relative">
 <input 
 autoFocus
 required
 value={en}
 onChange={e => setEn(e.target.value)}
 className="w-full pl-3 pr-10 py-2.5 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary focus:bg-surface transition-all text-text-main" 
 placeholder="e.g. ubiquitous"
 />
 <button 
 type="button" 
 onClick={translate}
 disabled={isTranslating || !en.trim()}
 className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-primary :text-indigo-400 disabled:opacity-50 transition-colors"
 title="Auto-translate"
 >
 {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
 </button>
 </div>
 </div>
 
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-main">French Translation *</label>
 <input 
 required
 value={fr}
 onChange={e => setFr(e.target.value)}
 className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary focus:bg-surface transition-all text-text-main" 
 placeholder="e.g. omniprésent"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-5">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-main flex items-center gap-1.5">
 Part of Speech {autoFilledPos && <Zap className="w-3.5 h-3.5 text-amber-500" title="Auto-detected" />}
 </label>
 <select value={pos} onChange={e => { setPos(e.target.value as Pos); setAutoFilledPos(false); }} className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary focus:bg-surface transition-all text-text-main">
 <option value="n">Noun</option>
 <option value="v">Verb</option>
 <option value="adj">Adjective</option>
 <option value="adv">Adverb</option>
 <option value="phrasal_v">Phrasal Verb</option>
 <option value="expr">Expression</option>
 <option value="prep">Preposition</option>
 <option value="conj">Conjunction</option>
 </select>
 </div>
 
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-main flex items-center gap-1.5">
 Register {autoFilledRegister && <Zap className="w-3.5 h-3.5 text-amber-500" title="Auto-detected" />}
 </label>
 <select value={register} onChange={e => { setRegister(e.target.value as Register); setAutoFilledRegister(false); }} className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary focus:bg-surface transition-all text-text-main">
 <option value="neutral">Neutral</option>
 <option value="conversational">Conversational</option>
 <option value="academic">Academic / Formal</option>
 </select>
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-main">Context (Optional)</label>
 <input 
 value={context}
 onChange={e => setContext(e.target.value)}
 className="w-full px-3 py-2.5 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary focus:bg-surface transition-all text-text-main" 
 placeholder="Where did you hear/read it?"
 />
 </div>

 <button type="submit" className="w-full flex justify-center items-center gap-2 py-3 bg-primary hover:bg-primary-hover text-surface font-medium rounded-xl transition-colors shadow-sm active:scale-[0.99]">
 <Plus className="w-5 h-5" /> Add to Vocabulary
 </button>

 </form>
 
    </div>
  );
}
