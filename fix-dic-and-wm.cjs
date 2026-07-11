const fs = require('fs');

// --- 1. Fix Dictionary.tsx ---
let dictCode = fs.readFileSync('src/components/Dictionary.tsx', 'utf8');
dictCode = dictCode.replace(
  /const uniqueMatches = new Map<string, Candidate>\(\);\s*data\.matches\.forEach\(\(m: any\) => \{[\s\S]*?\}\);/g,
  `const uniqueMatches = new Map<string, Candidate>();
        data.matches.forEach((m: any) => {
          if (m.match < 0.7) return;
          
          const translated = m.translation.toLowerCase().trim();
          const source = m.segment.toLowerCase().trim();
          
          if (!translated || !source) return;
          
          // Reject characters outside extended Latin
          const latinRegex = /^[a-zA-ZÀ-ÿ\\s\\'\\-.,!?()]+$/;
          if (!latinRegex.test(translated) || !latinRegex.test(source)) return;
          
          const en = isEnToFr ? source : translated;
          const fr = isEnToFr ? translated : source;
          
          // Deduplicate by stringifying, maybe ignoring minor space differences
          const cleanEn = en.replace(/\\s+/g, ' ').trim();
          const cleanFr = fr.replace(/\\s+/g, ' ').trim();
          const key = \`\${cleanEn}-\${cleanFr}\`;
          
          if (!uniqueMatches.has(key) || uniqueMatches.get(key)!.quality < m.match) {
            uniqueMatches.set(key, {
              id: uuidv4(),
              en: cleanEn,
              fr: cleanFr,
              quality: m.match || 0
            });
          }
        });`
);
dictCode = dictCode.replace(
  /setError\('No valid translation candidates found\.'\);/,
  `setError('Aucune traduction fiable trouvée, saisie manuelle requise.');`
);
dictCode = dictCode.replace(
  /setError\('No translation found\.'\);/,
  `setError('Aucune traduction fiable trouvée, saisie manuelle requise.');`
);
fs.writeFileSync('src/components/Dictionary.tsx', dictCode, 'utf8');

// --- 2. Fix WordManager.tsx ---
let wmCode = fs.readFileSync('src/components/WordManager.tsx', 'utf8');

// The issue is that the Trash2 button was never added to the rendered list items in WordManager.tsx.
// Let's find the li block.
const liRegex = /(<li key=\{w\.id\}.*?>[\s\S]*?<div className="text-xs text-text-muted flex flex-col items-end">[\s\S]*?<span>\{new Date\(w\.dateAdded\)\.toLocaleDateString\(\)\}<\/span>\s*<\/div>)/;
const replacementLi = `$1\n            <button\n              onClick={(e) => { e.stopPropagation(); setWordToDelete(w); }}\n              className="ml-4 p-2 text-text-muted hover:text-danger hover:bg-danger-bg rounded-xl transition-colors"\n              title="Delete word"\n            >\n              <Trash2 className="w-5 h-5" />\n            </button>`;

wmCode = wmCode.replace(liRegex, replacementLi);

fs.writeFileSync('src/components/WordManager.tsx', wmCode, 'utf8');
