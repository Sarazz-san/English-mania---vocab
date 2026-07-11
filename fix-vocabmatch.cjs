const fs = require('fs');
let code = fs.readFileSync('src/components/VocabMatch.tsx', 'utf8');

// Replace sort(() => 0.5 - Math.random()) with proper shuffle
const shuffleFunc = `function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function VocabMatch() {`;

code = code.replace(/export default function VocabMatch\(\) \{/, shuffleFunc);

code = code.replace(/poolRef\.current = words\.sort\(\(\) => 0\.5 - Math\.random\(\)\);/g, 'poolRef.current = shuffleArray(words);');
code = code.replace(/poolRef\.current = \[\.\.\.poolRef\.current\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\);/g, 'poolRef.current = shuffleArray([...poolRef.current]);');

code = code.replace(/setCardsEn\(en\.sort\(\(\) => 0\.5 - Math\.random\(\)\)\);/g, 'setCardsEn(shuffleArray(en));');
code = code.replace(/setCardsFr\(fr\.sort\(\(\) => 0\.5 - Math\.random\(\)\)\);/g, 'setCardsFr(shuffleArray(fr));');

// Let's modify handleCardClick to properly extract current active words to avoid duplication
const oldTimeout = `        setTimeout(async () => {
          const nextW = await getNextWord();
          if (nextW) {
            activeWordsRef.current.add(nextW.id);
            setCardsEn(prev => {
              const arr = [...prev];
              arr[enItem.idx] = { id: \`en-\${nextW.id}-\${Date.now()}\`, wordId: nextW.id, text: nextW.en, lang: 'en' };
              return arr;
            });
            setCardsFr(prev => {
              const arr = [...prev];
              arr[frItem.idx] = { id: \`fr-\${nextW.id}-\${Date.now()}\`, wordId: nextW.id, text: nextW.fr, lang: 'fr' };
              return arr;
            });
          }
          setSelected([]);
        }, 200);`;

const newTimeout = `        setTimeout(async () => {
          // Instead of relying purely on activeWordsRef, we get the real active IDs from the cards
          setCardsEn(prevEn => {
            const currentActiveIds = new Set(prevEn.map(c => c.wordId));
            
            const nextW = (function getNextSafe() {
              if (poolRef.current.length === 0) return null;
              let loops = 0;
              while (loops < poolRef.current.length) {
                if (poolIdxRef.current >= poolRef.current.length) {
                  poolRef.current = shuffleArray([...poolRef.current]);
                  poolIdxRef.current = 0;
                }
                const candidate = poolRef.current[poolIdxRef.current++];
                if (!currentActiveIds.has(candidate.id)) {
                  return candidate;
                }
                loops++;
              }
              return null;
            })();
            
            if (nextW) {
              const newEn = [...prevEn];
              newEn[enItem.idx] = { id: \`en-\${nextW.id}-\${Date.now()}\`, wordId: nextW.id, text: nextW.en, lang: 'en' };
              
              setCardsFr(prevFr => {
                const newFr = [...prevFr];
                newFr[frItem.idx] = { id: \`fr-\${nextW.id}-\${Date.now()}\`, wordId: nextW.id, text: nextW.fr, lang: 'fr' };
                return newFr;
              });
              
              return newEn;
            }
            return prevEn;
          });
          
          setSelected([]);
        }, 200);`;

code = code.replace(oldTimeout, newTimeout);

fs.writeFileSync('src/components/VocabMatch.tsx', code, 'utf8');
