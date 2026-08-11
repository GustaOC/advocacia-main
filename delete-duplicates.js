import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: pubs, error } = await supabase
    .from('publications')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching:", error);
    return;
  }

  const seen = new Map();
  const toDelete = [];

  for (const pub of pubs) {
    const key = `${pub.title}|${pub.publication_date}`;
    if (seen.has(key)) {
      toDelete.push(pub.id);
    } else {
      seen.set(key, pub.id);
    }
  }

  console.log(`Found ${toDelete.length} duplicates to delete.`);

  // Delete in batches of 100
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error: delError } = await supabase
      .from('publications')
      .delete()
      .in('id', batch);
      
    if (delError) {
      console.error("Error deleting batch:", delError);
    } else {
      console.log(`Deleted batch of ${batch.length}`);
    }
  }

  console.log("Done.");
}

run();
