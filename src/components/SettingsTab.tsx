import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Settings, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SettingsTab() {
  const settingsRow = useLiveQuery(() => db.appState.get('settings'));
  const [inputValue, setInputValue] = useState('8');
  const [trapMode, setTrapMode] = useState(false);

  useEffect(() => {
    if (settingsRow && settingsRow.value) {
      if (typeof settingsRow.value.dailyLimit === 'number') {
        setInputValue(settingsRow.value.dailyLimit.toString());
      }
      setTrapMode(!!settingsRow.value.trapMode);
    }
  }, [settingsRow]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let val = parseInt(inputValue, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 30) val = 30;
    setInputValue(val.toString());
    await db.appState.put({ id: 'settings', value: { ...settingsRow?.value, dailyLimit: val, trapMode } });
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

 <div className="border-t border-border pt-6">
 <label className="flex items-start gap-3 cursor-pointer">
 <input 
 type="checkbox" 
 id="settings_trap_mode"
 checked={trapMode}
 onChange={e => setTrapMode(e.target.checked)}
 className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary-bg bg-bg"
 />
 <div>
 <span className="block text-sm font-medium text-text-main">Mode Piège (Survival Match)</span>
 <span className="block text-xs text-text-muted mt-1">
 Certains mots issus de vos sessions d'apprentissage apparaissent d'un seul côté au début (probabilité de 15-20% à partir du niveau de jeu 2).
 La traduction manquante est injectée au prochain match réussi, empêchant d'appairer par simple élimination.
 </span>
 </div>
 </label>
 </div>
 
 <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-text rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-sm">
 <Save className="w-4 h-4" /> Save Changes
 </button>
 </form>
 </div>
 </div>
 );
}
