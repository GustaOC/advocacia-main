const fs = require('fs');
const path = require('path');

const directories = ['components', 'app'];

function replaceInFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace background colors
  content = content.replace(/\bbg-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-50\b/g, 'bg-brand-light/50');
  content = content.replace(/\bbg-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-100\b/g, 'bg-brand-light');
  content = content.replace(/\bbg-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-200\b/g, 'bg-brand-beige');
  content = content.replace(/\bbg-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(300|400|500)\b/g, 'bg-brand-sage');
  content = content.replace(/\bbg-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(600|700|800)\b/g, 'bg-brand');
  content = content.replace(/\bbg-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-900\b/g, 'bg-brand-black');

  // Replace text colors
  content = content.replace(/\btext-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(50|100|200|300)\b/g, 'text-brand-gray');
  content = content.replace(/\btext-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(400|500)\b/g, 'text-brand-sage');
  content = content.replace(/\btext-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(600|700|800)\b/g, 'text-brand');
  content = content.replace(/\btext-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-900\b/g, 'text-brand-black');

  // Replace border colors
  content = content.replace(/\bborder-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(50|100|200|300)\b/g, 'border-brand-light');
  content = content.replace(/\bborder-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(400|500)\b/g, 'border-brand-gray');
  content = content.replace(/\bborder-(blue|indigo|purple|cyan|amber|emerald|fuchsia)-(600|700|800|900)\b/g, 'border-brand');

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
console.log('Color wipe completed.');
