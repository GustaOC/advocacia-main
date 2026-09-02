"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError } from "@/lib/chunk-load-error";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erro no dashboard:", error);
  }, [error]);

  const outdatedVersion = isChunkLoadError(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-light/20 p-6">
      <div className="w-full max-w-md rounded-lg border border-brand-gray/20 bg-white p-8 text-center shadow-lg">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-600" />
        <h1 className="text-2xl font-serif text-brand-black">
          {outdatedVersion ? "O sistema foi atualizado" : "Não foi possível abrir o painel"}
        </h1>
        <p className="mt-3 text-sm text-brand-gray">
          {outdatedVersion
            ? "Recarregue para usar a versão mais recente do sistema."
            : "Tente carregar novamente. Se o problema continuar, atualize a página."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>Tentar novamente</Button>
          <Button onClick={() => window.location.reload()} className="bg-brand text-white hover:bg-brand/90">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar página
          </Button>
        </div>
      </div>
    </main>
  );
}
