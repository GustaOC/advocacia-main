// app/api/entities/import/route.ts - VERSÃO ULTRA ROBUSTA E CORRIGIDA
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import * as entityService from "@/lib/services/entityService";
import { z } from "zod";
import * as XLSX from "xlsx";

// Schema mais flexível - todos os campos são opcionais exceto Nome Completo
const ImportEntitySchema = z.object({
  "Nome Completo": z.coerce.string().min(2, "O nome é obrigatório."),
  "Cpf": z.string().optional().nullable().or(z.literal("")),
  "Email": z.union([
    z.string().email("Email inválido."),
    z.literal(""),
    z.null()
  ]).optional(),
  "Endereço": z.string().optional().nullable().or(z.literal("")),
  "Nº": z.union([z.string(), z.number()]).optional().nullable(),
  "Bairro": z.string().optional().nullable().or(z.literal("")),
  "Cidade": z.string().optional().nullable().or(z.literal("")),
  "Estado": z.string().optional().nullable().or(z.literal("")),
  "Cep": z.string().optional().nullable().or(z.literal("")),
  "Celular 1": z.union([z.string(), z.number()]).optional().nullable(),
  "Celular 2": z.union([z.string(), z.number()]).optional().nullable(),
}).passthrough(); // Permite campos extras não definidos

// Função para encontrar a planilha correta baseada nos cabeçalhos esperados
function findCorrectSheet(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; sheetName: string } | null {
  const nameVariations = ["nome completo", "nome", "nome_completo", "nomecompleto", "loja", "executado", "cliente", "empresa", "razão social", "razao social", "requerente", "requerido"];
  
  console.log("[Import] Procurando planilha compatível...");
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || typeof sheet !== 'object') continue;
    
    try {
      const data = XLSX.utils.sheet_to_json(sheet);
      if (data.length === 0) continue;
      
      const firstRow = data[0] as Record<string, any>;
      const fields = Object.keys(firstRow).map(f => f.toLowerCase().trim());
      
      console.log(`[Import] Analisando planilha "${sheetName}", campos:`, fields);
      
      // Verificar se tem alguma variação de Nome
      const hasRequiredFields = fields.some(f => nameVariations.includes(f));
      
      if (hasRequiredFields) {
        console.log(`[Import] ✅ Planilha encontrada: "${sheetName}"`);
        return { sheet, sheetName };
      }
    } catch (error) {
      console.log(`[Import] Erro ao processar planilha "${sheetName}":`, error);
      continue;
    }
  }
  
  return null;
}

// Função para remover espaços, acentos e caracteres especiais das chaves
function cleanKey(k: string) {
  return k.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, ''); // Mantém apenas letras e números
}

// Função para normalizar os dados da linha
function normalizeRowData(row: any): any {
  const normalized: any = {};
  
  // Mapear campos com variações de nomes (já em versão limpa)
  const fieldMappings: Record<string, string[]> = {
    "Nome Completo": ["nomecompleto", "nome", "loja", "executado", "cliente", "empresa", "razaosocial", "requerente", "requerido"],
    "Cpf": ["cpf", "documento", "cnpj"],
    "Email": ["email"],
    "Endereço": ["endereco", "enderecocompleto", "logradouro", "rua", "avenida"],
    "Nº": ["n", "numero"],
    "Bairro": ["bairro", "distrito", "setor", "vila"],
    "Cidade": ["cidade", "municipio"],
    "Estado": ["estado", "uf", "provincia"],
    "Cep": ["cep"],
    "Celular 1": ["celular1", "celular", "telefone1", "telefone", "tel1", "fone1"],
    "Celular 2": ["celular2", "telefone2", "tel2", "fone2"],
  };
  
  const originalEntries = Object.entries(row);
  
  // Mapear campos conhecidos
  for (const [targetField, possibleNames] of Object.entries(fieldMappings)) {
    let found = false;
    for (const [key, value] of originalEntries) {
      const cleanedOriginalKey = cleanKey(key);
      if (possibleNames.includes(cleanedOriginalKey)) {
        if (value !== undefined && value !== null && value !== "") {
          normalized[targetField] = value;
        }
        found = true;
        break;
      }
    }

    if (!found && !(targetField in normalized)) {
      normalized[targetField] = "";
    }
  }
  
  // Adicionar campos extras não mapeados
  for (const [key, value] of originalEntries) {
    const isMapped = Object.values(fieldMappings).some(names => names.includes(key.toLowerCase().trim()));
    if (!isMapped && value !== undefined && value !== null && value !== "") {
      normalized[key] = value;
    }
  }

  // Converter números para strings onde necessário
  if (typeof normalized["Nº"] === "number") {
    normalized["Nº"] = normalized["Nº"].toString();
  }
  if (typeof normalized["Celular 1"] === "number") {
    normalized["Celular 1"] = normalized["Celular 1"].toString();
  }
  if (typeof normalized["Celular 2"] === "number") {
    normalized["Celular 2"] = normalized["Celular 2"].toString();
  }
  
  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("entities_create");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = (formData.get("type") as string) || 'Cliente'; 

if (!file) {
  return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
}

// ---- Validações de upload ----
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv"];

if (file) {
  const fAny: any = file as any;
  const size = Number(fAny.size ?? 0);
  const name = (fAny.name || "").toString().toLowerCase();
  
  const isValidExt = ALLOWED_EXTENSIONS.some(ext => name.endsWith(`.${ext}`));

  if (!isValidExt) {
    return NextResponse.json({ error: "Tipo de arquivo inválido. Envie um .xlsx, .xls ou .csv" }, { status: 400 });
  }
  if (size <= 0 || size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande. Limite: 10MB." }, { status: 400 });
  }
}
// -------------------------------

    console.log(`[Import] Iniciando importação de ${entityType}s...`);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    // Procurar pela planilha correta
    const sheetInfo = findCorrectSheet(workbook);
    
    if (!sheetInfo) {
      // Se não encontrou, tentar com a primeira planilha como fallback
      const firstSheetName = workbook.SheetNames[0];
      
      // ✅ CORREÇÃO APLICADA AQUI: Adicionada verificação para garantir que firstSheetName não é undefined
      if (firstSheetName) { 
        const firstSheet = workbook.Sheets[firstSheetName];
        
        if (firstSheet) {
          console.log(`[Import] Usando primeira planilha como fallback: "${firstSheetName}"`);
          const data = XLSX.utils.sheet_to_json(firstSheet);
          
          if (data.length > 0) {
            const fields = Object.keys(data[0] as Record<string, any>);
            
            return NextResponse.json({ 
              error: "Formato de planilha não reconhecido.",
              details: `Campos encontrados: ${fields.join(", ")}. Campos esperados: Nome Completo, Cpf, Endereço, Nº, Bairro, Cidade, Cep, Celular 1, Celular 2, Email.`,
              suggestion: "Verifique se os nomes das colunas estão corretos (com acentos e espaços)."
            }, { status: 400 });
          }
        }
      }
      
      return NextResponse.json({ 
        error: "Nenhuma planilha válida encontrada no arquivo."
      }, { status: 400 });
    }
    
    const { sheet, sheetName } = sheetInfo;
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`[Import] Processando ${data.length} linhas da planilha "${sheetName}"`);

    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; error: string }[] = [];
    const processedCPFs = new Set<string>();
    
    // Cache de CEPs para evitar bater na API repetidas vezes com o mesmo CEP
    const cepCache = new Map<string, any>();

    for (const [index, row] of data.entries()) {
      try {
        // Normalizar os dados da linha
        const normalizedRow = normalizeRowData(row);
        
        // ---- 1. Lógica de extração de Estado pela Cidade (ex: "Campo Grande - MS") ----
        if (normalizedRow["Cidade"] && !normalizedRow["Estado"]) {
          const partes = normalizedRow["Cidade"].split('-');
          if (partes.length > 1) {
            normalizedRow["Estado"] = partes.pop().trim().toUpperCase();
            normalizedRow["Cidade"] = partes.join('-').trim();
          }
        }

        // ---- 2. Lógica de ViaCEP para auto-completar endereço ----
        if (normalizedRow["Cep"]) {
          const cepLimpo = String(normalizedRow["Cep"]).replace(/\D/g, '');
          if (cepLimpo.length === 8) {
            if (!cepCache.has(cepLimpo)) {
              try {
                const viacepRes = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                if (viacepRes.ok) {
                  const viacepData = await viacepRes.json();
                  if (!viacepData.erro) {
                    cepCache.set(cepLimpo, viacepData);
                  } else {
                    cepCache.set(cepLimpo, null);
                  }
                }
              } catch (e) {
                console.log(`[Import] Erro ao buscar ViaCEP para ${cepLimpo}`);
                cepCache.set(cepLimpo, null);
              }
            }
            
            const enderecoViaCep = cepCache.get(cepLimpo);
            if (enderecoViaCep) {
              if (!normalizedRow["Bairro"]) normalizedRow["Bairro"] = enderecoViaCep.bairro;
              if (!normalizedRow["Estado"]) normalizedRow["Estado"] = enderecoViaCep.uf;
              if (!normalizedRow["Cidade"]) normalizedRow["Cidade"] = enderecoViaCep.localidade;
              if (!normalizedRow["Endereço"]) normalizedRow["Endereço"] = enderecoViaCep.logradouro;
            }
          }
        }
        
        // Log para debug
        if (index === 0) {
          console.log("[Import] Primeira linha normalizada e processada com CEP:", normalizedRow);
        }
        
        // Validar com o schema flexível
        const validatedRow = ImportEntitySchema.parse(normalizedRow);
        
        // Verificar duplicação de CPF na mesma importação
        if (validatedRow.Cpf && processedCPFs.has(validatedRow.Cpf)) {
          throw new Error(`CPF ${validatedRow.Cpf} duplicado na planilha`);
        }
        if (validatedRow.Cpf) {
          processedCPFs.add(validatedRow.Cpf);
        }

        const entityData = {
          name: validatedRow["Nome Completo"],
          document: validatedRow.Cpf || null,
          email: validatedRow.Email || null,
          address: validatedRow.Endereço || null,
          address_number: validatedRow["Nº"] ? String(validatedRow["Nº"]) : null,
          neighborhood: validatedRow.Bairro || null,
          city: validatedRow.Cidade || null,
          state: validatedRow.Estado || null,
          zip_code: validatedRow.Cep || null,
          cellphone1: validatedRow["Celular 1"] ? String(validatedRow["Celular 1"]) : null,
          cellphone2: validatedRow["Celular 2"] ? String(validatedRow["Celular 2"]) : null,
          type: entityType,
        };

        await entityService.createEntity(entityData, user);
        successCount++;
        console.log(`[Import] ✅ Linha ${index + 2}: ${entityData.name} importado com sucesso`);
        
      } catch (error: any) {
        errorCount++;
        let errorMessage = error.message;
        
        if (error instanceof z.ZodError) {
          errorMessage = error.errors.map(e => {
            return `${e.message}`;
          }).join(', ');
        }
        
        // Melhorar mensagens de erro
        if (errorMessage.includes("Já existe uma entidade")) {
          const rowData = normalizeRowData(row);
          errorMessage = `Já existe uma entidade com CPF "${rowData.Cpf || 'não informado'}" ou email "${rowData.Email || 'não informado'}"`;
        } else if (errorMessage.includes('column "type" of relation "notifications" does not exist')) {
          errorMessage = "A tabela 'notifications' no banco de dados está desatualizada (falta a coluna 'type'). Rode o comando SQL sugerido no Supabase.";
        }
        
        errors.push({ 
          row: index + 2, 
          error: errorMessage.substring(0, 200) // Limitar tamanho da mensagem
        });
        
        console.log(`[Import] ❌ Linha ${index + 2}: ${errorMessage}`);
      }
    }

    const response = {
      message: `Importação de ${entityType}s concluída!`,
      planilhaUsada: sheetName,
      successCount,
      errorCount,
      errors: errors.slice(0, 20), // Mostrar apenas os primeiros 20 erros
      totalErrors: errors.length,
      summary: {
        total: data.length,
        sucesso: successCount,
        falha: errorCount,
        taxa_sucesso: data.length > 0 ? `${Math.round((successCount / data.length) * 100)}%` : '0%'
      }
    };
    
    console.log(`[Import] Resultado final: ${successCount} sucessos, ${errorCount} erros`);

    // Se NENHUMA linha foi salva no banco (mas houveram erros), retorna erro HTTP 400
    // Isso força o frontend a exibir um alerta vermelho avisando o usuário o verdadeiro motivo
    if (successCount === 0 && errorCount > 0) {
      return NextResponse.json({ 
        error: "Nenhum cliente foi importado.",
        details: errors[0]?.error // Mostra o motivo do primeiro erro (ex: CPF duplicado)
      }, { status: 400 });
    }
    if (data.length === 0) {
      return NextResponse.json({ error: "A planilha enviada está vazia ou sem dados." }, { status: 400 });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error("[API Import] Erro geral:", error);
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json({ 
      error: "Erro ao processar o arquivo. Verifique se o formato está correto.",
      details: error.message 
    }, { status: 500 });
  }
}