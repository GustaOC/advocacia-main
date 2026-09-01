import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: docs } = await supabase
    .from('analysis_documents')
    .select('*')
    .eq('file_type', 'application/pdf');
    
  if (!docs) return;

  for (const doc of docs) {
    if (!doc.extracted_text || doc.extracted_text.trim() === '') {
      console.log(`Fixing doc: ${doc.original_name}...`);
      
      const urlParts = doc.file_url.split('/analysis-documents/');
      if (urlParts.length < 2) continue;
      const filePath = urlParts[1];

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('analysis-documents')
        .download(filePath);
        
      if (downloadError) {
        console.error("Download error:", downloadError);
        continue;
      }
      
      const arrayBuffer = await fileData.arrayBuffer();
      
      try {
        const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
        const result = await parser.getText();
        
        await supabase
          .from('analysis_documents')
          .update({ extracted_text: result.text })
          .eq('id', doc.id);
          
        console.log(`Updated ${doc.original_name} (${result.text.length} chars)`);
      } catch (err) {
        console.error(`Error parsing ${doc.original_name}:`, err);
      }
    }
  }
}
run();
