/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search, Paperclip, Send, ArrowLeft, Phone, Video, MoreHorizontal,
  Image as ImageIcon, FileText, Smile, X, Download, Check, CheckCheck
} from 'lucide-react';

const CHAT_BUCKET = 'chat-files';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📈';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('compressed')) return '📦';
  return '📎';
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ontem';
  if (days < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDay.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ===== Exportação da contagem de não lidas para a sidebar =====
let unreadListeners: Array<(count: number) => void> = [];
let currentGlobalUnread = 0;

export function onUnreadCountChange(listener: (count: number) => void) {
  unreadListeners.push(listener);
  listener(currentGlobalUnread); // emit current value immediately
  return () => {
    unreadListeners = unreadListeners.filter(l => l !== listener);
  };
}

function emitUnreadCount(count: number) {
  currentGlobalUnread = count;
  unreadListeners.forEach(l => l(count));
}

// ===== Componente Principal =====
export function ChatModule() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const usersRef = useRef<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPerUser, setUnreadPerUser] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Emit unread count changes to sidebar
  useEffect(() => { emitUnreadCount(unreadCount); }, [unreadCount]);

  // 1. Init: load user and contacts
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setCurrentUser(session.user);

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, avatar_url')
        .neq('id', session.user.id);

      if (profiles) {
        setUsers(profiles);
        usersRef.current = profiles;
      }

      // Fetch last message for each conversation
      const { data: allMsgs } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (allMsgs) {
        const lastMsgMap: Record<string, any> = {};
        allMsgs.forEach(msg => {
          const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
          if (!lastMsgMap[otherId]) lastMsgMap[otherId] = msg;
        });
        setLastMessages(lastMsgMap);
      }
    };
    initChat();
  }, [supabase]);

  // 2. Realtime listener
  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadCount = async () => {
      const { data, count } = await supabase
        .from('chat_messages')
        .select('sender_id', { count: 'exact' })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      if (count !== null) setUnreadCount(count);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((msg) => { counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1; });
        setUnreadPerUser(counts);
      }
    };
    fetchUnreadCount();

    const channel = supabase
      .channel('chat_messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new;
        const currentActiveChat = activeChatRef.current;

        // Update last message
        const otherId = newMsg.sender_id === currentUser.id ? newMsg.receiver_id : newMsg.sender_id;
        setLastMessages(prev => ({ ...prev, [otherId]: newMsg }));

        if (newMsg.receiver_id === currentUser.id) {
          if (currentActiveChat?.id === newMsg.sender_id) {
            setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id).then(() => {});
          } else {
            const senderUser = usersRef.current.find(u => u.id === newMsg.sender_id);
            const senderName = senderUser?.name || 'Nova mensagem';
            toast({
              title: senderName,
              description: (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm truncate">{newMsg.content || '📎 Enviou um arquivo'}</span>
                </div>
              )
            });
            setUnreadCount(prev => prev + 1);
            setUnreadPerUser(prev => ({ ...prev, [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1 }));
          }
        }

        if (newMsg.sender_id === currentUser.id) {
          if (currentActiveChat?.id === newMsg.receiver_id) {
            setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, supabase]);

  // 3. Load conversation history
  useEffect(() => {
    if (!currentUser || !activeChat) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        const unreadIds = data.filter(m => m.receiver_id === currentUser.id && !m.is_read).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('chat_messages').update({ is_read: true }).in('id', unreadIds);
          setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
          setUnreadPerUser(prev => ({ ...prev, [activeChat.id]: 0 }));
        }
      }
    };
    fetchMessages();
    // Focus input when opening a chat
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentUser, activeChat, supabase]);

  // Auto scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Arquivo muito grande (${formatFileSize(file.size)}). Limite: 25MB.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (file: File) => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${currentUser.id}/${timestamp}_${safeName}`;
    const { error } = await supabase.storage.from(CHAT_BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) return null;
    const { data: urlData } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(filePath);
    return { url: urlData.publicUrl, name: file.name, type: file.type || 'application/octet-stream' };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentUser || !activeChat) return;
    if (uploading) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    let fileData: { url: string; name: string; type: string } | null = null;
    if (selectedFile) {
      setUploading(true);
      setUploadError(null);
      fileData = await uploadFile(selectedFile);
      if (!fileData) { setUploadError('Falha ao enviar arquivo. Tente novamente.'); setUploading(false); return; }
      clearSelectedFile();
      setUploading(false);
    }

    await supabase.from('chat_messages').insert({
      sender_id: currentUser.id,
      receiver_id: activeChat.id,
      content: msgText || (fileData ? fileData.name : ''),
      file_url: fileData?.url || null,
      file_name: fileData?.name || null,
      file_type: fileData?.type || null,
    });
  };

  // File content renderer
  const renderFileContent = (msg: any, isMe: boolean) => {
    if (!msg.file_url) return null;
    const fileType = msg.file_type || '';
    const fileName = msg.file_name || 'arquivo';

    if (fileType.startsWith('image/')) {
      return (
        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
          <img src={msg.file_url} alt={fileName} className="max-w-[280px] max-h-52 rounded-lg object-cover hover:opacity-90 transition-opacity" loading="lazy" />
        </a>
      );
    }
    if (fileType.startsWith('video/')) {
      return <video src={msg.file_url} controls className="max-w-[280px] max-h-52 rounded-lg mt-1.5" preload="metadata" />;
    }
    if (fileType.startsWith('audio/')) {
      return <audio src={msg.file_url} controls className="mt-1.5 w-full max-w-[280px]" preload="metadata" />;
    }

    return (
      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" download={fileName}
        className={`flex items-center gap-3 mt-1.5 p-3 rounded-lg border transition-colors ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
      >
        <span className="text-2xl flex-shrink-0">{getFileIcon(fileType)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className={`text-xs ${isMe ? 'text-white/60' : 'text-gray-400'}`}>Clique para baixar</p>
        </div>
        <Download className={`w-4 h-4 flex-shrink-0 ${isMe ? 'text-white/60' : 'text-gray-400'}`} />
      </a>
    );
  };

  // Filter users by search
  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort users: those with unread messages first, then by last message time
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const unreadA = unreadPerUser[a.id] || 0;
    const unreadB = unreadPerUser[b.id] || 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    const lastA = lastMessages[a.id]?.created_at || '';
    const lastB = lastMessages[b.id]?.created_at || '';
    return lastB.localeCompare(lastA);
  });

  // Group messages by date
  const getDateKey = (dateStr: string) => new Date(dateStr).toDateString();

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>Carregando chat...</p>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="flex h-[calc(100vh-180px)] bg-white rounded-xl overflow-hidden border border-gray-200">

      {/* ===== LEFT PANEL: Contact List (Teams Style) ===== */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[340px] md:min-w-[340px] border-r border-gray-200 bg-white`}>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar pessoas..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-md text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder-gray-400"
            />
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto">
          {sortedUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <p className="text-sm">Nenhum contato encontrado</p>
            </div>
          )}
          {sortedUsers.map((user) => {
            const lastMsg = lastMessages[user.id];
            const unread = unreadPerUser[user.id] || 0;
            const isActive = activeChat?.id === user.id;

            return (
              <button
                key={user.id}
                onClick={() => setActiveChat(user)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 ${
                  isActive ? 'bg-indigo-50 border-l-[3px] border-l-indigo-600' : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-semibold">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>

                {/* Name and last message */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {user.name || 'Usuário'}
                    </span>
                    {lastMsg && (
                      <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">
                        {formatMessageTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                      {lastMsg.sender_id === currentUser.id && <span className="text-gray-400">Você: </span>}
                      {lastMsg.file_url ? '📎 Arquivo' : lastMsg.content}
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 flex-shrink-0">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== RIGHT PANEL: Conversation (Teams Style) ===== */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-gray-50`}>
        {!activeChat ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium">Selecione uma conversa</p>
            <p className="text-xs">Escolha um contato ao lado para iniciar</p>
          </div>
        ) : (
          <>
            {/* Chat Header (Teams style) */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button onClick={() => { setActiveChat(null); clearSelectedFile(); }} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Voltar">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <Avatar className="h-9 w-9">
                  {activeChat.avatar_url && <AvatarImage src={activeChat.avatar_url} alt={activeChat.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-semibold">
                    {(activeChat.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">{activeChat.name || 'Usuário'}</h3>
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    Disponível
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser.id;
                const showDateSeparator = idx === 0 || getDateKey(msg.created_at) !== getDateKey(messages[idx - 1].created_at);

                return (
                  <React.Fragment key={msg.id}>
                    {/* Date separator */}
                    {showDateSeparator && (
                      <div className="flex items-center my-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="px-3 text-[11px] text-gray-400 font-medium">{formatDateSeparator(msg.created_at)}</span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {/* Other user avatar */}
                      {!isMe && (
                        <Avatar className="h-8 w-8 mr-2 mt-auto flex-shrink-0">
                          {activeChat.avatar_url && <AvatarImage src={activeChat.avatar_url} />}
                          <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-semibold">
                            {(activeChat.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`max-w-[70%] group`}>
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                        }`}>
                          {msg.content && msg.content !== msg.file_name && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          )}
                          {renderFileContent(msg, isMe)}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-gray-400">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            msg.is_read
                              ? <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                              : <Check className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* File preview */}
            {selectedFile && (
              <div className="mx-4 mb-2 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="text-lg flex-shrink-0">{getFileIcon(selectedFile.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-gray-400">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button onClick={clearSelectedFile} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" aria-label="Remover arquivo">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="mx-4 mb-2">
                <p className="text-xs text-red-500">{uploadError}</p>
              </div>
            )}

            {/* Input Area (Teams style) */}
            <div className="bg-white border-t border-gray-200 p-3">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                {/* Attach button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                  title="Anexar arquivo"
                  disabled={uploading}
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="*/*" />

                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedFile ? 'Legenda (opcional)...' : 'Digite uma mensagem...'}
                    className="w-full px-4 py-2.5 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder-gray-400 text-gray-900"
                    disabled={uploading}
                  />
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  className="p-2.5 bg-indigo-600 text-white rounded-lg disabled:opacity-30 hover:bg-indigo-700 transition-colors flex-shrink-0"
                  aria-label="Enviar mensagem"
                >
                  {uploading ? (
                    <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}