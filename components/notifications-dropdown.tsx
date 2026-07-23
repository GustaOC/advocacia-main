"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Bell, AlertTriangle, CheckCircle, FileText, Loader2, CheckCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { createClient } from "@/lib/supabase/client"


interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
  related_petition_id?: number;
  created_at: string;
}

interface NotificationsDropdownProps {
  onNavigate?: (tab: string) => void;
}

export function NotificationsDropdown({ onNavigate }: NotificationsDropdownProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const currentUserId = user?.id;

  useEffect(() => {
    if (!currentUserId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [notifRes, countRes] = await Promise.all([
          apiClient.getNotifications(currentUserId),
          apiClient.getUnreadNotificationCount(currentUserId)
        ]);

        setNotifications(notifRes.notifications || []);
        setUnreadCount(countRes.count || 0);

      } catch (error) {
        console.error("Error loading notification data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);

  }, [currentUserId, toast]);
  
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const channelParams: any = {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${currentUserId}`,
    };

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        channelParams,
        (payload) => {
          const novaNotificacao = payload.new as Notification;
          setNotifications(prev => {
            if (prev.find(n => n.id === novaNotificacao.id)) return prev;
            toast({ title: novaNotificacao.title, description: novaNotificacao.message });
            setUnreadCount(count => count + 1);
            return [novaNotificacao, ...prev];
          });
        }
      )
      .subscribe();

    // Polling de fallback (10 segundos) caso o Realtime não esteja ativado na tabela
    const interval = setInterval(async () => {
      const client = createClient();
      let query = client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
        .eq('user_id', currentUserId);

      const { data } = await query;
      if (data) {
        setNotifications(prev => {
          const newNotifs = data.filter(n => !prev.find(p => p.id === n.id));
          if (newNotifs.length > 0) {
            // Inverter para mostrar os mais antigos primeiro (dentre os novos)
            newNotifs.reverse().forEach(notif => {
              toast({ title: notif.title, description: notif.message });
            });
            setUnreadCount(count => count + newNotifs.filter(n => !n.is_read).length);
            return [...newNotifs.reverse(), ...prev];
          }
          return prev;
        });
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [currentUserId, toast, user?.role]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => {
          // Apenas reduz a contagem se a notificação era não-lida antes
          const wasUnread = !notifications.find(n => n.id === id)?.is_read;
          return wasUnread ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(`/api/notifications/read-all`, {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
    }
  };

  const handleNotificationClick = (e: any, notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (!onNavigate) return;

    const title = notification.title?.toLowerCase() || '';
    const msg = notification.message?.toLowerCase() || '';
    const type = notification.type?.toLowerCase() || '';

    if (type === 'financeiro' || title.includes('financeiro') || msg.includes('financeiro') || msg.includes('parcela') || msg.includes('acordo') || msg.includes('vencimento')) {
      if (onNavigate) onNavigate('financial');
    } else if (type === 'tarefa' || title.includes('tarefa') || msg.includes('tarefa')) {
      if (onNavigate) onNavigate('tasks');
    } else if (type === 'entidade' || title.includes('cliente') || msg.includes('cliente') || title.includes('entidade')) {
      if (onNavigate) onNavigate('entities');
    } else if (type === 'processo' || title.includes('processo') || msg.includes('processo') || title.includes('caso')) {
      if (onNavigate) onNavigate('cases');
    } else if (title.includes('petição') || title.includes('documento')) {
      if (onNavigate) onNavigate('petitions');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
        case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
        default: return <FileText className="h-4 w-4 text-brand" />;
    }
  };
  
  return (
    <DropdownMenu>
      <div className="relative inline-block">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Bell className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute -right-1 -top-1 z-50 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3 pb-2">
          <DropdownMenuLabel className="text-base p-0">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead} 
              className="h-7 px-2 text-xs text-brand hover:text-blue-800 hover:bg-blue-50"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
                <Bell className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                <p className="font-medium">Nenhuma notificação</p>
                <p className="text-sm">Você está em dia!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className={`p-4 cursor-pointer border-b last:border-b-0 transition-colors ${!notification.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                onSelect={(e) => handleNotificationClick(e, notification)}
              >
                <div className="flex items-start space-x-3 w-full">
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                        <p className={`text-sm ${!notification.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-xs mt-1 ${!notification.is_read ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                          {notification.message}
                        </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-brand rounded-full mt-1.5 flex-shrink-0" />
                    )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}