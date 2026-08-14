const fs = require('fs');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  if (!urlMatch || !keyMatch) {
    console.error("No Supabase credentials found in .env.local");
    return;
  }
  
  const supabaseUrl = urlMatch[1].trim();
  const supabaseKey = keyMatch[1].trim();
  
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  // Find entities matching 'Aline'
  const entitiesRes = await fetch(`${supabaseUrl}/rest/v1/entities?name=ilike.*Aline*&select=id,name`, { headers });
  const entities = await entitiesRes.json();
  
  console.log("Found entities for Aline:", entities);
  const entityIds = entities.map(e => e.id);
  
  if (entityIds.length === 0) {
    console.log("No entity found with name Aline.");
    return;
  }

  // Find financial agreements where debtor or creditor is Aline
  const agreementsRes = await fetch(`${supabaseUrl}/rest/v1/financial_agreements?or=(debtor_id.in.(${entityIds.join(',')}),creditor_id.in.(${entityIds.join(',')}))&select=id,case_id`, { headers });
  const agreements = await agreementsRes.json();
  
  console.log("Found financial agreements for Aline:", agreements);
  
  const caseIds = agreements.map(a => a.case_id).filter(Boolean);
  
  if (caseIds.length === 0) {
    console.log("No associated cases found for these agreements.");
    return;
  }
  
  // Update cases
  for (const caseId of caseIds) {
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/cases?id=eq.${caseId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'Acordo' })
    });
    
    if (!updateRes.ok) {
      console.error(`Error updating case ${caseId}:`, await updateRes.text());
    } else {
      console.log(`Updated case:`, await updateRes.json());
    }
  }
}

main().catch(console.error);
