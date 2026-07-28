const fs = require('fs');
const path = require('path');

const directories = ['components', 'app'];

const replacements = {
  'brand-olive': 'brand-gray',
  'bg-slate-50': 'bg-brand-light/50',
  'bg-slate-100': 'bg-brand-beige/50',
  'text-slate-900': 'text-brand-black',
  'text-slate-800': 'text-brand',
  'text-slate-600': 'text-brand-gray',
  'text-slate-500': 'text-brand-sage',
  'text-slate-400': 'text-brand-gray',
  'border-slate-200': 'border-brand-gray',
  'border-slate-300': 'border-brand-gray',
  'border-slate-100': 'border-brand-light',
  'ring-slate-300': 'ring-brand-gray',
  'ring-slate-200': 'ring-brand-light'
};

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const [oldClass, newClass] of Object.entries(replacements)) {
    // Regex to match exact class names (with boundary or preceded/followed by space/quote)
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    newContent = newContent.replace(regex, newClass);
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
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
      processFile(filePath);
    }
  }
}

directories.forEach(walk);
console.log('Sweep completed.');
