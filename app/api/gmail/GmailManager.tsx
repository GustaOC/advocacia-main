"use client"

import React, { useState, useEffect } from 'react'
import { Mail, Trash2, Reply, Send, FileText, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function GmailManager() {
  const [messages, setMessages] = useState<any[]>([])
  const [selectedMsg, setSelectedMsg] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [replyMode, setReplyMode] = useState(false)
  const [replyText, setReplyText] = useState('')
  const { toast } = useToast()

  // Busca a lista de e-mails
  const fetchMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gmail')
      const data = await res.json()
      if (res.ok) setMessages(data)
    } catch (err) {
      console.error("Erro ao carregar e-mails", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMessages() }, [])

  // Abre um e-mail específico
  const handleReadMessage = async (id: string) => {
    setSelectedMsg(null)
    setReplyMode(false)
    try {
      const res = await fetch(`/api/gmail/${id}`)
      const data = await res.json()
      if (res.ok) setSelectedMsg(data)
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível ler o e-mail", variant: "destructive" })
    }
  }

  // Deleta (Move para lixeira)
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja mover este e-mail para a lixeira?")) return
    try {
      const res = await fetch(`/api/gmail/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: "Sucesso", description: "E-mail movido para a lixeira" })
        setSelectedMsg(null)
        fetchMessages()
      }
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" })
    }
  }

  // Envia Resposta ou Rascunho
  const handleAction = async (isDraft: boolean) => {
    if (!replyText) return
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        body: JSON.stringify({
          to: selectedMsg.from,
          subject: `Re: ${selectedMsg.subject}`,
          message: replyText,
          threadId: selectedMsg.threadId,
          replyToId: selectedMsg.messageIdHeader,
          isDraft
        })
      })
      if (res.ok) {
        toast({ title: isDraft ? "Rascunho Salvo" : "E-mail Enviado" })
        setReplyMode(false)
        setReplyText('')
      }
    } catch (err) {
      toast({ title: "Erro", description: "Falha na operação", variant: "destructive" })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Lista de Mensagens */}
      <Card className="md:col-span-4 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <CardTitle className="text-sm font-medium">Caixa de Entrada</CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchMessages} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleReadMessage(msg.id)}
                className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedMsg?.id === msg.id ? 'bg-muted' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-xs truncate max-w-[150px]">{msg.from.split('<')[0]}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(parseInt(msg.internalDate)), 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <div className="text-xs font-medium truncate mb-1">{msg.subject}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{msg.snippet}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Visualizador / Resposta */}
      <Card className="md:col-span-8 flex flex-col overflow-hidden">
        {selectedMsg ? (
          <>
            <CardHeader className="border-b px-4 py-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedMsg.subject}</CardTitle>
                <div className="text-xs text-muted-foreground">De: {selectedMsg.from}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReplyMode(!replyMode)}>
                  <Reply className="h-4 w-4 mr-2" /> Responder
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(selectedMsg.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-4 bg-white dark:bg-slate-950">
              {replyMode ? (
                <div className="space-y-4">
                  <div className="bg-muted p-2 rounded text-xs">
                    Respondendo para: <strong>{selectedMsg.from}</strong>
                  </div>
                  <Textarea 
                    placeholder="Escreva sua resposta..." 
                    className="min-h-[200px]"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setReplyMode(false)}>Cancelar</Button>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => handleAction(true)}>
                        <FileText className="h-4 w-4 mr-2" /> Salvar Rascunho
                      </Button>
                      <Button onClick={() => handleAction(false)}>
                        <Send className="h-4 w-4 mr-2" /> Enviar Agora
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Renderização do corpo do e-mail */
                <div 
                  className="prose prose-sm max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedMsg.body }} 
                />
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <Mail className="h-12 w-12 mb-4 opacity-20" />
            <p>Selecione um e-mail para ler o conteúdo completo</p>
          </div>
        )}
      </Card>
    </div>
  )
}