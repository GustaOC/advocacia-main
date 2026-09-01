"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Upload, Sparkles, FileText, MessageSquare, 
  Send, Loader2, Search, Plus, Trash2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

const quickPrompts = [
  "Faça um resumo executivo de todos os documentos",
  "Monte uma linha do tempo dos eventos",
  "Identifique as partes envolvidas",
  "Aponte contradições entre os documentos",
  "Liste os pontos juridicamente relevantes",
];

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DocumentAnalysisModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newCaseId, setNewCaseId] = useState<string>('none');
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch sessions
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['analysis-sessions'],
    queryFn: () => (apiClient as any).getAnalysisSessions()
  });

  // Fetch cases for the dropdown
  const { data: casesData } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases()
  });

  const sessions = sessionsData?.sessions || [];
  const cases: any[] = Array.isArray(casesData) ? casesData : (casesData?.cases || []);

  const createMutation = useMutation({
    mutationFn: (data: { title: string; case_id?: number }) => (apiClient as any).createAnalysisSession(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['analysis-sessions'] });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewCaseId('none');
      handleOpenSession(newSession);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message || "Erro ao criar análise", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (apiClient as any).deleteAnalysisSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-sessions'] });
      setSessionToDelete(null);
      toast({ title: "Sucesso", description: "Análise excluída com sucesso" });
    }
  });

  const handleCreateSession = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle,
      case_id: newCaseId !== 'none' ? parseInt(newCaseId) : undefined
    });
  };

  const handleOpenSession = async (session: any) => {
    setSelectedSession(session);
    try {
      const data = await (apiClient as any).getAnalysisSession(session.id);
      setDocuments(data.documents || []);
      setMessages(data.messages || []);
      setSelectedDocs([]);
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao carregar sessão", variant: "destructive" });
      setSelectedSession(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession || !e.target.files) return;
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const res = await (apiClient as any).uploadAnalysisDocuments(selectedSession.id, formData);
      setDocuments(prev => [...prev, ...(res.documents || [])]);
      toast({ title: "Sucesso", description: "Documentos enviados com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao enviar documentos", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOrganize = async () => {
    if (!selectedSession) return;
    setOrganizing(true);
    try {
      const res = await (apiClient as any).organizeDocuments(selectedSession.id);
      const suggestions = res.suggestions || [];
      
      // Update each document sequentially or parallel
      await Promise.all(suggestions.map((sug: any) => 
        (apiClient as any).updateAnalysisSession(selectedSession.id, { 
          documentId: sug.id, 
          suggested_name: sug.suggestedName 
        })
      ));
      
      // Refresh documents
      const data = await (apiClient as any).getAnalysisSession(selectedSession.id);
      setDocuments(data.documents || []);
      toast({ title: "Sucesso", description: "Documentos organizados com IA" });
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao organizar documentos", variant: "destructive" });
    } finally {
      setOrganizing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !selectedSession) return;
    
    const question = text.trim();
    setChatInput('');
    setSending(true);
    
    // Optimistic user message
    const tempMsg = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, tempMsg]);
    
    try {
      const res = await (apiClient as any).chatWithDocuments(selectedSession.id, { 
        question, 
        documentIds: selectedDocs.length > 0 ? selectedDocs : undefined 
      });
      
      setMessages(prev => [...prev, { id: Date.now().toString() + 'a', role: 'assistant', content: res.answer }]);
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(chatInput);
  };

  const filteredSessions = sessions.filter((s: any) => 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDocuments = sessions.reduce((acc: number, s: any) => acc + (s.document_count || 0), 0);
  const sessionsThisMonth = sessions.filter((s: any) => {
    if (!s.created_at) return false;
    const date = new Date(s.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  if (selectedSession) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] animate-fadeIn">
        {/* Top bar with back button */}
        <div className="bg-white border-l-4 border-brand p-4 shadow-sm mb-4 rounded-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSession(null)} className="hover:bg-brand-light/50">
              <ArrowLeft className="w-5 h-5 text-brand" />
            </Button>
            <div>
              <h2 className="text-xl font-serif text-brand-black font-semibold">{selectedSession.title}</h2>
              {selectedSession.case && (
                <p className="text-sm text-brand-gray flex items-center gap-1 mt-0.5">
                  <FileText className="w-3 h-3" />
                  {selectedSession.case.title}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
          {/* Left Panel - Documents */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div 
              className="border-2 border-dashed border-brand-sage/50 rounded-lg p-6 text-center hover:border-brand hover:bg-brand/5 transition-all cursor-pointer bg-white"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-brand-sage animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-2 text-brand-sage" />
              )}
              <p className="text-sm font-medium text-brand-black">
                {uploading ? 'Enviando...' : 'Arraste seus documentos aqui'}
              </p>
              <p className="text-xs text-brand-gray mt-1">PDF, DOCX ou TXT • Máx. 20 arquivos</p>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileSelect} />
            </div>
            
            {documents.length > 0 && (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-black">Documentos ({documents.length})</h3>
                <Button onClick={handleOrganize} variant="outline" size="sm" className="border-brand-sage text-brand h-8" disabled={organizing}>
                  {organizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {organizing ? 'Organizando...' : 'Sugerir Nomes'}
                </Button>
              </div>
            )}
            
            <ScrollArea className="flex-1 bg-white rounded-lg border border-brand-gray/20 p-2 shadow-sm">
              <div className="space-y-1">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-brand-light/30 border border-transparent transition-all">
                    <Checkbox 
                      checked={selectedDocs.includes(doc.id)} 
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedDocs(prev => [...prev, doc.id]);
                        else setSelectedDocs(prev => prev.filter(id => id !== doc.id));
                      }} 
                    />
                    <FileText className="w-5 h-5 text-brand-sage flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-black truncate" title={doc.suggested_name || doc.original_name}>
                        {doc.suggested_name || doc.original_name}
                      </p>
                      <p className="text-xs text-brand-gray">
                        {formatFileSize(doc.file_size)} • {(doc.file_type || '').toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && !uploading && (
                  <div className="text-center py-8 text-brand-gray text-sm">
                    Nenhum documento adicionado ainda.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Right Panel - Chat */}
          <div className="lg:col-span-3 flex flex-col bg-white rounded-lg border border-brand-gray/20 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-brand-gray/20 bg-brand-light/10">
              <h3 className="font-semibold text-brand-black flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand" />
                Chat com Documentos
              </h3>
              <p className="text-xs text-brand-gray mt-1">
                {selectedDocs.length > 0 
                  ? `Analisando ${selectedDocs.length} documento(s) selecionado(s)` 
                  : `Analisando todos os ${documents.length} documentos`}
              </p>
            </div>
            
            <ScrollArea className="flex-1 p-4 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="text-center py-12 px-4">
                  <div className="bg-brand-light/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-brand-sage" />
                  </div>
                  <p className="text-brand font-semibold text-lg">Faça uma pergunta sobre seus documentos</p>
                  <p className="text-sm text-brand-gray mt-2 max-w-md mx-auto">
                    A IA vai analisar o conteúdo e responder com precisão baseada nos documentos fornecidos.
                  </p>
                  
                  <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                    {quickPrompts.map((prompt, i) => (
                      <Button key={i} variant="outline" size="sm" className="text-xs border-brand-sage/50 text-brand-black hover:bg-brand-light/30" onClick={() => handleSendMessage(prompt)}>
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-brand text-brand-beige rounded-br-none' 
                        : 'bg-white border border-brand-gray/20 text-brand-black rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-white border border-brand-gray/20 text-brand-black rounded-bl-none shadow-sm flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-brand" />
                      <span className="text-brand-gray">Analisando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-brand-gray/20 bg-white">
              <form onSubmit={handleSubmitChat} className="flex gap-2">
                <Input 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Faça uma pergunta sobre os documentos..." 
                  className="flex-1 focus-visible:ring-brand"
                  disabled={sending || documents.length === 0}
                />
                <Button type="submit" disabled={sending || !chatInput.trim() || documents.length === 0} className="bg-brand text-brand-beige hover:bg-brand/90">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm">
        <h2 className="text-3xl font-serif text-brand-black tracking-tight">Análise Inteligente de Documentos</h2>
        <p className="text-brand-gray mt-2 font-medium">Analise documentos jurídicos com inteligência artificial</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border border-brand-gray/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Total de Análises</p>
                <p className="text-3xl font-serif text-brand-black">{sessions.length}</p>
              </div>
              <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                <Search className="w-5 h-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-brand-gray/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Documentos Processados</p>
                <p className="text-3xl font-serif text-brand-black">{totalDocuments}</p>
              </div>
              <div className="p-2 bg-brand-sage/20 border border-brand-sage/30 rounded-sm">
                <FileText className="w-5 h-5 text-brand-sage" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-brand-gray/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Análises este Mês</p>
                <p className="text-3xl font-serif text-brand-black">{sessionsThisMonth}</p>
              </div>
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-sm">
                <Calendar className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
          <Input 
            placeholder="Buscar análises..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-brand-gray/20 focus-visible:ring-brand"
          />
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-brand text-brand-beige hover:bg-brand/90 shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Análise
        </Button>
      </div>

      {/* Sessions Grid */}
      {isLoadingSessions ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-brand-gray/20 shadow-sm">
          <Sparkles className="w-12 h-12 text-brand-sage mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-brand-black mb-2">Nenhuma análise encontrada</h3>
          <p className="text-brand-gray max-w-md mx-auto">
            Crie sua primeira análise para começar a conversar com seus documentos usando inteligência artificial.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6 bg-brand text-brand-beige">
            <Plus className="mr-2 w-4 h-4" /> Iniciar Primeira Análise
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSessions.map((session: any) => (
            <Card key={session.id} className="border border-brand-gray/20 hover:border-brand-sage/50 transition-all shadow-sm hover:shadow-md cursor-pointer bg-white group" onClick={() => handleOpenSession(session)}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-light/30 rounded-md">
                      <Sparkles className="w-4 h-4 text-brand" />
                    </div>
                    <Badge variant="outline" className="text-xs font-normal border-brand-gray/20 text-brand-gray">
                      {session.document_count || 0} docs
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-brand-gray opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all -mt-1 -mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(session.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <h3 className="font-semibold text-brand-black text-lg line-clamp-1 mb-1">{session.title}</h3>
                
                {session.case ? (
                  <p className="text-sm text-brand-gray flex items-center gap-1.5 mb-4 line-clamp-1">
                    <FileText className="w-3.5 h-3.5" />
                    {session.case.title}
                  </p>
                ) : (
                  <p className="text-sm text-brand-gray/50 mb-4 h-5">Sem caso vinculado</p>
                )}
                
                <div className="flex justify-between items-center text-xs text-brand-gray pt-4 border-t border-brand-gray/10">
                  <span>{session.created_at ? new Date(session.created_at).toLocaleDateString('pt-BR') : 'Recente'}</span>
                  <span className="font-medium">{session.creator?.name || 'Usuário'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-brand font-serif text-xl">Nova Análise</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-black">Título da Análise *</label>
              <Input 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Ex: Análise de Contratos Cliente X"
                className="focus-visible:ring-brand"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-black">Vincular a Caso (Opcional)</label>
              <Select value={newCaseId} onValueChange={setNewCaseId}>
                <SelectTrigger className="focus:ring-brand">
                  <SelectValue placeholder="Selecione um caso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.case_number ? `${c.case_number} - ` : ''}{c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSession} disabled={!newTitle.trim() || createMutation.isPending} className="bg-brand text-brand-beige">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Análise?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os documentos e o histórico do chat serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => sessionToDelete && deleteMutation.mutate(sessionToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
