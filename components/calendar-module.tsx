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
    { label: "Total de Eventos", value: events.length.toString(), icon: CalendarIcon, color: "text-brand", bg: "from-brand-light/50 to-brand-light/20", trend: "+5%" },
    { label: "Audiências", value: events.filter(e => e.type === 'hearing').length.toString(), icon: AlertCircle, color: "text-brand-sage", bg: "from-brand-sage/30 to-brand-sage/10", trend: "+8%" },
    { label: "Reuniões", value: events.filter(e => e.type === 'meeting').length.toString(), icon: CheckCircle, color: "text-brand", bg: "from-brand-beige/50 to-brand-beige/20", trend: "+12%" },
    { label: "Prazos", value: events.filter(e => e.type === 'deadline').length.toString(), icon: Clock, color: "text-brand", bg: "from-brand-gray/30 to-brand-gray/10", trend: "+3%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;
        return (
          <Card key={index} className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-serif text-brand-black">{stat.value}</p>
                  <div className="flex items-center space-x-1 pt-1">
                    <TrendingUp className="w-4 h-4 text-brand-sage" />
                    <span className="text-sm text-brand-sage font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                  <StatIcon className="w-5 h-5 text-brand" />
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
      const [tasks, publications] = await Promise.all([
        apiClient.getTasks(),
        apiClient.getPublications()
      ]);
      // Remove publicações concluídas ou canceladas da agenda
      const activeTasks = tasks.filter((t: any) => {
        const titleLower = t.title?.toLowerCase() || '';
        const isPublication = titleLower.includes('publicação') || titleLower.includes('publicacao');
        if (isPublication && (t.status === 'Concluída' || t.status === 'Cancelada' || t.status === 'Transferido')) {
          return false;
        }
        return true;
      });
      
      const mappedEvents: CalendarEvent[] = activeTasks.map((t: any) => {
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

      const hearingPubs = publications.filter((p: any) => p.status === 'Audiência');
      const mappedPubs: CalendarEvent[] = hearingPubs.map((p: any) => {
        const dateStr = p.due_date ? String(p.due_date).split('T')[0] : (p.publication_date ? String(p.publication_date).split('T')[0] : null);
        const dateObj = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();

        return {
          id: `pub-${p.id}`,
          title: `Audiência: ${p.title}`,
          start: dateObj,
          end: dateObj,
          type: 'hearing',
          description: p.description || '',
          userId: p.assigned_to || 'unassigned',
        };
      });

      const allEvents = [...mappedEvents, ...mappedPubs];

      // Filtra as tarefas e eventos para mostrar as do usuário atual ou todas se for admin
      const visibleEvents = allEvents.filter(event => {
        if (user?.role === 'admin') return true;
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
      <div className="flex justify-between items-end mb-8">
        <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm">
          <h2 className="text-3xl font-serif text-brand-black tracking-tight">Agenda Institucional</h2>
          <p className="text-brand-gray mt-2 font-medium">Acompanhe todos os seus prazos processuais, audiências e reuniões corporativas.</p>
        </div>
        <Button onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })} className="bg-brand text-white hover:bg-brand-dark shadow-sm rounded-none mb-6 px-6">
          <Plus className="mr-2 h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <CalendarStats events={events} />

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center bg-brand-black rounded-2xl">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-brand-sage mx-auto"/>
                <p className="text-brand-gray font-medium">Carregando agenda...</p>
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
              popup
              views={['month', 'day', 'agenda']}
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
              <Label className="text-brand font-semibold">Título *</Label>
              <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="bg-white border-2 border-brand-gray rounded-xl" />
            </div>
            <div>
              <Label className="text-brand font-semibold">Tipo</Label>
              <Select value={newEvent.type} onValueChange={(v: any) => setNewEvent({ ...newEvent, type: v })}>
                <SelectTrigger className="bg-white border-2 border-brand-gray rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Tarefa</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="hearing">Audiência</SelectItem>
                  <SelectItem value="deadline">Prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-brand font-semibold">Descrição</Label>
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="bg-white border-2 border-brand-gray rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-2 border-brand-gray rounded-xl">Cancelar</Button>
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
                <Label className="text-brand font-semibold">Título</Label>
                <p className="text-brand-black mt-1">{selectedEvent.title}</p>
              </div>
              <div>
                <Label className="text-brand font-semibold">Tipo</Label>
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
                  <Label className="text-brand font-semibold">Descrição</Label>
                  <p className="text-brand-black mt-1">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
            <Button variant="ghost" onClick={deleteEvent} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)} className="border-2 border-brand-gray rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}