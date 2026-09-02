"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DOCUMENT_MODELS = [
  {
    title: "Procuração",
    category: "Documentos contratuais",
    description: "Modelo de procuração da Cássio Miguel Sociedade Individual de Advocacia.",
    url: "/modelos-peticao/modelo-procuracao-cassio-miguel.docx",
    fileName: "Modelo de Procuração - Cássio Miguel.docx",
  },
  {
    title: "Contrato de Prestação de Serviços",
    category: "Documentos contratuais",
    description: "Modelo de contrato de prestação de serviços advocatícios e honorários.",
    url: "/modelos-peticao/modelo-contrato-prestacao-servicos-cassio-miguel.docx",
    fileName: "Modelo de Contrato de Prestação de Serviços - Cássio Miguel.docx",
  },
  {
    title: "Declaração de Hipossuficiência",
    category: "Declarações",
    description: "Modelo de declaração para pedido dos benefícios da justiça gratuita.",
    url: "/modelos-peticao/modelo-declaracao-hipossuficiencia.docx",
    fileName: "Modelo de Declaração de Hipossuficiência.docx",
  },
] as const;

export function TemplatesModule() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModels = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("pt-BR");
    if (!query) return DOCUMENT_MODELS;

    return DOCUMENT_MODELS.filter((model) =>
      `${model.title} ${model.category} ${model.description}`
        .toLocaleLowerCase("pt-BR")
        .includes(query)
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
        <h2 className="mb-2 text-3xl font-bold">Modelos de Documentos</h2>
        <p className="text-lg text-slate-300">Baixe os modelos oficiais do escritório em formato Word.</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar modelo..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filteredModels.length === 0 ? (
        <Card className="border border-brand-gray/20 bg-white">
          <CardContent className="p-12 text-center text-brand-gray">Nenhum modelo encontrado.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => (
            <Card key={model.url} className="border border-brand-gray/20 bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-light/40 text-brand">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-sage">{model.category}</p>
                <h3 className="text-xl font-serif text-brand-black">{model.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-gray">{model.description}</p>
                <Button asChild className="mt-6 w-full bg-brand text-white hover:bg-brand/90">
                  <a href={model.url} download={model.fileName}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar modelo Word
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
