const fs = require('fs');
let code = fs.readFileSync('src/components/WordManager.tsx', 'utf8');

// The modal code
const modalCode = `
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
      )}`;

// Remove it from the end of the file
code = code.replace(modalCode, '');

// Append it to WordList return
// Find end of WordList:
// WordList returns a div. The last tag is probably </div>\n  );\n}
const wordListEndRegex = /(<\/div>\s*\);\s*}\s*)(function AddWord)/;
code = code.replace(wordListEndRegex, modalCode + '\n$1$2');

fs.writeFileSync('src/components/WordManager.tsx', code, 'utf8');

let dictCode = fs.readFileSync('src/components/Dictionary.tsx', 'utf8');
dictCode = dictCode.replace(/lastReviewedAt: null,\s*nextReviewAt: now/g, 'lastReviewedAt: null');
fs.writeFileSync('src/components/Dictionary.tsx', dictCode, 'utf8');
