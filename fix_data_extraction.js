const fs = require('fs');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add helper function to extract array from API response
  const helper = `
  const getArrayData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.cases && Array.isArray(data.cases)) return data.cases;
    if (data.entities && Array.isArray(data.entities)) return data.entities;
    return [];
  };
`;
  if (!content.includes('const getArrayData')) {
    // Insert after useQuery declarations or inside component
    content = content.replace(/const \{ data: casesData/g, helper + '\n  const { data: casesData');
  }

  // Replace data usages
  content = content.replace(/casesData\?\.cases\?/g, 'getArrayData(casesData)');
  content = content.replace(/casesData\?\.cases/g, 'getArrayData(casesData)');
  content = content.replace(/agreementsData\?\.data\?/g, 'getArrayData(agreementsData)');
  content = content.replace(/agreementsData\?\.data/g, 'getArrayData(agreementsData)');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

fixFile('components/reports-module.tsx');
fixFile('components/dashboard.tsx');
