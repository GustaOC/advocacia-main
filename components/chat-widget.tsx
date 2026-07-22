'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from "@/hooks/use-toast";

const CHAT_BUCKET = 'chat-files';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Helper para formatar tamanho de arquivo
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Helper para determinar ícone SVG com base no tipo de arquivo
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

export function ChatWidget() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPerUser, setUnreadPerUser] = useState<Record<string, number>>({});
  
  // Estados para upload de arquivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<any>(null);
  const isOpenRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Mantém refs atualizadas para o listener do Realtime
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // 1. Carregar usuário atual e a lista de contatos (user_profiles)
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      setCurrentUser(session.user);

      // Busca todos os usuários do sistema, exceto o usuário logado
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, avatar_url')
        .neq('id', session.user.id);
        
      if (profiles) setUsers(profiles);
    };

    initChat();
  }, []);

  // 2. Listener global para mensagens e contagem de não lidas
  useEffect(() => {
    if (!currentUser) return;

    // Busca contagem inicial de não lidas
    const fetchUnreadCount = async () => {
      const { data, count } = await supabase
        .from('chat_messages')
        .select('sender_id', { count: 'exact' })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
      
      if (count !== null) {
        setUnreadCount(count);
      }

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((msg) => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });
        setUnreadPerUser(counts);
      }
    };
    
    fetchUnreadCount();

    // Inicia a escuta (Realtime) de novas mensagens globalmente
    const channel = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new;
          const currentActiveChat = activeChatRef.current;
          const currentIsOpen = isOpenRef.current;

          // Se a mensagem for para mim
          if (newMsg.receiver_id === currentUser.id) {
            if (currentIsOpen && currentActiveChat?.id === newMsg.sender_id) {
              // Chat está aberto: exibe e marca como lida
              setMessages((prev) => {
                if (!prev.find(m => m.id === newMsg.id)) {
                  return [...prev, newMsg];
                }
                return prev;
              });
              
              supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then(({ error }) => {
                  if (error) console.error("Erro ao marcar como lida:", error);
                });
              // Chat fechado ou outra conversa aberta: exibe toast e incrementa a bolinha
              
              // Busca o nome do remetente
              supabase.from('users').select('name, email').eq('id', newMsg.sender_id).single().then(({ data: sender }) => {
                const senderName = sender?.name || sender?.email || 'Novo remetente';
                toast({
                  title: `Nova mensagem de ${senderName}`,
                  description: newMsg.content || 'Enviou um arquivo'
                });
              });

              setUnreadCount((prev) => prev + 1);
              setUnreadPerUser((prev) => ({
                ...prev,
                [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
              }));
            }
          }

          // Se fui eu que enviei (atualizar a tela do chat se estiver aberto em outra aba/mesma janela)
          if (newMsg.sender_id === currentUser.id) {
            if (currentIsOpen && currentActiveChat?.id === newMsg.receiver_id) {
              setMessages((prev) => {
                if (!prev.find(m => m.id === newMsg.id)) {
                  return [...prev, newMsg];
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, supabase]);

  // 3. Carregar histórico quando abrir um chat específico
  useEffect(() => {
    if (!currentUser || !activeChat) return;

    // Busca o histórico da conversa
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        
        // Marca como lidas as mensagens recebidas neste chat
        const unreadIds = data.filter(m => m.receiver_id === currentUser.id && !m.is_read).map(m => m.id);
        
        if (unreadIds.length > 0) {
          const { error } = await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
            
          if (error) console.error("Erro ao atualizar mensagens para lidas:", error);

          setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
          setUnreadPerUser(prev => ({ ...prev, [activeChat.id]: 0 }));
        }
      }
    };
    
    fetchMessages();
  }, [currentUser, activeChat, supabase]);

  // Descer a barra de rolagem sempre que chegar nova mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler para seleção de arquivo
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

  // Remove o arquivo selecionado
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload do arquivo para o Supabase Storage
  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${currentUser.id}/${timestamp}_${safeName}`;

    const { error } = await supabase.storage
      .from(CHAT_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Erro no upload:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(CHAT_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type || 'application/octet-stream',
    };
  };

  // 3. Função de enviar mensagem (agora com suporte a arquivos)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentUser || !activeChat) return;
    if (uploading) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    let fileData: { url: string; name: string; type: string } | null = null;

    // Se tem arquivo selecionado, faz upload primeiro
    if (selectedFile) {
      setUploading(true);
      setUploadError(null);

      fileData = await uploadFile(selectedFile);

      if (!fileData) {
        setUploadError('Falha ao enviar arquivo. Tente novamente.');
        setUploading(false);
        return;
      }

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

  // Renderiza o conteúdo de arquivo na mensagem
  const renderFileContent = (msg: any, isMe: boolean) => {
    if (!msg.file_url) return null;

    const fileType = msg.file_type || '';
    const fileName = msg.file_name || 'arquivo';

    // Imagens — exibe thumbnail
    if (fileType.startsWith('image/')) {
      return (
        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1">
          <img
            src={msg.file_url}
            alt={fileName}
            className="max-w-full max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxWidth: '200px' }}
            loading="lazy"
          />
        </a>
      );
    }

    // Vídeos — player inline
    if (fileType.startsWith('video/')) {
      return (
        <video
          src={msg.file_url}
          controls
          className="max-w-full max-h-48 rounded-lg mt-1"
          style={{ maxWidth: '220px' }}
          preload="metadata"
        />
      );
    }

    // Áudio — player inline
    if (fileType.startsWith('audio/')) {
      return (
        <audio src={msg.file_url} controls className="mt-1 w-full" style={{ maxWidth: '220px' }} preload="metadata" />
      );
    }

    // Outros arquivos — card com download
    return (
      <a
        href={msg.file_url}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-lg transition-colors ${
          isMe
            ? 'bg-blue-700/40 hover:bg-blue-700/60 text-blue-100'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        style={{ maxWidth: '220px' }}
      >
        <span className="text-lg flex-shrink-0">{getFileIcon(fileType)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{fileName}</p>
          <p className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
            Clique para baixar
          </p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    );
  };

  if (!currentUser) return null; // Esconde o chat se não estiver logado

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botão para abrir/fechar o Chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Janela do Chat */}
      {isOpen && (
        <div className="bg-white border rounded-lg shadow-2xl w-80 h-[28rem] flex flex-col overflow-hidden">
          {/* Header do Chat */}
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {activeChat && (
                <button onClick={() => { setActiveChat(null); clearSelectedFile(); }} className="hover:bg-blue-700 p-1 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <h3 className="font-semibold">{activeChat ? activeChat.name : 'Chat da Equipe'}</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
               <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Lista de Contatos */}
          {!activeChat ? (
            <div className="flex-1 overflow-y-auto p-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setActiveChat(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 overflow-hidden">
                    {user.avatar_url ? <img src={user.avatar_url} alt={user.name} /> : user.name?.charAt(0) || 'U'}
                  </div>
                  <span className="font-medium text-gray-800 text-sm truncate flex-1">{user.name || 'Usuário Sem Nome'}</span>
                  {(unreadPerUser[user.id] || 0) > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {(unreadPerUser[user.id] || 0) > 99 ? '99+' : unreadPerUser[user.id]}
                    </span>
                  )}
                </button>
              ))}
              {users.length === 0 && <p className="text-center text-sm text-gray-500 mt-10">Nenhum usuário encontrado.</p>}
            </div>
          ) : (
            /* Área de Mensagens */
            <>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2 max-w-[85%] rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm'}`}>
                        {/* Texto da mensagem (se houver e não for apenas o nome do arquivo) */}
                        {msg.content && msg.content !== msg.file_name && (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        {/* Conteúdo do arquivo */}
                        {renderFileContent(msg, isMe)}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Preview do arquivo selecionado */}
              {selectedFile && (
                <div className="px-3 pt-2 bg-white border-t">
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-lg flex-shrink-0">{getFileIcon(selectedFile.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={clearSelectedFile}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remover arquivo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Erro de upload */}
              {uploadError && (
                <div className="px-3 pt-1 bg-white">
                  <p className="text-[11px] text-red-500">{uploadError}</p>
                </div>
              )}

              {/* Input de Mensagem + Botão de Anexar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2 items-center">
                {/* Botão de anexar arquivo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0 p-1"
                  title="Enviar arquivo"
                  disabled={uploading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="*/*"
                />

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedFile ? 'Legenda (opcional)...' : 'Digite sua mensagem...'}
                  className="flex-1 bg-gray-100 px-3 py-2 rounded-full text-sm outline-none focus:ring-1 focus:ring-blue-500 text-black"
                  disabled={uploading}
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  className="bg-blue-600 text-white p-2 rounded-full disabled:opacity-50 hover:bg-blue-700 flex-shrink-0 relative"
                >
                  {uploading ? (
                    <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}