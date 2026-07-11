const fs = require('fs');
let code = fs.readFileSync('src/components/WordManager.tsx', 'utf8');

if (!code.includes('Trash2')) {
  code = code.replace(/Archive, Upload, Download, Zap/, 'Archive, Upload, Download, Zap, Trash2, AlertTriangle, X');
  
  // Add state for wordToDelete
  code = code.replace(
    /const \[search, setSearch\] = useState\(''\);/,
    `const [search, setSearch] = useState('');
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);`
  );
  
  // Add delete handler
  code = code.replace(
    /const toggleArchive = async \(w: Word\) => {/,
    `const handleDelete = async () => {
    if (wordToDelete && wordToDelete.id) {
      await db.words.delete(wordToDelete.id);
      setWordToDelete(null);
    }
  };

  const toggleArchive = async (w: Word) => {`
  );
  
  // Add Trash icon to list item
  code = code.replace(
    /<button onClick={\(\) => toggleArchive\(w\)} title={w.archived \? "Unarchive" : "Archive"} className="p-1.5 text-text-muted hover:text-text-main transition-colors">/,
    `<button onClick={() => toggleArchive(w)} title={w.archived ? "Unarchive" : "Archive"} className="p-1.5 text-text-muted hover:text-text-main transition-colors">`
  );
  
  code = code.replace(
    /<Archive className="w-4 h-4" \/>\s*<\/button>\s*<\/div>\s*<\/li>/g,
    `<Archive className="w-4 h-4" />
                </button>
                <button onClick={() => setWordToDelete(w)} title="Delete permanently" className="p-1.5 text-text-muted hover:text-danger transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>`
  );
  
  // Add Modal at the end of return
  code = code.replace(
    /<\/div>\s*\);\s*}\s*$/g,
    `
      {wordToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-lg border border-border animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-danger-bg text-danger rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Delete Word</h3>
                <p className="text-sm text-text-muted mt-1">
                  Are you sure you want to permanently delete "{wordToDelete.en}" / "{wordToDelete.fr}"? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setWordToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main bg-surface-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-surface bg-danger hover:bg-rose-600 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
  );
}

fs.writeFileSync('src/components/WordManager.tsx', code, 'utf8');
