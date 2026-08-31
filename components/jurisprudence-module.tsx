"use client";

import React, { useState } from 'react';
import { Search, Copy, CheckCircle2, AlertCircle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function JurisprudenceModule() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/jurisprudence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar jurisprudência');
      }

      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (ementa: string, id: number) => {
    navigator.clipboard.writeText(ementa);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-black">Pesquisa Inteligente de Jurisprudência</h2>
            <p className="text-sm text-brand-gray">
              Descreva o contexto do caso ou digite palavras-chave (ex: "quero jurisprudência sobre administrativo").
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Cliente comprou um pacote de viagem, a companhia aérea faliu e ele quer restituição em dobro..."
              className="w-full min-h-[100px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none resize-y text-brand-black"
            />
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Buscando ementas...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Buscar Jurisprudência
                </span>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-lg font-semibold text-brand-black flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Resultados Encontrados ({results.length})
          </h3>
          
          <div className="grid gap-4">
            {results.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md">
                      {item.tribunal}
                    </span>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                      {item.data}
                    </span>
                    {item.resultado && (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md">
                        {item.resultado}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleCopy(item.ementa, idx)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                    title="Copiar ementa"
                  >
                    {copiedId === idx ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {item.ementa}
                </p>
                
                {item.link && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline font-medium">
                      Ver na íntegra ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
