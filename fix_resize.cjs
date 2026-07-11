const fs = require('fs');
let code = fs.readFileSync('src/components/VocabMatch.tsx', 'utf8');

const resizeLogic = `
  const [pairsCount, setPairsCount] = useState(5);
  
  useEffect(() => {
    const calcPairs = () => {
       if (window.innerHeight < 550) return 3;
       if (window.innerHeight < 750) return 4;
       return 5;
    };
    setPairsCount(calcPairs());
    const handleResize = () => setPairsCount(calcPairs());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
`;

code = code.replace(
  'const timerRef = useRef<NodeJS.Timeout | null>(null);',
  `const timerRef = useRef<NodeJS.Timeout | null>(null);\n${resizeLogic}`
);

// We need max pairs to be 6 when initializing so slicing works
code = code.replace(
  `let pairsCount = 5;
    if (window.innerHeight < 600) pairsCount = 3;
    else if (window.innerHeight < 800) pairsCount = 4;
    
    if (pairsCount > words.length) pairsCount = words.length;`,
  `let maxPairs = 6;
    if (maxPairs > words.length) maxPairs = words.length;`
);

code = code.replace(
  `for (let i = 0; i < pairsCount; i++) {`,
  `for (let i = 0; i < maxPairs; i++) {`
);

// Map slice
code = code.replace(
  `{cardsEn.map((c, i) => renderCard(c, i, 'en'))}`,
  `{cardsEn.slice(0, pairsCount).map((c, i) => renderCard(c, i, 'en'))}`
);
code = code.replace(
  `{cardsFr.map((c, i) => renderCard(c, i, 'fr'))}`,
  `{cardsFr.slice(0, pairsCount).map((c, i) => renderCard(c, i, 'fr'))}`
);

fs.writeFileSync('src/components/VocabMatch.tsx', code, 'utf8');
