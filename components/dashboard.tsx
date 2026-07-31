// components/dashboard.tsx
"use client"
import { useAuth } from '@/hooks/use-auth'
import { useState, useCallback, ReactNode, useEffect } from "react"
import { useQuery } from '@tanstack/react-query';

import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Users, FileText, DollarSign, Calendar, CheckSquare, BarChart2,
  Briefcase, LogOut, Settings, Scale, FileCode, Bell, TrendingUp,
  Activity, AlertCircle, Clock, Star, Menu, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, Sparkles, Zap, Shield, Award, Target, FileSearch
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { GmailInboxModule } from "./gmail-inbox-module"
// import { GoogleWorkspaceModule } from "./google-workspace-module" // REMOVIDO: Google Workspace Hub
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import EntitiesModule from "@/components/entities-module"
import { CasesModule } from "@/components/cases-module"
import { FinancialModule } from "@/components/financial-module"
import { PetitionsModule } from "@/components/petitions-module"
import { EmployeeManagement } from "@/components/employee-management"
import { BrandLogo } from "@/components/brand-logo"
import { CalendarModule } from "@/components/calendar-module"
import { TasksModule } from "@/components/tasks-module"
import { ReportsModule } from "@/components/reports-module"
import { NotificationsDropdown } from "./notifications-dropdown"
import { SystemSettingsModal } from './system-settings-modal'
import { UserSettingsModal } from './user-settings-modal'
import { TemplatesModule } from "./templates-module"
import CruzamentoPage from "@/app/dashboard/cruzamento/page"; // <-- CORREÇÃO: Importa o novo componente
import { Mail } from "lucide-react"; // Importar Mail para os ícones (Chrome não é mais necessário)

interface GlobalFilters {
  cases?: { status: string };
  petitions?: { status: string };
  financial?: { status: string };
}

interface ModernLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  onUserSettings: () => void;
  onSystemSettings: () => void;
}

const menuItems = [
    { value: "overview", label: "Dashboard", icon: BarChart2, description: "Visão geral do escritório", color: "from-brand to-brand-700" },
    { value: "entities", label: "Clientes", icon: Users, description: "Gerenciar clientes e partes", color: "from-brand-sage to-brand-sage/90" },
    { value: "cases", label: "Processos", icon: Briefcase, description: "Acompanhar processos jurídicos", color: "from-brand-gray to-brand-gray/90" },
    { value: "cruzamento", label: "Cruzamento de Listas", icon: FileSearch, description: "Comparar pagamentos e judicializados", color: "from-brand-sage/80 to-brand-sage" }, // <-- CORREÇÃO: Adicionada vírgula
    { value: "petitions", label: "Petições", icon: FileText, description: "Documentos e petições", color: "from-brand-beige to-brand-beige/90 text-brand-black" },
    { value: "templates", label: "Modelos", icon: FileCode, description: "Templates de documentos", color: "from-brand-light to-brand-light/90 text-brand-black" },
    { value: "financial", label: "Financeiro", icon: DollarSign, description: "Controle financeiro", color: "from-brand-sage to-brand-sage/90" },
    { value: "calendar", label: "Agenda", icon: Calendar, description: "Compromissos e prazos", color: "from-brand-gray/80 to-brand-gray" },
    { value: "tasks", label: "Tarefas", icon: CheckSquare, description: "Tarefas e lembretes", color: "from-brand to-brand-700" },
    // { value: "google-workspace", label: "Google Workspace", icon: Chrome, description: "Integração com serviços Google", color: "from-blue-500 to-red-500" }, // REMOVIDO: Google Workspace Hub
    { value: "gmail-inbox", label: "Gmail Inbox", icon: Mail, description: "Sua caixa de entrada do Gmail", color: "from-brand-beige to-brand-beige/90 text-brand-black" }, // Novo item de menu
    { value: "employees", label: "Equipe", icon: Users, description: "Gerenciar colaboradores", color: "from-brand-black to-brand-black/90" },
]

// Componente de estatísticas com animações aprimoradas

// Componente de estatísticas com animações aprimoradas
function QuickStats() {
  
  const getArrayData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.cases && Array.isArray(data.cases)) return data.cases;
    if (data.entities && Array.isArray(data.entities)) return data.entities;
    return [];
  };

  const { data: casesData } = useQuery({ queryKey: ['cases'], queryFn: () => apiClient.getCases() });
  const { data: entitiesData } = useQuery({ queryKey: ['entities'], queryFn: () => apiClient.getEntities() });
  const { data: tasksData } = useQuery({ queryKey: ['tasks'], queryFn: () => apiClient.getTasks() });
  
  // Para a receita mensal, vamos pegar os pagamentos recebidos no mês atual
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { data: paymentsData } = useQuery({ 
    queryKey: ['payments', currentYear, currentMonth], 
    queryFn: () => apiClient.getReceivedByMonth(currentYear, currentMonth) 
  });

  const activeCasesCount = getArrayData(casesData).filter((c: any) => c.status !== 'Extinto').length || 0;
  
  // Clientes criados neste mês vs mês passado (simplificado)
  const currentMonthStart = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const newClientsCount = entitiesData?.filter((e: any) => e.type === 'Cliente' && e.created_at && e.created_at >= currentMonthStart)?.length || (entitiesData?.filter((e: any) => e.type === 'Cliente')?.length || 0);
  
  const currentMonthRevenue = paymentsData?.reduce((acc: number, curr: any) => acc + Number(curr.amount_paid), 0) || 0;
  const { user } = useAuth();
  
  const pendingTasksCount = tasksData?.filter((t: any) => 
    (t.status === 'Pendente' || t.status === 'Em Andamento') && 
    t.assigned_to === user?.id
  ).length || 0;

  // Estado individual para cada valor animado
  const [processosAtivos, setProcessosAtivos] = useState(0);
  const [novosClientes, setNovosClientes] = useState(0);
  const [faturamento, setFaturamento] = useState(0);
  const [tarefasPendentes, setTarefasPendentes] = useState(0);

  const stats = [
    { 
      label: "Processos Ativos", 
      value: activeCasesCount, 
      animatedValue: processosAtivos,
      setAnimatedValue: setProcessosAtivos,
      prefix: "", 
      suffix: "", 
      icon: Briefcase, 
      trend: 12, 
      color: "from-brand to-brand-700", 
      bgColor: "from-brand to-brand-700" 
    },
    { 
      label: "Novos Clientes", 
      value: newClientsCount, 
      animatedValue: novosClientes,
      setAnimatedValue: setNovosClientes,
      prefix: "", 
      suffix: "", 
      icon: Users, 
      trend: 25, 
      color: "from-brand-sage to-brand-sage/90", 
      bgColor: "from-brand-sage to-brand-sage/90" 
    },
    { 
      label: "Faturamento Mensal", 
      value: currentMonthRevenue, 
      animatedValue: faturamento,
      setAnimatedValue: setFaturamento,
      prefix: "R$ ", 
      suffix: "", 
      icon: DollarSign, 
      trend: 8, 
      color: "from-brand-gray to-brand-gray/90", 
      bgColor: "from-brand-gray to-brand-gray/90" 
    },
    { 
      label: "Tarefas Pendentes", 
      value: pendingTasksCount, 
      animatedValue: tarefasPendentes,
      setAnimatedValue: setTarefasPendentes,
      prefix: "", 
      suffix: "", 
      icon: AlertCircle, 
      trend: -5, 
      color: "from-brand-beige to-brand-beige/90 text-brand-black", 
      bgColor: "from-brand-beige to-brand-beige/90 text-brand-black" 
    },
  ];

  // Animação de contagem dos números
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];
    
    stats.forEach((stat) => {
      if (stat.value === 0) {
        stat.setAnimatedValue(0);
        return;
      }
      const duration = 1500;
      const steps = 30;
      const increment = stat.value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= stat.value) {
          current = stat.value;
          clearInterval(timer);
        }
        stat.setAnimatedValue(Math.floor(current));
      }, duration / steps);
      
      timers.push(timer);
    });
    
    // Cleanup function
    return () => {
      timers.forEach(timer => clearInterval(timer));
    };
  }, [activeCasesCount, newClientsCount, currentMonthRevenue, pendingTasksCount]); // Re-run animation if data changes

  const formatValue = (value: number, prefix: string, suffix: string) => {
    if (prefix === "R$ ") {
      return `${prefix}${(value / 1000).toFixed(1)}k${suffix}`;
    }
    return `${prefix}${value}${suffix}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const currentValue = stat.animatedValue;
        const percentage = (currentValue / stat.value) * 100;
        
        return (
          <Card 
            key={index} 
            className="border border-brand-gray/20 bg-white rounded-sm shadow-sm"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-serif font-bold text-brand-black tabular-nums">
                    {formatValue(currentValue, stat.prefix, stat.suffix)}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1 text-xs font-semibold text-brand-sage">
                      {stat.trend > 0 ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                      {Math.abs(stat.trend)}%
                    </div>
                    <span className="text-xs text-brand-gray/80">vs mês anterior</span>
                  </div>
                </div>
                <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                  <stat.icon className="w-5 h-5 text-brand" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}



// Badge component helper
function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={className}>{children}</span>;
}

function ModernLayout({ children, activeTab, setActiveTab, handleLogout, onUserSettings, onSystemSettings }: ModernLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const activeItem = menuItems.find(item => item.value === activeTab);
    const { user } = useAuth() // adicione essa linha

    return (
        <div className="min-h-screen bg-brand-light/50">


            {/* Sidebar Clássica e Formal */}
            <aside className={`fixed flex flex-col left-0 top-0 h-screen bg-white text-brand shadow-sm z-50 transition-all duration-300 ease-in-out ${
                isCollapsed ? 'w-20' : 'w-72'
            } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 border-r border-brand-gray/30`}>
                
                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex absolute -right-4 top-7 bg-white text-brand hover:bg-brand-light rounded-full h-8 w-8 border border-brand-gray/30 z-10 transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                {/* Logo Header */}
                <div className="relative flex-shrink-0 px-4 py-2 border-b border-brand-gray/20 bg-brand-light/20">
                    <div className="flex items-center justify-center">
                        {!isCollapsed ? (
                            <div className="flex flex-col items-center justify-center">
                                <BrandLogo className="w-28 h-28 text-brand" />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <BrandLogo className="w-14 h-14 text-brand" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="relative flex-1 py-6 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-gray/20 hover:scrollbar-thumb-brand-gray/40">
                    <div className="space-y-1">
                        {(() => {
                            const visibleItems = user?.role === "admin" 
                                ? menuItems 
                                : menuItems.filter(item => 
                                    item.value === "overview" || (user?.permissions && user.permissions.includes(item.value))
                                );
                            return visibleItems.map((item, index) => (
                            <button
                                key={item.value}
                                onClick={() => {
                                    setActiveTab(item.value);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full group relative overflow-hidden transition-colors duration-200 flex items-center ${
                                    activeTab === item.value
                                        ? "bg-brand-light/50 border-l-4 border-brand"
                                        : "hover:bg-brand-light/30 border-l-4 border-transparent"
                                } ${isCollapsed ? 'px-3 py-4 justify-center' : 'px-6 py-3'}`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} w-full`}>
                                    <div className={`p-2 rounded-md transition-colors duration-200 ${
                                        activeTab === item.value 
                                            ? `bg-brand text-brand-beige shadow-sm` 
                                            : "text-brand-sage group-hover:text-brand"
                                    }`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    {!isCollapsed && (
                                        <div className="text-left flex-1">
                                            <div className={`font-semibold text-sm transition-colors duration-200 ${
                                                activeTab === item.value ? 'text-brand' : 'text-brand/80 group-hover:text-brand'
                                            }`}>
                                                {item.label}
                                            </div>
                                            <div className={`text-xs mt-0.5 transition-colors duration-200 ${
                                                activeTab === item.value 
                                                    ? "text-brand-sage" 
                                                    : "text-brand-gray group-hover:text-brand-sage"
                                            }`}>
                                                {item.description}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </button>
                            ));
                        })()}
                    </div>
                </nav>
            </aside>

            {/* Mobile Menu Button Premium */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Overlay with Blur */}
            {isMobileMenuOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Premium */}
            <main className={`min-h-screen flex flex-col transition-all duration-500 ${
                isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
            } ml-0`}>
                {/* Header Clássico */}
                <header className="sticky top-0 z-30 bg-white border-b border-brand-gray/30 shadow-sm">
                    <div className={`relative px-8 py-6 transition-all duration-500 ${isCollapsed ? 'lg:pl-8' : 'lg:pl-8'} pl-16 lg:pl-8`}>
                        <div className="flex justify-between items-center">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="font-serif font-bold text-3xl text-brand">
                                        {activeItem?.label || 'Dashboard'}
                                    </h1>
                                </div>
                                <p className="text-brand-sage flex items-center gap-2 font-medium">
                                    {activeItem?.description || 'Sistema de Gestão Jurídica'}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {/* Premium Notifications */}
                                <NotificationsDropdown onNavigate={setActiveTab} />

                                {/* Premium Quick Actions */}
                                

                                {/* Premium User Menu */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center space-x-3 p-2 rounded-md hover:bg-brand-light/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand/20">
                                            <div className="relative">
                                                <Avatar className="ring-1 ring-brand-gray w-10 h-10">
                                                    <AvatarFallback className="bg-brand-light text-brand font-bold">
                                                   {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                            </div>
                                            <div className="text-left hidden md:block">
                                                <div className="font-semibold text-sm text-brand">{user?.name || user?.email}</div>
                                                <div className="text-xs text-brand-sage">Online agora</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-brand-gray hidden md:block" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-72 p-2 backdrop-blur-xl bg-white/95">
                                        <div className="px-3 py-3 border-b border-brand-light">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-12 h-12">
                                                   <AvatarFallback className="bg-brand-light text-brand font-bold">
                                                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold text-brand-black">{user?.name || user?.email}</div>
                                                    <div className="text-sm text-brand-gray">{user?.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenuItem onSelect={onUserSettings} className="mt-2 rounded-lg">
                                            <Users className="h-4 w-4 mr-3" />
                                            Minha Conta
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg">
                                            <LogOut className="h-4 w-4 mr-3" />
                                            Sair do Sistema
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Premium Content Area */}
                <div className="flex-1 p-8 min-h-screen relative">
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fadeIn">
                            <QuickStats />
                            <div className="w-full">
                                <ReportsModule onNavigate={(tab: string, filters: GlobalFilters = {}) => {
                                    setActiveTab(tab);
                                }} />
                            </div>
                        </div>
                    )}
                    {activeTab !== 'overview' && (
                        user?.role !== "admin" && !(user?.permissions || []).includes(activeTab) ? (
                            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl shadow-xl border border-brand-gray/50 p-8 backdrop-blur-sm animate-fadeIn">
                                <Shield className="h-16 w-16 text-red-500 mb-4" />
                                <h2 className="text-2xl font-bold text-brand">Acesso Negado</h2>
                                <p className="text-brand-sage mt-2">Você não tem permissão para visualizar esta página.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-xl border border-brand-gray/50 p-8 backdrop-blur-sm animate-fadeIn">
                                {children}
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    )
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({});
  const [isSystemSettingsOpen, setSystemSettingsOpen] = useState(false);
  const [isUserSettingsOpen, setUserSettingsOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await apiClient.logout();
  }, []);

  const handleNavigate = (tab: string, filters: GlobalFilters = {}) => {
    setActiveTab(tab);
    setGlobalFilters(filters);
  };

  const TABS_CONTENT: { [key: string]: React.ReactNode } = {
    overview: null, // Handled directly in ModernLayout
    entities: <EntitiesModule />,
    cases: <CasesModule initialFilters={globalFilters.cases} />,
    cruzamento: <CruzamentoPage />, // <-- CORREÇÃO: Adicionada a nova página ao conteúdo das abas
    petitions: <PetitionsModule />,
    templates: <TemplatesModule />,
    financial: <FinancialModule />,
    calendar: <CalendarModule />,
    tasks: <TasksModule />,
    // "google-workspace": <GoogleWorkspaceModule />, // REMOVIDO: Google Workspace Hub
    "gmail-inbox": <GmailInboxModule />, // Adicionar o novo módulo
    employees: <EmployeeManagement />,
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
      
      <ModernLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        onUserSettings={() => setUserSettingsOpen(true)}
        onSystemSettings={() => setSystemSettingsOpen(true)}
      >
        {TABS_CONTENT[activeTab]}
      </ModernLayout>
      <SystemSettingsModal isOpen={isSystemSettingsOpen} onClose={() => setSystemSettingsOpen(false)} />
      <UserSettingsModal isOpen={isUserSettingsOpen} onClose={() => setUserSettingsOpen(false)} />
    </>
  );
}