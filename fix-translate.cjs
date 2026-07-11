const fs = require('fs');
let wmCode = fs.readFileSync('src/components/WordManager.tsx', 'utf8');

const oldTranslate = `const translate = async () => {
    if (!en.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch(\`https://api.mymemory.translated.net/get?q=\${encodeURIComponent(en)}&langpair=en|fr\`);
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        setFr(data.responseData.translatedText.toLowerCase());
      }
      handleAutoDetect(en);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };`;

const newTranslate = `const translate = async () => {
    if (!en.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch(\`https://api.mymemory.translated.net/get?q=\${encodeURIComponent(en)}&langpair=en|fr\`);
      const data = await res.json();
      
      let bestTranslation = "";
      if (data && data.matches) {
        const validMatches = data.matches.filter((m: any) => {
          if (m.match < 0.7) return false;
          const translated = m.translation.trim();
          const latinRegex = /^[a-zA-ZÀ-ÿ\\s\\'\\-.,!?()]+$/;
          if (!latinRegex.test(translated)) return false;
          return true;
        });
        if (validMatches.length > 0) {
          validMatches.sort((a: any, b: any) => b.match - a.match);
          bestTranslation = validMatches[0].translation.trim().toLowerCase();
        }
      }
      
      if (bestTranslation) {
        setFr(bestTranslation);
      } else {
        setFr("Aucune traduction fiable");
      }
      handleAutoDetect(en);
    } catch (e) {
      console.error(e);
      setFr("Aucune traduction fiable");
    } finally {
      setIsTranslating(false);
    }
  };`;

wmCode = wmCode.replace(
  /const translate = async \(\) => \{[\s\S]*?setIsTranslating\(false\);\s*\}\s*\};\s*/,
  newTranslate + '\n\n  '
);

fs.writeFileSync('src/components/WordManager.tsx', wmCode, 'utf8');
