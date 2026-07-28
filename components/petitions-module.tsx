// components/petitions-module.tsx 
"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { Loader2, FileText, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

const fetchPetitions = async () => {
  return apiClient.getPetitions();
};

function PetitionsStats({ petitions }: { petitions: any[] }) {
  const stats = [
    { label: "Total de Petições", value: petitions.length.toString(), icon: FileText, color: "text-brand", bg: "from-brand-light/50 to-brand-light/20", trend: "+8%" },
    { label: "Em Andamento", value: petitions.filter(p => p.status?.toLowerCase() === 'em andamento').length.toString(), icon: Clock, color: "text-brand-sage", bg: "from-brand-sage/30 to-brand-sage/10", trend: "+5%" },
    { label: "Concluídas", value: petitions.filter(p => p.status?.toLowerCase() === 'concluída').length.toString(), icon: CheckCircle, color: "text-brand", bg: "from-brand-beige/50 to-brand-beige/20", trend: "+12%" },
    { label: "Pendentes", value: petitions.filter(p => p.status?.toLowerCase() === 'pendente').length.toString(), icon: AlertCircle, color: "text-brand", bg: "from-brand-gray/30 to-brand-gray/10", trend: "+3%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;
        return (
          <Card key={index} className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-serif text-brand-black">{stat.value}</p>
                  <div className="flex items-center space-x-1 pt-1">
                    <TrendingUp className="w-4 h-4 text-brand-sage" />
                    <span className="text-sm text-brand-sage font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                  <StatIcon className="w-5 h-5 text-brand" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function PetitionsModule() {
  const { data: petitions, isLoading, isError, error } = useQuery({
    queryKey: ["petitions"],
    queryFn: fetchPetitions,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 bg-brand-black rounded-2xl">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-sage mx-auto" />
          <p className="text-brand-gray font-medium">Carregando petições...</p>
        </div>
      </div>
    );
  }

  if (isError) return <div>Erro ao carregar petições: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm">
        <h2 className="text-3xl font-serif text-brand-black tracking-tight">Gerenciamento de Petições</h2>
        <p className="text-brand-gray mt-2 font-medium">Organize e acompanhe todas as petições e fluxos de documentos do escritório.</p>
      </div>

      {petitions && petitions.length > 0 && <PetitionsStats petitions={petitions} />}

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-brand-black border-b border-brand-gray">
          <CardTitle className="text-2xl font-bold text-brand-black">Lista de Petições</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-black hover:bg-brand-darkolive">
                <TableHead className="text-brand-beige font-bold">Caso Associado</TableHead>
                <TableHead className="text-brand-beige font-bold">Autor</TableHead>
                <TableHead className="text-brand-beige font-bold">Status</TableHead>
                <TableHead className="text-brand-beige font-bold">Data de Criação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {petitions && petitions.length > 0 ? (
                petitions.map((petition) => (
                  <TableRow key={petition.id} className="group hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-transparent transition-all duration-200">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-brand-beige to-brand-beige/90 text-brand-black group-hover:scale-110 transition-transform">
                          <FileText className="h-4 w-4 text-brand-sage" />
                        </div>
                        <span className="font-medium group-hover:text-brand-sage transition-colors">{petition.cases?.title || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-brand-gray">{petition.employees?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={`${
                        petition.status?.toLowerCase() === 'concluída' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        petition.status?.toLowerCase() === 'em andamento' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        'bg-gradient-to-r from-yellow-500 to-orange-500'
                      } text-white border-0 shadow-lg`}>
                        {petition.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-brand-gray">{format(new Date(petition.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <FileText className="h-16 w-16 text-brand-gray mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-brand-gray mb-2">Nenhuma petição encontrada</h3>
                    <p className="text-brand-sage">Não há petições cadastradas no momento.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}