"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiClient, Publication } from '@/lib/api-client';
import { Calendar, CheckCircle, Clock, Edit, Eye, FileText, Plus, Trash2, Users, Megaphone, Search, Folder, ChevronRight, FolderOpen, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PublicationsModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Navigation state
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(new Date().getFullYear().toString());

  // Modal
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pubDate, setPubDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | 'none'>('none');

  const { data: publications = [], isLoading } = useQuery({
    queryKey: ['publications'],
    queryFn: () => apiClient.getPublications()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.getEmployees()
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Publication>) => apiClient.createPublication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast({ title: 'Sucesso', description: 'Publicação criada.' });
      closeModal();
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message || 'Falha ao criar publicação', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Publication> }) => apiClient.updatePublication(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publications"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({title: "Sucesso!", description: "Publicação atualizada com sucesso!"});
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message || 'Falha ao atualizar publicação', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePublication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast({ title: 'Sucesso', description: 'Publicação removida.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message || 'Falha ao remover publicação', variant: 'destructive' });
    }
  });

  const openNewModal = () => {
    setEditingPub(null);
    setTitle('');
    setDescription('');
    // Auto-fill date if a day folder is open, otherwise default to today + 5 days
    setPubDate(selectedDate ? selectedDate : format(addDays(new Date(), 5), 'yyyy-MM-dd'));
    setDueDate('');
    setAssignedTo('none');
    setModalOpen(true);
  };

  const openEditModal = (pub: Publication) => {
    setEditingPub(pub);
    setTitle(pub.title);
    setDescription(pub.description || '');
    setPubDate(pub.publication_date ? (pub.publication_date.split('T')[0] as string) : format(new Date(), 'yyyy-MM-dd'));
    setDueDate(pub.due_date ? (pub.due_date.split('T')[0] as string) : '');
    setAssignedTo(pub.assigned_to || 'none');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPub(null);
  };

  const handleSave = () => {
    if (!title.trim() || !pubDate) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const payload: Partial<Publication> = {
      title,
      description,
      publication_date: pubDate,
      due_date: dueDate || null,
      assigned_to: assignedTo === 'none' ? null : assignedTo,
    };

    if (editingPub) {
      updateMutation.mutate({ id: editingPub.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImportPublications = async () => {
    if (!importFile) {
        toast({ title: "Erro", description: "Por favor, selecione uma planilha Excel (.xlsx)", variant: "destructive" });
        return;
    }

    setIsImporting(true);
    try {
        const formData = new FormData();
        formData.append("file", importFile);

        const response = await fetch('/api/publications/import', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Falha ao importar publicações.");
        }

        if (result.successCount > 0) {
            toast({ title: "Importação concluída!", description: `${result.successCount} publicação(ões) importada(s) com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ['publications'] });
        }

        if (result.errors && result.errors.length > 0) {
            console.error("Erros de importação:", result.errors);
            toast({ title: "Alguns itens falharam", description: "Verifique o console para mais detalhes.", variant: "destructive" });
        }

        if (result.successCount === 0 && result.errorCount === 0) {
            toast({ title: "Arquivo vazio", description: "Nenhum dado válido encontrado.", variant: "destructive" });
        }

        setIsImportModalOpen(false);
        setImportFile(null);
    } catch (error: any) {
        toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } finally {
        setIsImporting(false);
    }
  };

  const quickAssign = (pub: Publication, employeeId: string) => {
    updateMutation.mutate({
      id: pub.id,
      data: {
        assigned_to: employeeId === 'none' ? null : employeeId
      }
    });
  };

  const quickUpdateStatus = (pub: Publication, status: string) => {
    updateMutation.mutate({
      id: pub.id,
      data: { status: status as "Pendente" | "Concluída" | "Cancelada" }
    });
  };

  const quickUpdateTitle = (pub: Publication, title: string) => {
    if (!title.trim() || title === pub.title) return;
    updateMutation.mutate({
      id: pub.id,
      data: { title: title.trim() }
    });
  };

  // 1. Group publications by Month for the root folder view
  const monthsFolders = useMemo(() => {
    const filterYear = parseInt(selectedYearFilter, 10);
    const monthsMap = new Map<string, Publication[]>();
    
    // Always show 12 months for the selected year
    for (let i = 0; i < 12; i++) {
      const date = new Date(filterYear, i, 1);
      const key = format(date, 'yyyy-MM');
      monthsMap.set(key, []);
    }

    // Assign publications to their respective month folders
    publications.forEach(pub => {
      if (!pub.publication_date) return;
      if (!pub.publication_date.startsWith(selectedYearFilter)) return; // Filter by selected year
      
      const pubDate = parseISO(pub.publication_date);
      if (!isValid(pubDate)) return;

      const key = format(pubDate, 'yyyy-MM');
      if (!monthsMap.has(key)) {
        monthsMap.set(key, []);
      }
      monthsMap.get(key)!.push(pub);
    });

    const sortedKeys = Array.from(monthsMap.keys()).sort();
    return { keys: sortedKeys, map: monthsMap };
  }, [publications, selectedYearFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    publications.forEach(pub => {
      if (pub.publication_date) {
        years.add(pub.publication_date.substring(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [publications]);

  // 2. Compute Days for the selected month
  const daysInMonth = useMemo(() => {
    if (!selectedMonth) return [];
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr || '', 10);
    const month = parseInt(monthStr || '', 10);
    
    // get number of days in that month
    const numDays = new Date(year, month, 0).getDate();
    
    const days = [];
    const pubsInMonth = monthsFolders.map.get(selectedMonth) || [];

    for (let i = 1; i <= numDays; i++) {
      const dateStr = `${selectedMonth}-${i.toString().padStart(2, '0')}`;
      const pubsInDay = pubsInMonth.filter(p => p.publication_date?.startsWith(dateStr));
      
      // We push a folder for every single day
      days.push({
        date: dateStr,
        dayNumber: i,
        pubs: pubsInDay
      });
    }
    return days;
  }, [selectedMonth, monthsFolders]);

  // 3. Compute the active publications when viewing a specific day
  const pubsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayData = daysInMonth.find(d => d.date === selectedDate);
    if (!dayData) return [];

    return dayData.pubs.filter(pub => {
      const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || pub.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [selectedDate, daysInMonth, searchTerm, filterStatus]);

  if (isLoading) {
    return <div className="p-8 text-center text-brand-gray">Carregando publicações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm">
        <h2 className="text-3xl font-serif text-brand-black tracking-tight">Publicações</h2>
        <p className="text-brand-gray mt-2 font-medium">Cronograma de postagens e artigos organizado por pastas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Total</p>
                <p className="text-3xl font-serif text-brand-black">{publications.length}</p>
              </div>
              <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                <Megaphone className="w-5 h-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Pendentes</p>
                <p className="text-3xl font-serif text-brand-black">{publications.filter(p => p.status === 'Pendente').length}</p>
              </div>
              <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                <Clock className="w-5 h-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Concluídas</p>
                <p className="text-3xl font-serif text-brand-black">{publications.filter(p => p.status === 'Concluída').length}</p>
              </div>
              <div className="p-2 bg-green-50 border border-brand-gray/10 rounded-sm">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Canceladas</p>
                <p className="text-3xl font-serif text-brand-black">{publications.filter(p => p.status === 'Cancelada').length}</p>
              </div>
              <div className="p-2 bg-red-50 border border-brand-gray/10 rounded-sm">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mb-4">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            {/* SEARCH / FILTERS - APPLIED PRIMARILY AT DAY LEVEL */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-gray h-5 w-5" />
                <Input placeholder="Buscar por título..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-white border-2 border-brand-gray focus:border-brand-gray rounded-xl" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] h-12 bg-white border-2 border-brand-gray rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedYearFilter} onValueChange={(val) => {
                setSelectedYearFilter(val);
                setSelectedMonth(null);
                setSelectedDate(null);
              }}>
                <SelectTrigger className="w-[120px] h-12 bg-white border-2 border-brand-gray rounded-xl">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {user?.role === 'admin' && (
              <div className="flex gap-3 items-center">
                <Button variant="outline" className="border-2 border-brand-gray hover:border-brand-gray hover:bg-brand-gray rounded-xl h-12 px-4" onClick={() => setIsImportModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Importar
                </Button>
                <Button onClick={openNewModal} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg rounded-xl h-12 px-6">
                  <Plus className="mr-2 h-4 w-4" /> Nova Publicação
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* EXPLORER BREADCRUMBS */}
      <div className="bg-white border-b border-brand-gray/20 py-4 px-6 rounded-t-xl flex items-center space-x-2 text-brand-gray shadow-sm">
        <button 
          onClick={() => { setSelectedMonth(null); setSelectedDate(null); }} 
          className="hover:text-brand font-medium flex items-center transition-colors"
        >
          <FolderOpen className="w-5 h-5 mr-2 text-brand-sage" /> Publicações
        </button>
        
        {selectedMonth && (
          <>
            <ChevronRight className="w-4 h-4 mx-2" />
            <button 
              onClick={() => setSelectedDate(null)} 
              className={`font-medium capitalize transition-colors ${!selectedDate ? 'text-brand-black' : 'hover:text-brand'}`}
            >
              {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}
            </button>
          </>
        )}
        
        {selectedDate && (
          <>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-brand-black font-semibold">
              Dia {parseInt(selectedDate.split('-')[2] || '1', 10)}
            </span>
          </>
        )}
      </div>

      {/* FOLDER VIEW PORT */}
      <div className="bg-white/50 min-h-[400px] p-6 rounded-b-xl border border-t-0 border-brand-gray/20">
        
        {/* VIEW 1: MONTHS FOLDERS */}
        {!selectedMonth && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {monthsFolders.keys.map(monthKey => {
              const pubCount = monthsFolders.map.get(monthKey)!.length;
              const date = parseISO(`${monthKey}-01`);
              
              return (
                <Card 
                  key={monthKey} 
                  className="cursor-pointer group hover:bg-brand-light/5 hover:border-brand-light transition-all duration-300 shadow-sm hover:shadow-md border border-brand-gray/10" 
                  onClick={() => setSelectedMonth(monthKey)}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative transform group-hover:scale-110 transition-transform duration-300">
                      <Folder className="w-16 h-16 text-brand-sage/60" fill="currentColor" />
                      {pubCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-brand text-white text-[10px] min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full font-bold shadow-sm">
                          {pubCount}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="block font-bold text-brand-black capitalize text-base">
                        {format(date, 'MMMM', { locale: ptBR })}
                      </span>
                      <span className="block text-xs text-brand-gray font-medium">
                        {format(date, 'yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* VIEW 2: DAYS FOLDERS */}
        {selectedMonth && !selectedDate && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {daysInMonth.map(day => {
              const pubCount = day.pubs.length;
              return (
                <Card 
                  key={day.date} 
                  className="cursor-pointer group hover:bg-brand-light/5 hover:border-brand-light transition-all duration-300 shadow-sm border border-brand-gray/10" 
                  onClick={() => setSelectedDate(day.date)}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="relative transform group-hover:-translate-y-1 transition-transform duration-300">
                      <Folder className="w-12 h-12 text-brand-beige" fill="currentColor" />
                      {pubCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-brand text-white text-[10px] min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white">
                          {pubCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-brand-black text-lg leading-tight">{day.dayNumber}</span>
                      <span className="text-[10px] text-brand-gray uppercase font-semibold">
                        {format(parseISO(day.date), 'EEE', { locale: ptBR })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* VIEW 3: PUBLICATIONS LIST FOR SELECTED DAY */}
        {selectedMonth && selectedDate && (
          <div className="space-y-6">
            {pubsForSelectedDate.length === 0 ? (
              <div className="text-center py-16 bg-white/50 rounded-lg border-2 border-dashed border-brand-gray/30">
                <FileText className="h-12 w-12 text-brand-gray/40 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-brand-gray">Nenhuma publicação encontrada para este dia</h3>
                <p className="text-sm text-brand-gray/60 mt-2">Clique em Nova Publicação para agendar algo.</p>
              </div>
            ) : (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-brand-black hover:bg-brand-darkolive">
                        <TableHead className="text-brand-beige font-bold w-12">#</TableHead>
                        <TableHead className="text-brand-beige font-bold min-w-[200px]">Número da Publicação</TableHead>
                        <TableHead className="text-brand-beige font-bold min-w-[200px]">Anotações</TableHead>
                        <TableHead className="text-brand-beige font-bold">Datas</TableHead>
                        <TableHead className="text-brand-beige font-bold">Responsável</TableHead>
                        <TableHead className="text-brand-beige font-bold">Status</TableHead>
                        <TableHead className="text-right text-brand-beige font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pubsForSelectedDate.map((pub, index) => (
                        <TableRow key={pub.id} className="group hover:bg-gradient-to-r hover:from-brand-light/20 hover:to-transparent transition-all duration-200">
                          <TableCell className="font-medium text-brand-gray/50">{index + 1}</TableCell>
                          <TableCell>
                            <Input 
                              defaultValue={pub.title} 
                              onBlur={(e) => quickUpdateTitle(pub, e.target.value)}
                              className="h-8 text-sm bg-transparent border-transparent hover:border-brand-gray/30 focus:border-brand focus:bg-white transition-all shadow-none"
                              placeholder="Colar número..."
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-brand-gray line-clamp-2 max-w-[250px]" title={pub.description || ""}>
                              {pub.description || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-brand-gray">
                              <div>Pub: <span className="font-semibold text-brand-black">{pub.publication_date ? format(parseISO(pub.publication_date), 'dd/MM/yyyy') : '-'}</span></div>
                              {pub.due_date && <div>Prazo: <span className="font-semibold text-brand">{format(parseISO(pub.due_date), 'dd/MM/yyyy')}</span></div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select defaultValue={pub.assigned_to || "none"} onValueChange={(val) => quickAssign(pub, val)}>
                              <SelectTrigger className="h-8 text-xs bg-transparent border-transparent hover:border-brand-gray/30 focus:border-brand focus:bg-white shadow-none w-[160px]">
                                <SelectValue placeholder="Atribuir..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs text-brand-gray italic">Sem responsável</SelectItem>
                                {employees.map((emp: any) => (
                                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                    {emp.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select defaultValue={pub.status} onValueChange={(val) => quickUpdateStatus(pub, val)}>
                              <SelectTrigger className={`h-8 text-xs border-transparent hover:border-brand-gray/30 focus:border-brand shadow-none w-[130px] font-semibold ${
                                pub.status === 'Concluída' ? 'bg-green-50 text-green-700' : 
                                pub.status === 'Pendente' ? 'bg-brand-light/20 text-brand' : 
                                'bg-red-50 text-red-700'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pendente" className="text-xs font-semibold text-brand">Pendente</SelectItem>
                                <SelectItem value="Concluída" className="text-xs font-semibold text-green-700">Concluída</SelectItem>
                                <SelectItem value="Cancelada" className="text-xs font-semibold text-red-700">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => openEditModal(pub)} className="h-8 w-8 text-brand hover:bg-brand-light" title="Abrir (Ver detalhes e observações)">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {user?.role === 'admin' && (
                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pub.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-brand-black border-b border-brand-gray/20 pb-4">
              {editingPub ? 'Editar Publicação' : 'Nova Publicação'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título da Publicação *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Artigo sobre Direito Trabalhista" />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição / Pauta</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Instruções ou conteúdo base..." />
            </div>
            
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Publicação *</Label>
                  <Input type="date" value={pubDate} onChange={e => setPubDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Prazo Final</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Responsável</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            {editingPub && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingPub.status} onValueChange={val => setEditingPub({ ...editingPub, status: val as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-gray/20">
            <Button variant="outline" onClick={closeModal} className="border-2 border-brand-gray rounded-sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-brand text-white hover:bg-brand-dark rounded-sm">
              {editingPub ? 'Salvar Alterações' : 'Criar Publicação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-brand-black border-b border-brand-gray/20 pb-4">Importar Planilha</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o arquivo Excel (.xlsx)</Label>
              <p className="text-xs text-brand-gray mb-2">As abas devem conter datas no nome (ex: Publicações 15-07) e os números de processo soltos nas colunas.</p>
              <Input type="file" accept=".xlsx, .xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="cursor-pointer" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-gray/20">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)} disabled={isImporting}>Cancelar</Button>
            <Button onClick={handleImportPublications} disabled={!importFile || isImporting} className="bg-brand text-white hover:bg-brand-dark">
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
