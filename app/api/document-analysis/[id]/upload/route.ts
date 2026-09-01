import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes on Vercel Pro

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = params;
    
    // Check if JSON request (signed url flow)
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return NextResponse.json({ error: 'Use JSON com arquivos pre-upados' }, { status: 400 });
    }

    const { files } = await request.json();
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Process all files concurrently to speed up text extraction
    const processPromises = files.map(async (file: any) => {
      try {
        const { filePath, originalName, fileType, fileSize } = file;
        const fileExt = originalName.split('.').pop()?.toLowerCase() || '';

        // Download file from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('analysis-documents')
          .download(filePath);

        if (downloadError) throw downloadError;

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-documents')
          .getPublicUrl(filePath);

        let extractedText = '';

        if (fileExt === 'pdf') {
          try {
            const { PDFParse } = await import('pdf-parse');
            const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
            const data = await parser.getText();
            extractedText = data.text;
          } catch (err) {
            console.error("Erro ao extrair texto do PDF:", err);
          }
        } else if (fileExt === 'docx') {
          try {
            const mammoth = await import('mammoth');
            const data = await mammoth.extractRawText({ buffer });
            extractedText = data.value;
          } catch (err) {
            console.error("Erro ao extrair texto do DOCX:", err);
          }
        } else if (fileExt === 'txt') {
          extractedText = buffer.toString('utf8');
        }

        const { data: newDoc, error: insertError } = await supabase
          .from('analysis_documents')
          .insert({
            session_id: id,
            original_name: originalName,
            file_url: publicUrl,
            file_type: fileType || 'application/octet-stream',
            file_size: fileSize,
            extracted_text: extractedText
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        return newDoc;
      } catch (fileErr) {
        console.error(`Erro ao processar arquivo ${file.originalName}:`, fileErr);
        return null; // Return null on failure so Promise.all doesn't fail entirely
      }
    });

    const results = await Promise.all(processPromises);
    const createdDocuments = results.filter(doc => doc !== null);

    return NextResponse.json(createdDocuments);
  } catch (error: any) {
    console.error('Erro no upload de documentos:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
