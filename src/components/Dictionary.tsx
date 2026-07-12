import React, { useState } from 'react';
import { Search, Plus, Sparkles, Book, Globe, Clock, Check, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Pos, Register } from '../types';

interface Candidate {
  id: string;
  en: string;
  fr: string;
  example: string;
  pos: Pos;
  register: Register;
}

export default function Dictionary({ onAddWord }: { onAddWord?: (en: string, fr: string) => void }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [detectedPos, setDetectedPos] = useState<Pos>('n');
  const [detectedRegister, setDetectedRegister] = useState<Register>('neutral');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);

  // Manual entry states for offline/error fallback
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFr, setManualFr] = useState('');
  const [manualEn, setManualEn] = useState('');
  const [manualPos, setManualPos] = useState<Pos>('n');
  const [manualRegister, setManualRegister] = useState<Register>('neutral');
  const [manualExample, setManualExample] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = query.trim();
    if (!term) return;

    setIsSearching(true);
    setCandidates([]);
    setAddedIds(new Set());
    setError('');
    setIsCached(false);
    setShowManualForm(false);

    const normalizedTerm = term.toLowerCase();

    try {
      // 1. Check local IndexedDB cache first
      const cached = await db.dictionaryCache.get(normalizedTerm);
      if (cached) {
        const mappedCandidates: Candidate[] = cached.candidates.map((cand) => ({
          id: uuidv4(),
          en: cached.sourceLanguage === 'en' ? normalizedTerm : cand.word,
          fr: cached.sourceLanguage === 'fr' ? normalizedTerm : cand.word,
          example: cand.example,
          pos: cached.pos,
          register: cached.register
        }));

        setCandidates(mappedCandidates);
        setDetectedPos(cached.pos);
        setDetectedRegister(cached.register);
        setIsCached(true);
        setIsSearching(false);
        return;
      }

      // 2. Fallback to API if online
      if (!navigator.onLine) {
        throw new Error("Offline");
      }

      const res = await fetch('/api/dictionary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: term })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error');
      }

      const data = await res.json();
      
      if (data && data.candidates && data.candidates.length > 0) {
        const sourceLang = data.sourceLanguage || 'en';
        const mappedCandidates: Candidate[] = data.candidates.map((cand: any) => ({
          id: uuidv4(),
          en: sourceLang === 'en' ? term.toLowerCase() : cand.word.toLowerCase(),
          fr: sourceLang === 'fr' ? term.toLowerCase() : cand.word.toLowerCase(),
          example: cand.example || '',
          pos: (data.pos as Pos) || 'n',
          register: (data.register as Register) || 'neutral'
        }));

        setCandidates(mappedCandidates);
        setDetectedPos(data.pos || 'n');
        setDetectedRegister(data.register || 'neutral');

        // Store in IndexedDB Cache
        await db.dictionaryCache.put({
          word: normalizedTerm,
          sourceLanguage: sourceLang,
          candidates: data.candidates.map((c: any) => ({ word: c.word.toLowerCase(), example: c.example })),
          pos: data.pos || 'n',
          register: data.register || 'neutral',
          timestamp: Date.now()
        });
      } else {
        setError('Aucune traduction trouvée. Saisie manuelle requise.');
        setManualEn(sourceLangDetect(term) === 'en' ? term : '');
        setManualFr(sourceLangDetect(term) === 'fr' ? term : '');
        setShowManualForm(true);
      }

    } catch (err: any) {
      console.error(err);
      if (!navigator.onLine || err.message === 'Offline') {
        setError('Vous êtes hors-ligne. Saisie manuelle requise.');
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch'))) {
        setError('Impossible de contacter le serveur de traduction. Cela peut se produire si le serveur est en cours de démarrage ou si votre connexion est instable. Veuillez réessayer dans quelques instants.');
      } else {
        setError(err.message || 'Erreur lors de la recherche.');
      }
      setManualEn(sourceLangDetect(term) === 'en' ? term : '');
      setManualFr(sourceLangDetect(term) === 'fr' ? term : '');
      setShowManualForm(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Simple offline language detection fallback to preset manual inputs
  const sourceLangDetect = (text: string): 'en' | 'fr' => {
    const frAccents = /[éèêëàâäôöûüùîïç]/i;
    if (frAccents.test(text)) return 'fr';
    const frWords = ['le', 'la', 'les', 'un', 'une', 'des', 'avec', 'pour', 'dans', 'sur', 'et', 'ou', 'qui', 'que', 'je', 'tu', 'il', 'elle', 'nous', 'vous'];
    const words = text.toLowerCase().split(/\s+/);
    if (words.some(w => frWords.includes(w))) return 'fr';
    return 'en';
  };

  const handleAddCandidate = async (candidate: Candidate) => {
    if (addedIds.has(candidate.id)) return;
    
    // Duplicate check
    const allWords = await db.words.toArray();
    const isDuplicate = allWords.some(
      w => w.en.toLowerCase() === candidate.en.toLowerCase() && 
           w.fr.toLowerCase() === candidate.fr.toLowerCase()
    );
    
    if (isDuplicate) {
      alert(`"${candidate.en}" / "${candidate.fr}" figure déjà dans votre dictionnaire.`);
      setAddedIds(prev => new Set(prev).add(candidate.id));
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    await db.words.add({
      id,
      en: candidate.en,
      fr: candidate.fr,
      pos: candidate.pos,
      register: candidate.register,
      source: 'import',
      context: null,
      notes: candidate.example ? `Exemple: ${candidate.example}` : null,
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

    setAddedIds(prev => new Set(prev).add(candidate.id));
    if (onAddWord) {
      onAddWord(candidate.en, candidate.fr);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEn.trim() || !manualFr.trim()) return;

    const cleanEn = manualEn.trim().toLowerCase();
    const cleanFr = manualFr.trim().toLowerCase();

    // Duplicate check
    const allWords = await db.words.toArray();
    const isDuplicate = allWords.some(w => w.en.toLowerCase() === cleanEn && w.fr.toLowerCase() === cleanFr);
    
    if (isDuplicate) {
      alert(`"${cleanEn}" / "${cleanFr}" figure déjà dans votre dictionnaire.`);
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    await db.words.add({
      id,
      en: cleanEn,
      fr: cleanFr,
      pos: manualPos,
      register: manualRegister,
      source: 'import',
      context: null,
      notes: manualExample.trim() ? `Exemple: ${manualExample.trim()}` : null,
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

    alert("Mot ajouté avec succès !");
    setQuery('');
    setManualEn('');
    setManualFr('');
    setManualExample('');
    setShowManualForm(false);
    setError('');
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col pt-4 pb-8 animate-in fade-in">
      <div className="text-center mb-8 shrink-0">
        <h2 className="text-3xl font-bold tracking-tight text-text-main flex items-center justify-center gap-2">
          Smart Dic <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
        </h2>
        <p className="text-text-muted mt-2">Dictionnaire intelligent anglais-français ⚡</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 shrink-0">
        <div className="flex gap-2.5 items-stretch w-full">
          <div className="relative flex-1 shadow-sm rounded-2xl border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-bg transition-all flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-text-muted pointer-events-none" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Saisissez un mot à traduire en anglais ou français..."
              className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg bg-transparent outline-none text-text-main"
            />
          </div>
          <button 
            type="submit" 
            disabled={!query.trim() || isSearching}
            className="px-5 py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 text-sm sm:text-base active:scale-[0.98]"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-text border-t-transparent" />
                <span className="hidden sm:inline">Recherche...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Rechercher</span>
              </>
            )}
          </button>
        </div>
        {isCached && (
          <p className="text-xs text-text-muted mt-2 flex items-center gap-1 justify-end">
            <Clock className="w-3.5 h-3.5" /> Chargé depuis le cache local (hors-ligne)
          </p>
        )}
      </form>

      <AnimatePresence mode="wait">
        {isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            <p className="text-text-muted text-center px-4">Recherche des meilleures suggestions de traduction...</p>
          </motion.div>
        )}

        {error && !isSearching && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-surface border border-border rounded-2xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-main">{error}</p>
              <p className="text-xs text-text-muted mt-1">Vous pouvez saisir la traduction manuellement ci-dessous.</p>
            </div>
          </motion.div>
        )}

        {showManualForm && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-surface border border-border rounded-2xl p-6 shadow-sm mb-6"
          >
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              Saisie Manuelle <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <form onSubmit={handleAddManual} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Anglais *</label>
                  <input 
                    type="text"
                    required
                    value={manualEn}
                    onChange={e => setManualEn(e.target.value)}
                    placeholder="Ex: ubiquitous"
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary text-text-main text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Français *</label>
                  <input 
                    type="text"
                    required
                    value={manualFr}
                    onChange={e => setManualFr(e.target.value)}
                    placeholder="Ex: omniprésent"
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary text-text-main text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nature grammaticale</label>
                  <select 
                    value={manualPos} 
                    onChange={e => setManualPos(e.target.value as Pos)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary text-text-main text-sm"
                  >
                    <option value="n">Nom (n)</option>
                    <option value="v">Verbe (v)</option>
                    <option value="adj">Adjectif (adj)</option>
                    <option value="adv">Adverbe (adv)</option>
                    <option value="phrasal_v">Phrasal Verb</option>
                    <option value="expr">Expression / Autre</option>
                    <option value="prep">Préposition (prep)</option>
                    <option value="conj">Conjonction (conj)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Registre</label>
                  <select 
                    value={manualRegister} 
                    onChange={e => setManualRegister(e.target.value as Register)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary text-text-main text-sm"
                  >
                    <option value="neutral">Neutre</option>
                    <option value="conversational">Familier / Courant</option>
                    <option value="academic">Soutenu / Académique</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Exemple d'usage (Optionnel)</label>
                <input 
                  type="text"
                  value={manualExample}
                  onChange={e => setManualExample(e.target.value)}
                  placeholder="Ex: The internet is ubiquitous nowadays."
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl outline-none focus:border-primary text-text-main text-sm"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-text font-bold rounded-xl transition-all shadow-sm text-sm"
              >
                Ajouter au dictionnaire
              </button>
            </form>
          </motion.div>
        )}

        {candidates.length > 0 && !isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 shrink-0 border-b border-border pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-text-main">
                  Suggestions de Traduction
                </h3>
                <span className="text-xs bg-primary-bg text-primary px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-primary/20 shrink-0">
                  <Sparkles className="w-3 h-3" /> Traduction intelligente ⚡
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-text-muted bg-surface px-2.5 py-1 rounded-md border border-border capitalize">
                  Catégorie : {detectedPos === 'n' ? 'nom' : detectedPos === 'v' ? 'verbe' : detectedPos === 'adj' ? 'adjectif' : detectedPos === 'adv' ? 'adverbe' : detectedPos === 'phrasal_v' ? 'phrasal verb' : detectedPos === 'expr' ? 'expression' : detectedPos === 'prep' ? 'préposition' : detectedPos === 'conj' ? 'conjonction' : detectedPos}
                </span>
                <span className="text-xs font-bold text-text-muted bg-surface px-2.5 py-1 rounded-md border border-border capitalize">
                  Registre : {detectedRegister === 'neutral' ? 'neutre' : detectedRegister === 'conversational' ? 'courant' : 'académique'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-8 pr-2">
              {candidates.map((c, idx) => {
                const isAdded = addedIds.has(c.id);
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={c.id} 
                    className="bg-surface p-5 rounded-2xl border border-border shadow-sm hover:border-zinc-300 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-primary-bg text-primary text-[10px] font-bold uppercase tracking-wider shrink-0">EN</span>
                        <span className="text-lg font-bold text-text-main truncate">{c.en}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-success-bg text-success text-[10px] font-bold uppercase tracking-wider shrink-0">FR</span>
                        <span className="text-base font-medium text-text-muted truncate">{c.fr}</span>
                      </div>
                      {c.example && (
                        <div className="pl-3 border-l-2 border-primary/20 text-xs text-text-muted italic flex items-start gap-1.5 mt-2 bg-surface-hover py-1.5 px-2.5 rounded-r-lg">
                          <Book className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>"{c.example}"</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleAddCandidate(c)}
                      disabled={isAdded}
                      className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-xl transition-all shadow-sm ${
                        isAdded 
                          ? 'bg-success-bg text-success border border-success/30' 
                          : 'bg-primary text-primary-text hover:bg-primary-hover hover:scale-105 active:scale-95'
                      }`}
                      title={isAdded ? "Ajouté à mes mots" : "Ajouter à mes mots"}
                    >
                      {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
