const fs = require('fs');

// Dictionary.tsx fix
let dictCode = fs.readFileSync('src/components/Dictionary.tsx', 'utf8');
dictCode = dictCode.replace(
  /consecutiveResets: 0,\s*lastReviewedAt: null/g,
  'consecutiveResets: 0,\n      lastReviewedAt: null,\n      nextDueAt: now,\n      exposureCount: 0'
);
fs.writeFileSync('src/components/Dictionary.tsx', dictCode, 'utf8');

// WordManager.tsx fix
let wmCode = fs.readFileSync('src/components/WordManager.tsx', 'utf8');
wmCode = wmCode.replace(
  /const handleDelete = async \(\) => {[\s\S]*?};/g,
  ''
);

// We'll put it right after the Search/Delete states in WordList
wmCode = wmCode.replace(
  /const \[wordToDelete, setWordToDelete\] = useState<Word \| null>\(null\);/g,
  `const [wordToDelete, setWordToDelete] = useState<Word | null>(null);
  
  const handleDelete = async () => {
    if (wordToDelete && wordToDelete.id) {
      await db.words.delete(wordToDelete.id);
      setWordToDelete(null);
    }
  };`
);

fs.writeFileSync('src/components/WordManager.tsx', wmCode, 'utf8');
