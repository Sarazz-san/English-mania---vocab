const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  if (fs.statSync(dir).isDirectory()) {
    fs.readdirSync(dir).forEach(file => {
      walk(path.join(dir, file));
    });
  } else if (dir.endsWith('.tsx')) {
    let content = fs.readFileSync(dir, 'utf8');
    
    // Some specific replacements first
    content = content.replace(/divide-zinc-100 dark:divide-zinc-800/g, 'divide-border');
    content = content.replace(/divide-zinc-100 dark:divide-zinc-700\/50/g, 'divide-border');
    content = content.replace(/divide-zinc-100/g, 'divide-border');
    
    content = content.replace(/bg-black\/40 dark:bg-black\/60/g, 'bg-black/50');
    
    // Remove all remaining dark: classes
    content = content.replace(/\bdark:[a-zA-Z0-9_/-]+\b/g, '');
    
    // Clean up multiple spaces
    content = content.replace(/ +/g, ' ');

    fs.writeFileSync(dir, content, 'utf8');
  }
};

walk('./src');
