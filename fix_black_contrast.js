const fs = require('fs');
const path = require('path');

const directories = ['components', 'app'];

function replaceInFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace gradient black backgrounds with solid black, because gradients don't fit the new formal aesthetic
  content = content.replace(/bg-gradient-to-[a-z]+ from-brand-black to-brand-black\/90/g, 'bg-brand-black');
  
  // Specific fix for Employee Management TableHeader
  if (filePath.includes('employee-management.tsx')) {
    content = content.replace(/className="text-slate-700 font-bold"/g, 'className="text-brand-beige font-bold"');
    content = content.replace(/bg-brand-black text-slate-700/g, 'bg-brand-black text-brand-beige');
  }

  // General fixes for text on black background
  // If it's a Badge/Span with bg-brand-black and text-slate-700 or text-brand
  content = content.replace(/bg-brand-black text-slate-700/g, 'bg-brand-black text-brand-light');
  content = content.replace(/bg-brand-black text-brand-black/g, 'bg-brand-black text-white');
  
  // Update hover states that use slate on top of black
  content = content.replace(/hover:from-slate-100 hover:to-slate-200/g, 'hover:bg-brand-darkolive');

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
console.log('Black contrast fix completed.');
