const fs = require('fs');
const path = require('path');

const replacer = [
  [/bg-zinc-50 dark:bg-zinc-950/g, 'bg-bg'],
  [/bg-white dark:bg-zinc-900/g, 'bg-surface'],
  [/bg-white dark:bg-zinc-800\/50/g, 'bg-surface'],
  [/bg-white dark:bg-zinc-800/g, 'bg-surface'],
  [/bg-white/g, 'bg-surface'],
  [/bg-zinc-50 dark:bg-zinc-900/g, 'bg-surface-hover'],
  [/bg-zinc-100 dark:bg-zinc-800\/50/g, 'bg-surface-hover'],
  [/bg-zinc-100 dark:bg-zinc-800/g, 'bg-surface-hover'],
  [/bg-zinc-100 dark:bg-zinc-900/g, 'bg-surface-hover'],
  [/bg-zinc-100 dark:bg-zinc-700/g, 'bg-surface-hover'],
  [/bg-zinc-100/g, 'bg-surface-hover'],
  [/bg-zinc-50/g, 'bg-bg'],
  [/border-zinc-200 dark:border-zinc-800/g, 'border-border'],
  [/border-zinc-200 dark:border-zinc-700/g, 'border-border'],
  [/border-zinc-100 dark:border-zinc-800/g, 'border-border'],
  [/border-zinc-100 dark:border-zinc-700/g, 'border-border'],
  [/border-zinc-200/g, 'border-border'],
  [/border-zinc-100/g, 'border-border'],
  [/text-zinc-900 dark:text-white/g, 'text-text-main'],
  [/text-zinc-900 dark:text-zinc-100/g, 'text-text-main'],
  [/text-zinc-800 dark:text-zinc-200/g, 'text-text-main'],
  [/text-zinc-700 dark:text-zinc-300/g, 'text-text-main'],
  [/text-zinc-900/g, 'text-text-main'],
  [/text-zinc-800/g, 'text-text-main'],
  [/text-zinc-700/g, 'text-text-main'],
  [/text-zinc-600 dark:text-zinc-400/g, 'text-text-muted'],
  [/text-zinc-600 dark:text-zinc-300/g, 'text-text-muted'],
  [/text-zinc-500 dark:text-zinc-400/g, 'text-text-muted'],
  [/text-zinc-400 dark:text-zinc-500/g, 'text-text-muted'],
  [/text-zinc-600/g, 'text-text-muted'],
  [/text-zinc-500/g, 'text-text-muted'],
  [/text-zinc-400/g, 'text-text-muted'],
  [/text-indigo-950 dark:text-indigo-100/g, 'text-text-main'],
  [/text-indigo-950/g, 'text-text-main'],
  [/text-indigo-600 dark:text-indigo-400/g, 'text-primary'],
  [/text-indigo-700 dark:text-indigo-400/g, 'text-primary'],
  [/text-indigo-700 dark:text-indigo-300/g, 'text-primary'],
  [/text-indigo-600/g, 'text-primary'],
  [/text-indigo-700/g, 'text-primary'],
  [/bg-indigo-600/g, 'bg-primary'],
  [/bg-indigo-700/g, 'bg-primary-hover'],
  [/bg-indigo-100 dark:bg-indigo-900\/30/g, 'bg-primary-bg'],
  [/bg-indigo-50 dark:bg-indigo-900\/30/g, 'bg-primary-bg'],
  [/bg-indigo-50 dark:bg-indigo-900\/40/g, 'bg-primary-bg'],
  [/bg-indigo-50 dark:bg-indigo-900\/20/g, 'bg-primary-bg'],
  [/bg-indigo-100/g, 'bg-primary-bg'],
  [/bg-indigo-50/g, 'bg-primary-bg'],
  [/text-emerald-600 dark:text-emerald-400/g, 'text-success'],
  [/text-emerald-700 dark:text-emerald-400/g, 'text-success'],
  [/text-emerald-900 dark:text-emerald-400/g, 'text-success-text'],
  [/text-emerald-600/g, 'text-success'],
  [/text-emerald-700/g, 'text-success'],
  [/text-emerald-900/g, 'text-success-text'],
  [/bg-emerald-100 dark:bg-emerald-900\/30/g, 'bg-success-bg'],
  [/bg-emerald-50 dark:bg-emerald-900\/30/g, 'bg-success-bg'],
  [/bg-emerald-50 dark:bg-emerald-900\/20/g, 'bg-success-bg'],
  [/bg-emerald-100/g, 'bg-success-bg'],
  [/bg-emerald-50/g, 'bg-success-bg'],
  [/text-rose-600 dark:text-rose-400/g, 'text-danger'],
  [/text-rose-700 dark:text-rose-400/g, 'text-danger'],
  [/text-rose-500 dark:text-rose-400/g, 'text-danger'],
  [/text-rose-900 dark:text-rose-400/g, 'text-danger-text'],
  [/text-rose-600/g, 'text-danger'],
  [/text-rose-700/g, 'text-danger'],
  [/text-rose-500/g, 'text-danger'],
  [/text-rose-900/g, 'text-danger-text'],
  [/bg-rose-50 dark:bg-rose-900\/20/g, 'bg-danger-bg'],
  [/bg-rose-400/g, 'bg-danger'],
  [/bg-rose-50/g, 'bg-danger-bg'],
  [/bg-zinc-900 dark:bg-surface/g, 'bg-text-main'],
  [/bg-zinc-900/g, 'bg-text-main'],
  [/text-surface dark:text-text-main/g, 'text-bg'],
  [/text-surface/g, 'text-surface'], // Keep it text-surface if we replaced text-white
  [/hover:bg-bg dark:hover:bg-surface-hover\/50/g, 'hover:bg-surface-hover'],
  [/hover:bg-bg dark:hover:bg-surface-hover/g, 'hover:bg-surface-hover'],
  [/hover:bg-bg dark:hover:bg-surface-hover\/50/g, 'hover:bg-surface-hover'],
  [/hover:bg-bg dark:hover:bg-surface-hover/g, 'hover:bg-surface-hover'],
  [/hover:bg-surface-hover dark:hover:bg-surface-hover/g, 'hover:bg-surface-hover'],
  [/hover:bg-surface-hover dark:hover:bg-surface-hover/g, 'hover:bg-surface-hover'],
  [/hover:bg-surface-hover dark:hover:bg-surface-hover/g, 'hover:bg-surface-hover'],
  [/hover:bg-bg/g, 'hover:bg-surface-hover'],
  [/hover:text-text-main dark:hover:text-text-main/g, 'hover:text-text-main'],
  [/hover:text-text-main dark:hover:text-text-main/g, 'hover:text-text-main'],
  [/hover:text-text-main dark:hover:text-surface/g, 'hover:text-text-main'],
  [/hover:text-text-main/g, 'hover:text-text-main'],
  [/hover:text-text-main/g, 'hover:text-text-main'],
  [/hover:border-primary dark:hover:border-primary\/50/g, 'hover:border-primary'],
  [/hover:border-primary/g, 'hover:border-primary'],
  [/focus:border-primary dark:focus:border-primary/g, 'focus:border-primary'],
  [/focus:border-primary dark:focus:border-primary/g, 'focus:border-primary'],
  [/focus:border-primary/g, 'focus:border-primary'],
  [/focus-within:border-primary/g, 'focus-within:border-primary'],
  [/focus:ring-primary-bg dark:focus:ring-primary-bg\/30/g, 'focus:ring-primary-bg'],
  [/focus:ring-primary-bg/g, 'focus:ring-primary-bg'],
  [/focus-within:ring-primary-bg dark:focus-within:ring-primary-bg\/30/g, 'focus-within:ring-primary-bg'],
  [/focus-within:ring-primary-bg/g, 'focus-within:ring-primary-bg'],
  [/text-border dark:text-text-muted/g, 'text-border'],
  [/text-border/g, 'text-border'],
  [/dark:text-text-main/g, 'text-text-main'],
];

const walk = (dir) => {
  if (fs.statSync(dir).isDirectory()) {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      walk(fullPath);
    });
  } else if (dir.endsWith('.tsx')) {
    let content = fs.readFileSync(dir, 'utf8');
    replacer.forEach(([reg, rep]) => {
      content = content.replace(reg, rep);
    });
    // specific fix for dictionary padding
    content = content.replace(/pl-13/g, 'pl-12');
    fs.writeFileSync(dir, content, 'utf8');
  }
};

walk('./src/App.tsx');
