const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsTab.tsx', 'utf8');

code = code.replace(
  `const [dailyLimit, setDailyLimit] = useState(8);`,
  `const [inputValue, setInputValue] = useState('8');`
);

code = code.replace(
  `setDailyLimit(settingsRow.value.dailyLimit);`,
  `setInputValue(settingsRow.value.dailyLimit.toString());`
);

code = code.replace(
  `await db.appState.put({ id: 'settings', value: { ...settingsRow?.value, dailyLimit } });`,
  `let val = parseInt(inputValue, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 30) val = 30;
    setInputValue(val.toString());
    await db.appState.put({ id: 'settings', value: { ...settingsRow?.value, dailyLimit: val } });`
);

code = code.replace(
  `value={dailyLimit}
              onChange={e => setDailyLimit(parseInt(e.target.value) || 8)}`,
  `value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={() => {
                let val = parseInt(inputValue, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 30) val = 30;
                setInputValue(val.toString());
              }}`
);

fs.writeFileSync('src/components/SettingsTab.tsx', code, 'utf8');
