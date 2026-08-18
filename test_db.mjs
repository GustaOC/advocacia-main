import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error, count } = await supabase.from('publications').select('*', { count: 'exact' });
console.log(`Total records: ${count}`);
const today = data.filter(d => d.publication_date === '2026-08-18');
console.log(`Today's records: ${today.length}`);
