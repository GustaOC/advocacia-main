const fs = require('fs');
const path = require('path');

const directories = ['components', 'app'];

const replacements = {
  'bg-slate-200': 'bg-brand-gray/30',
  'bg-slate-300': 'bg-brand-gray/50',
  'bg-slate-400': 'bg-brand-gray',
  'bg-slate-500': 'bg-brand-sage',
  'bg-slate-600': 'bg-brand-sage',
  'bg-slate-700': 'bg-brand/80',
  'bg-slate-800': 'bg-brand',
  'bg-slate-900': 'bg-brand-black',
  'border-slate-400': 'border-brand-gray',
  'border-slate-500': 'border-brand-sage',
  'border-slate-600': 'border-brand-sage',
  'border-slate-700': 'border-brand/80',
  'border-slate-800': 'border-brand',
  'border-slate-900': 'border-brand-black',
  'text-slate-300': 'text-brand-gray',
  'text-slate-200': 'text-brand-light',
  'text-slate-100': 'text-brand-beige',
  'text-slate-50': 'text-brand-light',
  'text-white': 'text-white' // No change, but let's keep pure white for ultra high contrast when inside brand-black
};

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const [oldClass, newClass] of Object.entries(replacements)) {
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
console.log('Sweep 2 completed.');
