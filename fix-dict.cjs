const fs = require('fs');

const dictCode = `import React, { useState } from 'react';
import { Search, Plus, Sparkles, Book, Globe, Clock, Check } from 'lucide-react';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface Candidate {
  id: string;
  en: string;
  fr: string;
  quality: number;
}

export default function Dictionary({ onAddWord }: { onAddWord?: (en: string, fr: string) => void }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const detectLanguage = (text: string): 'en|fr' | 'fr|en' => {
    const frAccents = /[éèêëàâäôöûüùîïç]/i;
    if (frAccents.test(text)) return 'fr|en';
    const frWords = ['le', 'la', 'les', 'un', 'une', 'des', 'avec', 'pour', 'dans', 'sur', 'et', 'ou', 'qui', 'que', 'quoi', 'dont', 'où', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'est', 'sont'];
    const words = text.toLowerCase().split(/\\s+/);
    if (words.some(w => frWords.includes(w))) return 'fr|en';
    return 'en|fr';
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setCandidates([]);
    setAddedIds(new Set());
    setError('');
    
    const term = query.trim();
    const langpair = detectLanguage(term);
    const isEnToFr = langpair === 'en|fr';
    
    try {
      const existing = await db.searchHistory.where('term').equalsIgnoreCase(term).first();
      const now = Date.now();
      if (existing) {
        await db.searchHistory.update(existing.id, { timestamp: now, occurrences: existing.occurrences + 1 });
      } else {
        await db.searchHistory.add({ id: uuidv4(), term, timestamp: now, occurrences: 1 });
      }

      const res = await fetch(\`https://api.mymemory.translated.net/get?q=\${encodeURIComponent(term)}&langpair=\${langpair}\`);
      const data = await res.json();

      if (data && data.matches && data.matches.length > 0) {
        // Filter and map matches
        const uniqueMatches = new Map<string, Candidate>();
        data.matches.forEach((m: any) => {
          const translated = m.translation.toLowerCase().trim();
          const source = m.segment.toLowerCase().trim();
          
          if (!translated || !source) return;
          
          const en = isEnToFr ? source : translated;
          const fr = isEnToFr ? translated : source;
          const key = \`\${en}-\${fr}\`;
          
          if (!uniqueMatches.has(key) || uniqueMatches.get(key)!.quality < m.quality) {
            uniqueMatches.set(key, {
              id: uuidv4(),
              en,
              fr,
              quality: m.quality || 0
            });
          }
        });
        
        const sorted = Array.from(uniqueMatches.values())
          .sort((a, b) => b.quality - a.quality)
          .slice(0, 4); // Max 4 candidates

        if (sorted.length > 0) {
          setCandidates(sorted);
        } else {
          setError('No valid translation candidates found.');
        }
      } else {
        setError('No translation found.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCandidate = async (candidate: Candidate) => {
    if (addedIds.has(candidate.id)) return;
    
    // Exact duplicate check
    const allWords = await db.words.toArray();
    const isDuplicate = allWords.some(w => w.en.toLowerCase() === candidate.en && w.fr.toLowerCase() === candidate.fr);
    
    if (isDuplicate) {
      alert(\`"\${candidate.en}" / "\${candidate.fr}" already exists in your dictionary.\`);
      setAddedIds(prev => new Set(prev).add(candidate.id));
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    await db.words.add({
      id,
      en: candidate.en,
      fr: candidate.fr,
      pos: 'n',
      register: 'neutral',
      source: 'import',
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
      nextReviewAt: now
    });

    setAddedIds(prev => new Set(prev).add(candidate.id));
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col pt-4 pb-8 animate-in fade-in">
      <div className="text-center mb-8 shrink-0">
        <h2 className="text-3xl font-bold tracking-tight text-text-main">Smart Dic</h2>
        <p className="text-text-muted mt-2">Bilingual English/French dictionary.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 shrink-0">
        <div className="relative shadow-sm rounded-2xl overflow-hidden border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-bg transition-all">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-text-muted" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a word in English or French..."
            className="w-full pl-12 pr-28 py-4 text-lg bg-transparent outline-none text-text-main"
          />
          <button 
            type="submit" 
            disabled={!query.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text font-bold rounded-xl transition-colors shadow-sm"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && <div className="text-danger text-center p-4 bg-danger-bg rounded-xl border border-danger/20 shrink-0">{error}</div>}

      {candidates.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-lg font-bold text-text-main">Translation Candidates</h3>
            <span className="text-sm font-medium text-text-muted bg-surface px-3 py-1 rounded-full border border-border">
              {candidates.length} result{candidates.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-8 pr-2">
            {candidates.map((c) => {
              const isAdded = addedIds.has(c.id);
              return (
                <div key={c.id} className="bg-surface p-5 rounded-2xl border border-border shadow-sm hover:border-zinc-300 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-primary-bg text-primary text-[10px] font-bold uppercase tracking-wider shrink-0">EN</span>
                      <span className="text-lg font-bold text-text-main truncate">{c.en}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-md bg-success-bg text-success text-[10px] font-bold uppercase tracking-wider shrink-0">FR</span>
                      <span className="text-base font-medium text-text-muted truncate">{c.fr}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleAddCandidate(c)}
                    disabled={isAdded}
                    className={\`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all shadow-sm \${
                      isAdded 
                        ? 'bg-success-bg text-success border border-success' 
                        : 'bg-primary text-primary-text hover:bg-primary-hover hover:scale-105 active:scale-95'
                    }\`}
                    title={isAdded ? "Added to My Words" : "Add to My Words"}
                  >
                    {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/Dictionary.tsx', dictCode, 'utf8');
