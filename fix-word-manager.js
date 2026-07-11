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
  /<span className="font-semibold text-lg text-text-main">{w\.en}<\/span>/g,
  '<span className="font-semibold text-lg text-text-main">{w.en || "Unknown"}</span>'
);

code = code.replace(
  /<span className="text-sm px-2 py-0.5 rounded-full bg-surface-hover text-text-muted font-mono">{w\.pos}<\/span>/g,
  '<span className="text-sm px-2 py-0.5 rounded-full bg-surface-hover text-text-muted font-mono">{w.pos || "n"}</span>'
);

code = code.replace(
  /<div className="text-text-muted">{w\.fr}<\/div>/g,
  '<div className="text-text-muted">{w.fr || "Unknown"}</div>'
);

fs.writeFileSync(file, code);
