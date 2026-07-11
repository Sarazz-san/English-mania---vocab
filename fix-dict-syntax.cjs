const fs = require('fs');
let code = fs.readFileSync('src/components/Dictionary.tsx', 'utf8');

code = code.replace(
  `        });
          }
        });`,
  `        });`
);
fs.writeFileSync('src/components/Dictionary.tsx', code, 'utf8');
