"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Loader2, Reply, Send, Plus, PenSquare, ChevronDown, ChevronUp, Paperclip, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/client';

export function GmailInboxModule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  // Estados para nova mensagem (Compose)
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [emailBodies, setEmailBodies] = useState<Record<string, { body: string; attachments: { id: string; filename: string; mimeType: string }[] }>>({});
  const [loadingBodies, setLoadingBodies] = useState<Set<string>>(new Set());
  const [pageTokens, setPageTokens] = useState<string[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);
  const [nextPageTokens, setNextPageTokens] = useState<
  Record<number, string | null>
>({});

const currentNextToken = nextPageTokens[pageTokens.length];

  // Estado que armazena os IDs dos e-mails expandidos
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

const fetchEmailBody = async (id: string) => {
  setLoadingBodies(prev => new Set(prev).add(id));
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token || "";

    const response = await fetch(`/api/gmail/messages/${id}`, {
      headers: { 'x-provider-token': providerToken }
    });

    if (response.ok) {
      const data = await response.json();
      setEmailBodies(prev => ({ 
        ...prev, 
        [id]: { 
          body: data.body, 
          attachments: data.attachments || [] 
        } 
      }));
    }
  } catch (error) {
    console.error('Erro ao buscar corpo do email:', error);
  } finally {
    setLoadingBodies(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }
};

  const toggleEmailExpand = (id: string) => {
  setExpandedEmails(prev => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      if (!emailBodies[id]) {
        fetchEmailBody(id);
      }
    }
    return newSet;
  });
};

  const { data, isLoading, isError, error } = useQuery({
  queryKey: ['gmailMessages', currentPageToken],
  queryFn: async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token || "";

    const url = currentPageToken 
      ? `/api/gmail/messages?pageToken=${currentPageToken}`
      : '/api/gmail/messages';

    const response = await fetch(url, {
      headers: { 'x-provider-token': providerToken }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao buscar e-mails');
    }

    const data = await response.json();
    setNextPageTokens(prev => ({
  ...prev,
  [pageTokens.length]: data.nextPageToken || null
}));
    return data.messages;
  },
  refetchInterval: 1000 * 60 * 5,
});

const messages = data || [];

  // Mutação responsável por enviar a resposta e novos e-mails para a API
  const sendMutation = useMutation({
    mutationFn: async (replyData: { to: string; subject: string; message: string; threadId?: string; attachments?: File[] }) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token || "";

      const formData = new FormData();
      formData.append('to', replyData.to);
      formData.append('subject', replyData.subject);
      formData.append('message', replyData.message);
      if (replyData.threadId) formData.append('threadId', replyData.threadId);
      if (replyData.attachments) {
        replyData.attachments.forEach(file => formData.append('attachments', file));
      }

      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 
          'x-provider-token': providerToken
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao enviar resposta');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Sua mensagem foi enviada." });
      setReplyModalOpen(false);
      setReplyText("");
      setSelectedMessage(null);
      setComposeModalOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeText("");
      setReplyFiles([]);
      setComposeFiles([]);

      // Atualiza a lista de e-mails invalidando a query sem precisar recarregar a tela
      queryClient.invalidateQueries({ queryKey: ['gmailMessages'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="relative bg-gradient-to-br from-red-700 via-orange-600 to-red-700 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-10"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-3">Gmail Inbox</h2>
          <p className="text-red-100 text-xl">Visualize e gerencie seus e-mails do Google diretamente aqui.</p>
        </div>
      </div>

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-red-600" />
            Sua Caixa de Entrada
          </CardTitle>
          <Button onClick={() => { setComposeModalOpen(true); setComposeFiles([]); }} className="bg-red-600 hover:bg-red-700 text-white shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Nova Mensagem
          </Button>
        </CardHeader>
        <CardContent className="text-slate-600 flex items-center justify-center min-h-[200px]">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          ) : isError ? (
            <div className="text-center space-y-2">
               <p className="text-red-500 font-medium">Erro ao carregar e-mails</p>
               <p className="text-sm text-slate-500 italic">{error?.message}</p>
            </div>
            
          ) : messages && messages.length > 0 ? (
            <div className="w-full space-y-4">
              {messages.map((message: any) => {
                const isExpanded = expandedEmails.has(message.id);
                return (
                  <div key={message.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div 
                        className="flex-1 cursor-pointer flex items-center gap-2 group"
                        onClick={() => toggleEmailExpand(message.id)}
                      >
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6 shrink-0 text-slate-400 group-hover:text-red-600 transition-colors">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                        <p className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">{message.subject}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMessage(message);
                          setReplyText("");
                          setReplyFiles([]);
                          setReplyModalOpen(true);
                        }}
                        className="ml-4 shrink-0 hover:text-red-600 hover:border-red-200"
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Responder
                      </Button>
                    </div>
                    
                    {isExpanded ? (
  <div className="mt-4 mb-4">
    {loadingBodies.has(message.id) ? (
  <div className="flex justify-center p-4">
    <Loader2 className="h-5 w-5 animate-spin text-red-500" />
  </div>
) : emailBodies[message.id] ? (
  <div className="space-y-3">
    <iframe
  srcDoc={(() => {
  const body = emailBodies[message.id]?.body || '';
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  
  const baseStyle = `
    <style>
      body { margin: 0; font-family: sans-serif; }
      img { max-width: 100% !important; }
    </style>
  `;

  if (isHtml) {
    if (body.includes('<head>')) {
      return body.replace('<head>', `<head><base target="_blank">${baseStyle}`);
    }
    return `<!DOCTYPE html><html><head><base target="_blank">${baseStyle}</head><body>${body}</body></html>`;
  }
  
  return `<!DOCTYPE html><html><head>${baseStyle}</head><body>${body.replace(/\n/g, '<br/>')}</body></html>`;
})()}
  className="w-full h-[200px] bg-white rounded-lg border border-slate-200 transition-all duration-300"
  title="Conteúdo do e-mail"
  onLoad={(e) => {
    const iframe = e.currentTarget;
    const contentHeight = iframe.contentWindow?.document.body.scrollHeight ?? 200;
    iframe.style.height = `${contentHeight + 20}px`;
  }}
/>

    {/* Anexos */}
    {(emailBodies[message.id]?.attachments ?? []).length > 0 && (
      <div className="border rounded-lg p-3 bg-slate-50">
        <p className="text-sm font-semibold text-slate-700 mb-2">Anexos:</p>
        <div className="flex flex-wrap gap-2">
          {(emailBodies[message.id]?.attachments ?? []).map((att) => (
            <a
              key={att.id}
              href={`/api/gmail/messages/${message.id}/attachments/${att.id}`}
              download={att.filename}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              onClick={async (e) => {
                e.preventDefault();
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.provider_token || "";

                const res = await fetch(
                  `/api/gmail/messages/${message.id}/attachments/${att.id}`,
                  { headers: { 'x-provider-token': token } }
                );
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = att.filename;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              📎 {att.filename}
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
) : (
  <p className="text-sm text-slate-700 p-4 bg-slate-50 rounded-lg whitespace-pre-wrap">
    {message.snippet}
  </p>
)}
  </div>
                    ) : (
                      <p 
                        className="text-sm text-slate-700 line-clamp-2 mb-2 cursor-pointer hover:text-slate-900 ml-8" 
                        onClick={() => toggleEmailExpand(message.id)}
                      >
                        {message.snippet}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center text-xs mt-2 ml-8">
                      <span className="text-brand font-medium">{message.from}</span>
                      <span className="text-slate-400">{new Date(parseInt(message.internalDate)).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
                            

              {/* Paginação */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const newTokens = [...pageTokens];
                    newTokens.pop();
                    setPageTokens(newTokens);
                    setCurrentPageToken(
                      newTokens[newTokens.length - 1] || null
                    );
                  }}
                  disabled={pageTokens.length === 0}
                  className="hover:text-red-600 hover:border-red-200"
                >
                  ← Anterior
                </Button>

                <span className="text-sm text-slate-500">
                  Página {pageTokens.length + 1}
                </span>

                <Button
  variant="outline"
  onClick={() => {
    if (currentNextToken) {
      setPageTokens(prev => [...prev, currentNextToken]);
      setCurrentPageToken(currentNextToken);
    }
  }}
  disabled={!currentNextToken}
  className="hover:text-red-600 hover:border-red-200"
>
  Próxima →
</Button>
              </div>
            </div>
          ) : (
            <p className="italic">Funcionalidade de exibição de e-mails será implementada aqui.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Resposta */}
      <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Reply className="h-6 w-6 text-red-600" />
              Responder E-mail
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Para: <span className="font-semibold">{selectedMessage?.from}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Assunto</Label>
              <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-slate-600">
                {selectedMessage?.subject?.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage?.subject}`}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Mensagem</Label>
              <Textarea
                rows={8}
                placeholder="Escreva sua resposta aqui..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="resize-none bg-white border-2 border-slate-200 rounded-xl focus:border-red-400"
              />
            </div>
            
            {/* INÍCIO BLOCO ANEXOS - RESPONDER */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-700">Anexos</Label>
                <label className="cursor-pointer text-sm text-red-600 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Paperclip className="h-4 w-4" />
                  Adicionar Arquivo
                  <input type="file" multiple className="hidden" onChange={(e) => setReplyFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                </label>
              </div>
              {replyFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {replyFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-medium text-slate-700">
                      <span className="truncate max-w-[150px]">{f.name}</span>
                      <X className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors ml-1" onClick={() => setReplyFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* FIM BLOCO ANEXOS */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyModalOpen(false); setReplyFiles([]); }} className="border-2 border-slate-200 rounded-xl">Cancelar</Button>
            <Button
              onClick={() => {
                if (!replyText.trim()) {
                  toast({ title: "Aviso", description: "A mensagem não pode estar vazia.", variant: "destructive" });
                  return;
                }
                sendMutation.mutate({
                  to: selectedMessage.from,
                  subject: selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`,
                  message: replyText,
                  threadId: selectedMessage.threadId,
                  attachments: replyFiles
                });
              }}
              disabled={sendMutation.isPending}
              className="bg-gradient-to-r from-brand-beige to-brand-beige/90 text-brand-black hover:from-red-700 hover:to-orange-700 text-white shadow-lg rounded-xl"
            >
              {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Mensagem */}
      <Dialog open={composeModalOpen} onOpenChange={setComposeModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <PenSquare className="h-6 w-6 text-red-600" />
              Nova Mensagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Para</Label>
              <Input
                type="email"
                placeholder="email@destino.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                className="bg-white border-2 border-slate-200 rounded-xl focus:border-red-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Assunto</Label>
              <Input
                type="text"
                placeholder="Assunto da mensagem"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="bg-white border-2 border-slate-200 rounded-xl focus:border-red-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Mensagem</Label>
              <Textarea
                rows={8}
                placeholder="Escreva sua mensagem aqui..."
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                className="resize-none bg-white border-2 border-slate-200 rounded-xl focus:border-red-400"
              />
            </div>
            
            {/* INÍCIO BLOCO ANEXOS - NOVA MENSAGEM */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-700">Anexos</Label>
                <label className="cursor-pointer text-sm text-red-600 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Paperclip className="h-4 w-4" />
                  Adicionar Arquivo
                  <input type="file" multiple className="hidden" onChange={(e) => setComposeFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                </label>
              </div>
              {composeFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {composeFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-medium text-slate-700">
                      <span className="truncate max-w-[150px]">{f.name}</span>
                      <X className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors ml-1" onClick={() => setComposeFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* FIM BLOCO ANEXOS */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setComposeModalOpen(false); setComposeFiles([]); }} className="border-2 border-slate-200 rounded-xl">Cancelar</Button>
            <Button
              onClick={() => {
                if (!composeTo.trim() || !composeSubject.trim() || !composeText.trim()) {
                  toast({ title: "Aviso", description: "Preencha todos os campos.", variant: "destructive" });
                  return;
                }
                sendMutation.mutate({
                  to: composeTo,
                  subject: composeSubject,
                  message: composeText,
                  attachments: composeFiles
                });
              }}
              disabled={sendMutation.isPending}
              className="bg-gradient-to-r from-brand-beige to-brand-beige/90 text-brand-black hover:from-red-700 hover:to-orange-700 text-white shadow-lg rounded-xl"
            >
              {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar E-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}