import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('admin');

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    let successCount = 0;
    const errors: any[] = [];
    
    const currentYear = new Date().getFullYear();

    // Iterate over each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      // Regex to extract day and month, e.g. "Publicações 15-07" -> day 15, month 07
      const dateMatch = sheetName.match(/(\d{1,2})[-/](\d{1,2})/);
      
      let pubDateStr = format(new Date(), 'yyyy-MM-dd'); // fallback to today
      if (dateMatch) {
        const day = (dateMatch[1] || '').padStart(2, '0');
        const month = (dateMatch[2] || '').padStart(2, '0');
        pubDateStr = `${currentYear}-${month}-${day}`;
      }

      // Convert sheet to a 2D array (array of arrays)
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Iterate over every row and every cell to extract process numbers
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || !Array.isArray(row)) continue;
        
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          const cellValue = row[colIndex];
          
          if (cellValue && typeof cellValue === 'string' && cellValue.trim() !== '') {
            const title = cellValue.trim();
            
            // Check for existing publication with same title and date
            const { data: existingPubs } = await supabase
              .from('publications')
              .select('id')
              .eq('title', title)
              .eq('publication_date', pubDateStr)
              .limit(1);

            if (existingPubs && existingPubs.length > 0) {
              // Skip duplicate
              continue;
            }
            
            // Insert into database
            const { error: insertError } = await supabase
              .from('publications')
              .insert({
                title: title,
                description: `Importado via planilha (${sheetName})`,
                publication_date: pubDateStr,
                status: 'Pendente',
                assigned_to: null, // Sem responsável
                assigned_by: user.id
              });

            if (insertError) {
              errors.push({ sheet: sheetName, row: rowIndex + 1, col: colIndex + 1, error: insertError.message });
            } else {
              successCount++;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, successCount, errorCount: errors.length, errors });
    
  } catch (error: any) {
    console.error("Erro na importação de publicações:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar o arquivo. Verifique o formato." },
      { status: 500 }
    );
  }
}
