const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  if (fs.statSync(dir).isDirectory()) {
    fs.readdirSync(dir).forEach(file => {
      walk(path.join(dir, file));
    });
  } else if (dir.endsWith('.tsx')) {
    let content = fs.readFileSync(dir, 'utf8');
    
    // Remove dark:text-surface entirely, or replace with text-text-main if it's the only one
    content = content.replace(/ text-text-main dark:text-surface/g, ' text-text-main');
    content = content.replace(/dark:text-surface/g, 'text-text-main');
    
    // Clean up duplicate text-text-main
    content = content.replace(/text-text-main text-text-main/g, 'text-text-main');
    
    // Clean up dark:focus:bg-zinc-800
    content = content.replace(/ dark:focus:bg-zinc-800/g, '');
    
    // Check for any dark:hover:bg-zinc-700
    content = content.replace(/ dark:hover:bg-zinc-700/g, '');

    fs.writeFileSync(dir, content, 'utf8');
  }
};

walk('./src');
