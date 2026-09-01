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
  
  if (downloadError) {
    console.error(downloadError);
    return;
  }
  console.log("Blob size:", fileData.size);

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log("Buffer length:", buffer.length);

  try {
    const pdfModule = await import('pdf-parse');
    const pdfParse = pdfModule.default || pdfModule;
    const data = await pdfParse(buffer);
    console.log("Text length:", data.text.length);
    console.log("Text snippet:", data.text.substring(0, 100));
  } catch (err) {
    console.error("PDF Parse error:", err);
  }
}
test();
