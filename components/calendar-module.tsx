// components/calendar-module.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, Loader2, TrendingUp, Calendar as CalendarIcon, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'hearing' | 'deadline' | 'task';
  description?: string;
  userId: string;
}

function CalendarStats({ events }: { events: CalendarEvent[] }) {
  const stats = [
    { label: "Total de Eventos", value: events.length.toString(), icon: CalendarIcon, color: "text-blue-600", bg: "from-blue-50 to-blue-100", trend: "+5%" },
    { label: "Audiências", value: events.filter(e => e.type === 'hearing').length.toString(), icon: AlertCircle, color: "text-orange-600", bg: "from-orange-50 to-orange-100", trend: "+8%" },
    { label: "Reuniões", value: events.filter(e => e.type === 'meeting').length.toString(), icon: CheckCircle, color: "text-green-600", bg: "from-green-50 to-green-100", trend: "+12%" },
    { label: "Prazos", value: events.filter(e => e.type === 'deadline').length.toString(), icon: Clock, color: "text-red-600", bg: "from-red-50 to-red-100", trend: "+3%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;
        return (
          <Card key={index} className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-0 bg-white relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <StatIcon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CalendarModule() {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [flashToday, setFlashToday] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'task' as CalendarEvent['type'],
    start: new Date(),
    end: new Date(),
    description: ''
  });

  const { user, can } = useAuth();

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const tasks = await apiClient.getTasks();
      
      const mappedEvents: CalendarEvent[] = tasks.map((t: any) => {
        const dateStr = t.due_date ? String(t.due_date).split('T')[0] : null;
        const dateObj = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
        
        // Tenta inferir o tipo
        let type: 'deadline' | 'meeting' | 'hearing' | 'task' = 'task';
        const titleLower = t.title?.toLowerCase() || '';
        if (titleLower.includes('reunião') || titleLower.includes('reuniao')) type = 'meeting';
        else if (titleLower.includes('audiência') || titleLower.includes('audiencia')) type = 'hearing';

        return {
          id: t.id,
          title: t.title,
          start: dateObj,
          end: dateObj,
          type,
          description: t.description || '',
          userId: t.assigned_to || 'unassigned',
        };
      });

      // Filtra as tarefas para mostrar apenas as do usuário atual, a não ser que seja admin
      const visibleEvents = mappedEvents.filter(event => {
        if (user?.role === 'admin' || (can && can('tasks_view_all'))) return true;
        return event.userId === user?.id;
      });

      setEvents(visibleEvents);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Não foi possível carregar as tarefas na agenda", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, can]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    setNewEvent({ ...newEvent, start, end, title: '', description: '', type: 'meeting' });
    setModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const handleNavigate = (newDate: Date, view: string, action: string) => {
    setCurrentDate(newDate);
    if (action === 'TODAY') {
      setFlashToday(true);
      setTimeout(() => setFlashToday(false), 1500);
    }
  };

  const saveNewEvent = async () => {
    if (!newEvent.title) {
        toast({ title: "Erro", description: "O título do evento é obrigatório.", variant: "destructive" });
        return;
    }
    
    try {
      const createdTask = await apiClient.createTask({
        title: newEvent.title,
        description: newEvent.description,
        due_date: newEvent.start.toISOString(),
        status: 'Em Andamento',
        priority: 'Média',
        assigned_to: user?.id,
      });
      
      const eventToSave: CalendarEvent = {
          ...newEvent,
          id: createdTask.id,
          userId: user?.id || 'unassigned',
      };
      setEvents([...events, eventToSave]);
      toast({ title: "Sucesso!", description: "Evento criado e sincronizado com as tarefas." });
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Não foi possível criar o evento.", variant: "destructive" });
    }
  };

  const deleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await apiClient.deleteTask(String(selectedEvent.id));
      setEvents(events.filter(e => e.id !== selectedEvent.id));
      toast({ title: "Sucesso!", description: "Evento excluído." });
      setDetailsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Não foi possível excluir o evento.", variant: "destructive" });
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const style = {
      backgroundColor: '#3b82f6',
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block'
    };
    if (event.type === 'deadline') style.backgroundColor = '#ef4444';
    if (event.type === 'hearing') style.backgroundColor = '#f97316';
    if (event.type === 'meeting') style.backgroundColor = '#16a34a';
    if (event.type === 'task') style.backgroundColor = '#8b5cf6'; // Roxo para tarefa
    return { style };
  };

  const dayPropGetter = (date: Date) => {
    if (flashToday && moment(date).isSame(moment(), 'day')) {
      return {
        style: {
          backgroundColor: '#bbf7d0', // green-200
          transition: 'background-color 0.3s ease-in-out',
        }
      };
    }
    return {};
  };

  return (
    <div className="space-y-6">
      <div className="relative bg-gradient-to-br from-rose-900 via-red-800 to-rose-900 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-10"></div>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-bold mb-3">Agenda do Escritório</h2>
            <p className="text-rose-100 text-xl">Visualize e gerencie os compromissos de toda a equipe.</p>
          </div>
          <Button onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })} className="bg-white text-rose-900 hover:bg-rose-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Novo Evento
          </Button>
        </div>
      </div>

      <CalendarStats events={events} />

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500 mx-auto"/>
                <p className="text-slate-600 font-medium">Carregando agenda...</p>
              </div>
            </div>
          ) : (
            <BigCalendar
              localizer={localizer}
              events={events}
              date={currentDate}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              selectable
              views={['month']}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onNavigate={handleNavigate}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Agenda",
                  date: "Data",
                  time: "Hora",
                  event: "Evento",
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Adicionar Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-700 font-semibold">Título *</Label>
              <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="bg-white border-2 border-slate-200 rounded-xl" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold">Tipo</Label>
              <Select value={newEvent.type} onValueChange={(v: any) => setNewEvent({ ...newEvent, type: v })}>
                <SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Tarefa</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="hearing">Audiência</SelectItem>
                  <SelectItem value="deadline">Prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 font-semibold">Descrição</Label>
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="bg-white border-2 border-slate-200 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-2 border-slate-200 rounded-xl">Cancelar</Button>
            <Button onClick={saveNewEvent} className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-lg rounded-xl">Salvar Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDetailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-slate-700 font-semibold">Título</Label>
                <p className="text-slate-900 mt-1">{selectedEvent.title}</p>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Tipo</Label>
                <Badge className={`mt-2 ${
                  selectedEvent.type === 'meeting' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  selectedEvent.type === 'hearing' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                  selectedEvent.type === 'task' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                  'bg-gradient-to-r from-red-500 to-red-600'
                } text-white border-0 shadow-lg`}>
                  {selectedEvent.type === 'meeting' ? 'Reunião' : selectedEvent.type === 'hearing' ? 'Audiência' : selectedEvent.type === 'task' ? 'Tarefa' : 'Prazo'}
                </Badge>
              </div>
              {selectedEvent.description && (
                <div>
                  <Label className="text-slate-700 font-semibold">Descrição</Label>
                  <p className="text-slate-900 mt-1">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
            <Button variant="ghost" onClick={deleteEvent} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)} className="border-2 border-slate-200 rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}