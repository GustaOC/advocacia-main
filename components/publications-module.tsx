"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiClient, Publication } from '@/lib/api-client';
import { Calendar, CheckCircle, Clock, Edit, FileText, Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PublicationsModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pubDate, setPubDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      toast({ title: 'Sucesso', description: 'Publicação atualizada.' });
      closeModal();
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
    setPubDate(format(new Date(), 'yyyy-MM-dd'));
    setAssignedTo('none');
    setModalOpen(true);
  };

  const openEditModal = (pub: Publication) => {
    setEditingPub(pub);
    setTitle(pub.title);
    setDescription(pub.description || '');
    setPubDate(pub.publication_date ? (pub.publication_date.split('T')[0] as string) : format(new Date(), 'yyyy-MM-dd'));
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
      assigned_to: assignedTo === 'none' ? null : assignedTo,
    };

    if (editingPub) {
      updateMutation.mutate({ id: editingPub.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: Publication[] } = {};
    
    publications.forEach(pub => {
      const date = parseISO(pub.publication_date);
      const monthKey = format(date, 'MMMM yyyy', { locale: ptBR });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(pub);
    });

    // Ordenar as publicações dentro de cada mês por data
    Object.keys(groups).forEach(key => {
      groups[key]!.sort((a, b) => new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime());
    });

    // Ordenar as chaves (meses)
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const dateA = parseISO(groups[a]?.[0]?.publication_date || new Date().toISOString());
      const dateB = parseISO(groups[b]?.[0]?.publication_date || new Date().toISOString());
      return dateB.getTime() - dateA.getTime(); // Mais recentes primeiro
    });

    return { groups, sortedKeys };
  }, [publications]);

  if (isLoading) {
    return <div className="p-8 text-center text-brand-gray">Carregando publicações...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end mb-8">
        <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm w-full md:w-auto flex-1">
          <h2 className="text-3xl font-serif text-brand-black tracking-tight">Publicações</h2>
          <p className="text-brand-gray mt-2 font-medium">Cronograma de postagens e artigos.</p>
        </div>
        {user?.role === 'admin' && (
          <div className="ml-4">
            <Button onClick={openNewModal} className="bg-brand text-white hover:bg-brand-dark shadow-sm rounded-none mb-6 px-6 h-[116px]">
              <Plus className="h-4 w-4 mr-2" />
              Nova Publicação
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-12">
        {groupedByMonth.sortedKeys.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-lg border-2 border-dashed border-brand-gray/30">
            <FileText className="h-12 w-12 text-brand-gray/40 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-brand-gray">Nenhuma publicação agendada</h3>
          </div>
        ) : (
          groupedByMonth.sortedKeys.map(month => (
            <div key={month} className="space-y-4">
              <h3 className="text-2xl font-serif text-brand capitalize border-b border-brand-gray/20 pb-2">{month}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedByMonth.groups[month]!.map(pub => (
                  <Card key={pub.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-brand-light/50 overflow-hidden relative bg-white">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <span className="text-3xl font-bold text-brand tabular-nums leading-none">
                            {format(parseISO(pub.publication_date), 'dd')}
                          </span>
                          <span className="text-xs font-semibold text-brand-gray uppercase tracking-wider mt-1">
                            {format(parseISO(pub.publication_date), 'EEEE', { locale: ptBR })}
                          </span>
                        </div>
                        <Badge variant="outline" className={pub.status === 'Concluída' ? 'bg-green-50 text-green-700 border-green-200' : pub.status === 'Pendente' ? 'bg-brand-light/20 text-brand border-brand-light' : 'bg-red-50 text-red-700 border-red-200'}>
                          {pub.status}
                        </Badge>
                      </div>

                      <h4 className="text-lg font-bold text-brand-black line-clamp-2 mb-2">{pub.title}</h4>
                      {pub.description && <p className="text-sm text-brand-gray line-clamp-3 mb-4">{pub.description}</p>}

                      <div className="pt-4 border-t border-brand-gray/10 flex justify-between items-center mt-auto">
                        <div className="flex items-center text-sm text-brand-gray">
                          <Users className="h-4 w-4 mr-2 opacity-70" />
                          <span className="font-medium truncate max-w-[150px]">
                            {pub.assigned_user?.name || "Sem responsável"}
                          </span>
                        </div>
                        
                        {(user?.role === 'admin' || user?.id === pub.assigned_to) && (
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(pub)} className="h-8 w-8 text-brand hover:bg-brand-light">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pub.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Publicação *</Label>
                <Input type="date" value={pubDate} onChange={e => setPubDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
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
    </div>
  );
}
