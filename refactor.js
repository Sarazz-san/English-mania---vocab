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
  [/bg-zinc-900 dark:bg-white/g, 'bg-text-main'],
  [/bg-zinc-900/g, 'bg-text-main'],
  [/text-white dark:text-zinc-900/g, 'text-bg'],
  [/text-white/g, 'text-surface'], // Wait, text-white is sometimes explicitly needed, let's map it selectively later if needed
  [/hover:bg-zinc-50 dark:hover:bg-zinc-700\/50/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-50 dark:hover:bg-zinc-700/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-50 dark:hover:bg-zinc-800\/50/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-50 dark:hover:bg-zinc-800/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-100 dark:hover:bg-zinc-800/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-800 dark:hover:bg-zinc-100/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-800 dark:hover:bg-zinc-200/g, 'hover:bg-surface-hover'],
  [/hover:bg-zinc-50/g, 'hover:bg-surface-hover'],
  [/hover:text-zinc-700 dark:hover:text-zinc-200/g, 'hover:text-text-main'],
  [/hover:text-zinc-800 dark:hover:text-zinc-200/g, 'hover:text-text-main'],
  [/hover:text-zinc-800 dark:hover:text-white/g, 'hover:text-text-main'],
  [/hover:text-zinc-700/g, 'hover:text-text-main'],
  [/hover:text-zinc-800/g, 'hover:text-text-main'],
  [/hover:border-indigo-300 dark:hover:border-indigo-500\/50/g, 'hover:border-primary'],
  [/hover:border-indigo-300/g, 'hover:border-primary'],
  [/focus:border-indigo-500 dark:focus:border-indigo-500/g, 'focus:border-primary'],
  [/focus:border-indigo-500 dark:focus:border-indigo-400/g, 'focus:border-primary'],
  [/focus:border-indigo-500/g, 'focus:border-primary'],
  [/focus-within:border-indigo-500/g, 'focus-within:border-primary'],
  [/focus:ring-indigo-100 dark:focus:ring-indigo-900\/30/g, 'focus:ring-primary-bg'],
  [/focus:ring-indigo-100/g, 'focus:ring-primary-bg'],
  [/focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900\/30/g, 'focus-within:ring-primary-bg'],
  [/focus-within:ring-indigo-100/g, 'focus-within:ring-primary-bg'],
  [/text-zinc-300 dark:text-zinc-600/g, 'text-border'],
  [/text-zinc-300/g, 'text-border'],
];

const walk = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      replacer.forEach(([reg, rep]) => {
        content = content.replace(reg, rep);
      });
      // specific fix for dictionary padding
      content = content.replace(/pl-13/g, 'pl-12');
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  });
};

walk('./src/components');
walk('./src/App.tsx');
