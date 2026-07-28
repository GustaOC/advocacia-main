const fs = require('fs');

function fixTS(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Make sure getArrayData returns any[]
  content = content.replace(/const getArrayData = \(data: any\) => \{/g, 'const getArrayData = (data: any): any[] => {');

  // Fix filter/map variables by adding :any
  content = content.replace(/\.filter\(\(c\) =>/g, '.filter((c: any) =>');
  content = content.replace(/\.filter\(c =>/g, '.filter((c: any) =>');
  
  content = content.replace(/\.filter\(\(e\) =>/g, '.filter((e: any) =>');
  content = content.replace(/\.filter\(e =>/g, '.filter((e: any) =>');
  
  content = content.replace(/\.filter\(\(t\) =>/g, '.filter((t: any) =>');
  content = content.replace(/\.filter\(t =>/g, '.filter((t: any) =>');
  
  content = content.replace(/\.reduce\(\(acc, curr\) =>/g, '.reduce((acc: number, curr: any) =>');
  
  content = content.replace(/\.forEach\(\(c\) =>/g, '.forEach((c: any) =>');
  content = content.replace(/\.forEach\(c =>/g, '.forEach((c: any) =>');
  
  content = content.replace(/\.forEach\(\(a\) =>/g, '.forEach((a: any) =>');
  content = content.replace(/\.forEach\(a =>/g, '.forEach((a: any) =>');

  fs.writeFileSync(filePath, content);
  console.log('Fixed TS in', filePath);
}

fixTS('components/dashboard.tsx');
fixTS('components/reports-module.tsx');
