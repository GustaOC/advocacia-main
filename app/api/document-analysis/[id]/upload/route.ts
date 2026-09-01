import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = params;
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const createdDocuments = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const randomId = Math.random().toString(36).substring(2);
        const fileName = `${id}/${randomId}-${Date.now()}.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from('analysis-documents')
          .upload(fileName, buffer, {
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-documents')
          .getPublicUrl(fileName);

        let extractedText = '';

        if (fileExt === 'pdf') {
          try {
            const pdfModule = await import('pdf-parse');
            const pdfParse = (pdfModule as any).default || pdfModule;
            const data = await pdfParse(buffer);
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
            original_name: file.name,
            file_url: publicUrl,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            extracted_text: extractedText
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        createdDocuments.push(newDoc);
      } catch (fileErr) {
        console.error(`Erro ao processar arquivo ${file.name}:`, fileErr);
      }
    }

    return NextResponse.json(createdDocuments);
  } catch (error: any) {
    console.error('Erro no upload de documentos:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
