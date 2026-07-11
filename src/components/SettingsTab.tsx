import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Settings, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SettingsTab() {
 const settingsRow = useLiveQuery(() => db.appState.get('settings'));
 const [inputValue, setInputValue] = useState('8');

 useEffect(() => {
 if (settingsRow && settingsRow.value && typeof settingsRow.value.dailyLimit === 'number') {
 setInputValue(settingsRow.value.dailyLimit.toString());
 }
 }, [settingsRow]);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 let val = parseInt(inputValue, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 30) val = 30;
    setInputValue(val.toString());
    await db.appState.put({ id: 'settings', value: { ...settingsRow?.value, dailyLimit: val } });
 alert('Settings saved!');
 };

 return (
 <div className="max-w-2xl mx-auto h-full flex flex-col pt-4 pb-8 animate-in fade-in">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 bg-primary-bg text-primary rounded-xl flex items-center justify-center">
 <Settings className="w-5 h-5" />
 </div>
 <h2 className="text-2xl font-bold text-text-main">Settings</h2>
 </div>

 <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm p-6">
 <form onSubmit={handleSave} className="space-y-6">
 <div>
 <label className="block text-sm font-medium text-text-main mb-2">Daily New Words Limit</label>
 <p className="text-xs text-text-muted mb-3">Maximum number of new words introduced per day when clicking "Learn New".</p>
 <input 
 type="number" 
 min="1" max="30" 
 value={inputValue}
 onChange={e => setInputValue(e.target.value)}
 onBlur={() => {
   let val = parseInt(inputValue, 10);
   if (isNaN(val) || val < 1) val = 1;
   if (val > 30) val = 30;
   setInputValue(val.toString());
 }}
 className="w-32 px-3 py-2 bg-bg border border-border rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary-bg transition-all text-text-main"
 />
 </div>
 
 <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-text rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-sm">
 <Save className="w-4 h-4" /> Save Changes
 </button>
 </form>
 </div>
 </div>
 );
}
