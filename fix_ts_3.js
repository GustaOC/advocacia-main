const fs = require('fs');

function fixTS(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/agreementsData\.data\.reduce/g, 'getArrayData(agreementsData).reduce');

  fs.writeFileSync(filePath, content);
  console.log('Fixed TS 3 in', filePath);
}

fixTS('components/reports-module.tsx');
