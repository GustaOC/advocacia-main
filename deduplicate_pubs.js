import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: allPubs, error } = await supabase.from('publications').select('*').order('created_at', { ascending: true });
  if (error) {
     console.error("Error fetching:", error);
     return;
  }
  
  const seen = new Set();
  const toDelete = [];
  
  for (const pub of allPubs) {
    const key = `${pub.title}_${pub.publication_date}`;
    if (seen.has(key)) {
      toDelete.push(pub.id);
    } else {
      seen.add(key);
    }
  }
  
  console.log(`Found ${toDelete.length} duplicates to delete.`);
  
  if (toDelete.length > 0) {
    // Delete in batches to avoid URL length limits if there are many
    const batchSize = 100;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      const { error: delError } = await supabase.from('publications').delete().in('id', batch);
      if (delError) {
        console.error("Error deleting batch:", delError);
      } else {
        console.log(`Deleted batch of ${batch.length}`);
      }
    }
  }
  
  console.log("Deduplication complete.");
}
run();
