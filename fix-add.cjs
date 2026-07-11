const fs = require('fs');
let code = fs.readFileSync('src/components/WordManager.tsx', 'utf8');

code = code.replace(
  `const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!en.trim() || !fr.trim()) return;

    const id = uuidv4();`,
  `const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!en.trim() || !fr.trim()) return;

    const allWords = await db.words.toArray();
    const isDuplicate = allWords.some(w => w.en.toLowerCase() === en.trim().toLowerCase() && w.fr.toLowerCase() === fr.trim().toLowerCase());
    
    if (isDuplicate) {
      alert('This exact English/French pair already exists in your dictionary.');
      return;
    }

    const id = uuidv4();`
);

fs.writeFileSync('src/components/WordManager.tsx', code, 'utf8');
