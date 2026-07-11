import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Clock, Search } from 'lucide-react';

export default function HistoryTab({ onSearchTerm }: { onSearchTerm: (term: string) => void }) {
 const history = useLiveQuery(() => db.searchHistory.orderBy('timestamp').reverse().limit(50).toArray());

 return (
 <div className="max-w-2xl mx-auto h-full flex flex-col pt-4 pb-8 animate-in fade-in">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 bg-primary-bg text-primary rounded-xl flex items-center justify-center">
 <Clock className="w-5 h-5" />
 </div>
 <h2 className="text-2xl font-bold text-text-main">Search History</h2>
 </div>

 <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex-1">
 {!history || history.length === 0 ? (
 <div className="p-10 text-center text-text-muted">
 No history yet. Start searching in the Dictionary!
 </div>
 ) : (
 <ul className="divide-y divide-border">
 {history.map(item => (
 <li key={item.id} className="p-4 hover:bg-bg/30 flex items-center justify-between transition-colors group cursor-pointer" onClick={() => onSearchTerm(item.term)}>
 <div className="flex items-center gap-3">
 <Search className="w-4 h-4 text-border group-hover:text-indigo-500 transition-colors" />
 <span className="font-medium text-text-main text-lg">{item.term}</span>
 {item.occurrences > 1 && (
 <span className="text-xs font-mono bg-surface-hover text-text-muted px-2 py-0.5 rounded-full">
 {item.occurrences}x
 </span>
 )}
 </div>
 <div className="text-xs text-text-muted">
 {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </div>
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 );
}
