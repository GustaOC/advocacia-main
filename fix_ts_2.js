const fs = require('fs');

function fixTS(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/casesData\.cases\.forEach/g, 'getArrayData(casesData).forEach');
  content = content.replace(/agreementsData\.data\.forEach/g, 'getArrayData(agreementsData).forEach');

  fs.writeFileSync(filePath, content);
  console.log('Fixed TS 2 in', filePath);
}

fixTS('components/dashboard.tsx');
fixTS('components/reports-module.tsx');
