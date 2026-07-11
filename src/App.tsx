import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ReviewSession from './components/ReviewSession';
import WordManager from './components/WordManager';
import VocabMatch from './components/VocabMatch';
import Dictionary from './components/Dictionary';
import HistoryTab from './components/HistoryTab';
import SettingsTab from './components/SettingsTab';
import ErrorBoundary from './components/ErrorBoundary';
import { Home, Layers, Gamepad2, BookA, Clock, Moon, Sun, Settings } from 'lucide-react';

export default function App() {
 const [activeTab, setActiveTab] = useState<'dashboard' | 'words' | 'game' | 'review' | 'dict' | 'history' | 'settings'>('dict');
 const [isDark, setIsDark] = useState(() => {
 const saved = localStorage.getItem('theme');
 if (saved) return saved === 'dark';
 return window.matchMedia('(prefers-color-scheme: dark)').matches;
 });
 
 const [addWordInitial, setAddWordInitial] = useState<{en: string, fr: string} | undefined>(undefined);

 useEffect(() => {
 if (isDark) {
 document.documentElement.classList.add('dark');
 localStorage.setItem('theme', 'dark');
 } else {
 document.documentElement.classList.remove('dark');
 localStorage.setItem('theme', 'light');
 }
 }, [isDark]);

 const handleAddWordFromDict = (en: string, fr: string) => {
 setAddWordInitial({ en, fr });
 setActiveTab('words');
 };

 const handleSearchFromHistory = (term: string) => {
 setActiveTab('dict');
 };

 return (
 <div className="min-h-screen bg-bg flex flex-col font-sans text-text-main transition-colors duration-300">
 
 {/* Top Navigation */}
 <header className="bg-surface border-b border-border sticky top-0 z-10 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm transition-colors">
 <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-text-main">
 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-surface shadow-inner">
 <BookA className="w-5 h-5" />
 </div>
 Smart Dic
 </div>
 
 {activeTab !== 'review' && (
 <div className="flex items-center gap-4">
 <nav className="hidden md:flex items-center bg-surface-hover p-1 rounded-xl">
 <NavButton icon={<BookA className="w-4 h-4" />} label="Dictionary" active={activeTab === 'dict'} onClick={() => setActiveTab('dict')} />
 <NavButton icon={<Home className="w-4 h-4" />} label="Learning" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
 <NavButton icon={<Layers className="w-4 h-4" />} label="My Words" active={activeTab === 'words'} onClick={() => setActiveTab('words')} />
 <NavButton icon={<Gamepad2 className="w-4 h-4" />} label="Match" active={activeTab === 'game'} onClick={() => setActiveTab('game')} />
 <NavButton icon={<Clock className="w-4 h-4" />} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
 <NavButton icon={<Settings className="w-4 h-4" />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
 </nav>
 <button 
 onClick={() => setIsDark(!isDark)}
 className="p-2 rounded-xl text-text-muted hover:text-text-main bg-surface-hover transition-colors"
 >
 {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
 </button>
 </div>
 )}
 </header>

 {/* Main Content Area */}
 <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
 <ErrorBoundary key={activeTab}>
 {activeTab === 'dict' && <Dictionary onAddWord={handleAddWordFromDict} />}
 {activeTab === 'dashboard' && <Dashboard onStartReview={() => setActiveTab('review')} />}
 {activeTab === 'words' && <WordManager initialWord={addWordInitial} onClearInitial={() => setAddWordInitial(undefined)} />}
 {activeTab === 'game' && <VocabMatch />}
 {activeTab === 'history' && <HistoryTab onSearchTerm={handleSearchFromHistory} />}
 {activeTab === 'settings' && <SettingsTab />}
 {activeTab === 'review' && <ReviewSession onFinish={() => setActiveTab('dashboard')} />}
 </ErrorBoundary>
 </main>

 {/* Mobile Navigation */}
 {activeTab !== 'review' && (
 <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-2 flex justify-around pb-safe z-20 transition-colors overflow-x-auto">
 <MobileNavButton icon={<BookA className="w-5 h-5" />} label="Dict" active={activeTab === 'dict'} onClick={() => setActiveTab('dict')} />
 <MobileNavButton icon={<Home className="w-5 h-5" />} label="Learn" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
 <MobileNavButton icon={<Layers className="w-5 h-5" />} label="Words" active={activeTab === 'words'} onClick={() => setActiveTab('words')} />
 <MobileNavButton icon={<Gamepad2 className="w-5 h-5" />} label="Match" active={activeTab === 'game'} onClick={() => setActiveTab('game')} />
 <MobileNavButton icon={<Settings className="w-5 h-5" />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
 </div>
 )}
 </div>
 );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
 active ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text-main'
 }`}
 >
 {icon} {label}
 </button>
 );
}

function MobileNavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors min-w-[4rem] ${
 active ? 'text-primary' : 'text-text-muted hover:text-text-main'
 }`}
 >
 {icon}
 <span className="text-[10px] font-medium mt-1">{label}</span>
 </button>
 );
}

