const fs = require('fs');
const path = require('path');

const directories = ['components', 'app'];

function replaceInFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix text-slate-700 inside TableHead
  content = content.replace(/<TableHead([^>]*)text-slate-700([^>]*)>/g, '<TableHead$1text-brand-beige$2>');
  
  // Fix text-slate-700 inside Badge or span with bg-brand-black (though they should be covered)
  // Let's replace any remaining text-slate-700 globally to text-brand (dark olive) because slate-700 is a dark text color
  content = content.replace(/\btext-slate-700\b/g, 'text-brand');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else {
      replaceInFile(filePath);
    }
  }
}

directories.forEach(walk);
console.log('TableHead fix completed.');
