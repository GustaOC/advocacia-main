import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('analysis-documents')
    .download('656cb7c8-fdbc-4050-8a2d-230e16f0e5f5/el64gp182l-1788285786043.pdf');
  
  const arrayBuffer = await fileData.arrayBuffer();
  
  try {
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();
    console.log("Extracted text length:", result.text.length);
    console.log("Snippet:", result.text.substring(0, 100));
  } catch (err) {
    console.error(err);
  }
}
test();
