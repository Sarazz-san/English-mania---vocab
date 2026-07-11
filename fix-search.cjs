const fs = require('fs');
let code = fs.readFileSync('src/components/WordManager.tsx', 'utf8');

code = code.replace(
  `const s = search.toLowerCase();`,
  `const s = search.trim().toLowerCase();`
);

fs.writeFileSync('src/components/WordManager.tsx', code, 'utf8');
