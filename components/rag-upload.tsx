"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Loader2 } from "lucide-react";

export function RagUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar o arquivo.");
      }

      toast({
        title: "Upload Concluído",
        description: data.message,
      });
      setFile(null); // Reseta o input
    } catch (error: any) {
      toast({
        title: "Erro no Upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Alimentar Base de Conhecimento (RAG)
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Faça upload de PDFs, arquivos Word (DOCX) ou textos (TXT) com jurisprudência, modelos de petição e documentos internos para ensinar a IA.
        </p>
      </div>

      <div className="flex items-center gap-4 border-2 border-dashed border-gray-200 rounded-xl p-8 hover:bg-gray-50 transition-colors justify-center">
        <label className="cursor-pointer flex flex-col items-center gap-2">
          <FileText className="w-8 h-8 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {file ? file.name : "Clique para selecionar um PDF, DOCX ou TXT"}
          </span>
          <input 
            type="file" 
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleUpload} 
          disabled={!file || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {loading ? "Processando e Analisando..." : "Enviar e Processar"}
        </Button>
      </div>
    </div>
  );
}
