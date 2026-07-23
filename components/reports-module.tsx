// components/reports-module.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Users, DollarSign, Clock, AlertTriangle, Briefcase, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Tipos para os dados e props
interface ChartData { name: string; value: number; }
interface KpiCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  colorClass: string;
}
interface ReportsModuleProps {
  onNavigate: (tab: string, filters?: any) => void;
}

// Componente de Card de KPI reutilizável e clicável
const KpiCard: React.FC<KpiCardProps> = ({ title, value, description, icon: Icon, onClick, colorClass }) => (
  <Card 
    onClick={onClick}
    className="bg-white/80 backdrop-blur border border-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
  >
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
        <Icon className="h-4 w-4 mr-2" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </CardContent>
  </Card>
);

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function ReportsModule({ onNavigate }: ReportsModuleProps) {
  const [period, setPeriod] = useState<'month' | 'week' | 'year'>('month');

  // Buscando os dados reais da API
  const { data: casesData, isLoading: loadingCases } = useQuery({ queryKey: ['cases'], queryFn: () => apiClient.getCases() });
  const { data: entitiesData, isLoading: loadingEntities } = useQuery({ queryKey: ['entities'], queryFn: () => apiClient.getEntities() });
  const { data: tasksData, isLoading: loadingTasks } = useQuery({ queryKey: ['tasks'], queryFn: () => apiClient.getTasks() });
  const { data: agreementsData, isLoading: loadingAgreements } = useQuery({ queryKey: ['agreements'], queryFn: () => apiClient.getFinancialAgreementsPaginated(1, 1000) });

  // Cálculos baseados nos dados reais
  const activeClientsCount = entitiesData?.filter(e => e.type === 'Cliente').length || 0;
  
  const inProgressCases = casesData?.cases?.filter(c => c.status === 'Em andamento').length || 0;
  
  // Receita baseada nos acordos financeiros
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const revenueAmount = useMemo(() => {
    if (!agreementsData?.data) return 0;
    return agreementsData.data.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
  }, [agreementsData]);

  const urgentDeadlines = tasksData?.filter(t => t.priority === 'Alta' && t.status !== 'Concluída').length || 0;

  // Calculando dados dos Gráficos dinamicamente (Baseado no ano atual)
  const casesChartData = useMemo(() => {
    const data = MONTHS.map(name => ({ name, value: 0 }));
    casesData?.cases?.forEach(c => {
      if (c.created_at) {
        const date = new Date(c.created_at);
        if (date.getFullYear() === currentYear) {
          data[date.getMonth()].value += 1;
        }
      }
    });
    return data;
  }, [casesData, currentYear]);

  const financialChartData = useMemo(() => {
    const data = MONTHS.map(name => ({ name, value: 0 }));
    agreementsData?.data?.forEach(a => {
      if (a.created_at) {
        const date = new Date(a.created_at);
        if (date.getFullYear() === currentYear) {
          data[date.getMonth()].value += Number(a.total_amount || 0);
        }
      }
    });
    return data;
  }, [agreementsData, currentYear]);

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `R$ ${(val/1000).toFixed(1)}k`;
    return `R$ ${val}`;
  };

  const kpiData = {
    clients: { value: activeClientsCount.toString(), description: 'Total de clientes cadastrados' },
    activeCases: { value: inProgressCases.toString(), description: 'Processos em andamento' },
    revenue: { value: formatCurrency(revenueAmount), description: 'Receita recebida total' },
    upcomingDeadlines: { value: urgentDeadlines.toString(), description: 'Tarefas de alta prioridade pendentes' },
  };

  return (
    <div className="space-y-8">
      {/* Filtros de Período */}
      <div className="flex justify-end space-x-2">
        <Button variant={period === 'week' ? 'default' : 'outline'} onClick={() => setPeriod('week')} className={period === 'week' ? 'bg-slate-800 text-white': ''}>Esta Semana</Button>
        <Button variant={period === 'month' ? 'default' : 'outline'} onClick={() => setPeriod('month')} className={period === 'month' ? 'bg-slate-800 text-white' : ''}>Este Mês</Button>
        <Button variant={period === 'year' ? 'default' : 'outline'} onClick={() => setPeriod('year')} className={period === 'year' ? 'bg-slate-800 text-white': ''}>Este Ano</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Clientes Ativos"
          value={loadingEntities ? '...' : kpiData.clients.value}
          description={kpiData.clients.description}
          icon={Users}
          colorClass="text-slate-900"
          onClick={() => onNavigate('entities')}
        />
        <KpiCard
          title="Processos em Andamento"
          value={loadingCases ? '...' : kpiData.activeCases.value}
          description={kpiData.activeCases.description}
          icon={Briefcase}
          colorClass="text-slate-900"
          onClick={() => onNavigate('cases', { cases: { status: 'Em andamento' } })}
        />
        <KpiCard
          title="Receita Recebida"
          value={loadingAgreements ? '...' : kpiData.revenue.value}
          description={kpiData.revenue.description}
          icon={DollarSign}
          colorClass="text-green-600"
          onClick={() => onNavigate('financial')}
        />
        <KpiCard
          title="Tarefas Urgentes"
          value={loadingTasks ? '...' : kpiData.upcomingDeadlines.value}
          description={kpiData.upcomingDeadlines.description}
          icon={AlertTriangle}
          colorClass="text-red-600"
          onClick={() => onNavigate('tasks')} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> Novos Processos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={casesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Novos Processos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/> Previsão de Receita por Mês (Acordos)</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financialChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#16a34a" name="Receita" />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
