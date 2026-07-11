const fs = require('fs');
const file = './src/components/WordManager.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix crash bug in filter
code = code.replace(
  /w\.en\.toLowerCase\(\)\.includes\(s\) \|\| w\.fr\.toLowerCase\(\)\.includes\(s\)/g,
  "(w.en || '').toLowerCase().includes(s) || (w.fr || '').toLowerCase().includes(s)"
);

// Fix crash bug in rendering (undefined properties)
code = code.replace(
  /<span className="font-semibold text-lg dark:text-white">{w\.en}<\/span>/g,
  '<span className="font-semibold text-lg dark:text-white">{w.en || "Unknown"}</span>'
);

code = code.replace(
  /<span className="text-sm px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">{w\.pos}<\/span>/g,
  '<span className="text-sm px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">{w.pos || "n"}</span>'
);

code = code.replace(
  /<div className="text-zinc-500 dark:text-zinc-400">{w\.fr}<\/div>/g,
  '<div className="text-zinc-500 dark:text-zinc-400">{w.fr || "Unknown"}</div>'
);

fs.writeFileSync(file, code);
