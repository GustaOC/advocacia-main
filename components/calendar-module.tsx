/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar as BigCalendar, momentLocalizer, type CalendarProps, type SlotInfo, type View } from 'react-big-calendar';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Menu,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, type Task } from '@/lib/api-client';
import type { CalendarEventMetadata, CalendarEventType } from '@/lib/calendar-event-metadata';
import {
  combineDateAndTimePtBr,
  formatDatePtBr,
  formatIsoDate,
  formatTime24,
  maskDatePtBr,
  maskTime24,
  parseDatePtBr,
} from '@/lib/calendar-date';
import styles from './calendar-module.module.css';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

interface Employee {
  id: string;
  name?: string;
  email?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: CalendarEventType;
  description: string;
  userId: string;
  userName?: string;
  source: 'task' | 'publication';
}

interface EventForm {
  title: string;
  type: CalendarEventType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  description: string;
  assignedTo: string;
}

const DraggableCalendar = withDragAndDrop<CalendarEvent>(
  BigCalendar as React.ComponentType<CalendarProps<CalendarEvent>>,
);

const EVENT_COLORS: Record<CalendarEventType, string> = {
  task: '#7986cb',
  meeting: '#0b8043',
  hearing: '#f4511e',
  deadline: '#d50000',
};

const EVENT_LABELS: Record<CalendarEventType, string> = {
  task: 'Tarefa',
  meeting: 'Reunião',
  hearing: 'Audiência',
  deadline: 'Prazo',
};

const VIEW_LABELS: Record<View, string> = {
  month: 'Mês',
  week: 'Semana',
  work_week: 'Semana útil',
  day: 'Dia',
  agenda: 'Programação',
};

function roundToNextHalfHour(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  rounded.setMinutes(minutes < 30 ? 30 : 60);
  return rounded;
}

function inferType(title?: string): CalendarEventType {
  const normalized = (title || '').toLocaleLowerCase('pt-BR');
  if (normalized.includes('reunião') || normalized.includes('reuniao')) return 'meeting';
  if (normalized.includes('audiência') || normalized.includes('audiencia')) return 'hearing';
  if (normalized.includes('prazo')) return 'deadline';
  return 'task';
}

function taskToEvent(task: Task): CalendarEvent {
  const metadata = task.calendar_metadata;
  if (metadata) {
    return {
      id: String(task.id),
      title: task.title,
      start: new Date(metadata.start),
      end: new Date(metadata.end),
      allDay: metadata.allDay,
      type: metadata.type,
      description: task.description || '',
      userId: task.assigned_to || 'unassigned',
      userName: task.assigned_user?.name,
      source: 'task',
    };
  }

  const date = task.due_date ? new Date(`${String(task.due_date).split('T')[0]}T00:00:00`) : new Date();
  const end = new Date(date);
  end.setHours(23, 59, 0, 0);
  return {
    id: String(task.id),
    title: task.title,
    start: date,
    end,
    allDay: true,
    type: inferType(task.title),
    description: task.description || '',
    userId: task.assigned_to || 'unassigned',
    userName: task.assigned_user?.name,
    source: 'task',
  };
}

function buildMetadata(event: Pick<CalendarEvent, 'type' | 'start' | 'end' | 'allDay'>): CalendarEventMetadata {
  return {
    version: 1,
    type: event.type,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: event.allDay,
  };
}

function emptyForm(start: Date, end: Date, assignedTo: string, allDay = false): EventForm {
  return {
    title: '',
    type: 'meeting',
    startDate: formatDatePtBr(start),
    startTime: formatTime24(start),
    endDate: formatDatePtBr(end),
    endTime: formatTime24(end),
    allDay,
    description: '',
    assignedTo,
  };
}

export function CalendarModule() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jumpDate, setJumpDate] = useState(formatDatePtBr(new Date()));
  const [view, setView] = useState<View>('week');
  const [search, setSearch] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<Record<CalendarEventType, boolean>>({
    task: true,
    meeting: true,
    hearing: true,
    deadline: true,
  });
  const now = roundToNextHalfHour(new Date());
  const [form, setForm] = useState<EventForm>(emptyForm(now, moment(now).add(1, 'hour').toDate(), user?.id || ''));

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasks, publications, employeeList] = await Promise.all([
        apiClient.getTasks(),
        apiClient.getPublications(),
        apiClient.getEmployees().catch(() => []),
      ]);

      setEmployees(employeeList || []);
      const activeTasks = tasks.filter((task) => {
        const title = task.title?.toLocaleLowerCase('pt-BR') || '';
        const linkedPublication = title.includes('publicação') || title.includes('publicacao');
        return !(linkedPublication && ['Concluída', 'Cancelada', 'Transferido'].includes(task.status));
      });

      const taskEvents = activeTasks.map(taskToEvent);
      const publicationEvents: CalendarEvent[] = publications
        .filter((publication: any) => publication.status === 'Audiência')
        .map((publication: any) => {
          const rawDate = publication.due_date || publication.publication_date;
          const start = rawDate ? new Date(`${String(rawDate).split('T')[0]}T00:00:00`) : new Date();
          const end = new Date(start);
          end.setHours(23, 59, 0, 0);
          return {
            id: `pub-${publication.id}`,
            title: `Audiência: ${publication.title}`,
            start,
            end,
            allDay: true,
            type: 'hearing',
            description: publication.description || '',
            userId: publication.assigned_to || 'unassigned',
            userName: publication.assigned_user?.name,
            source: 'publication',
          };
        });

      const allowed = [...taskEvents, ...publicationEvents].filter((event) => {
        if (user?.role === 'admin') return true;
        return event.userId === user?.id;
      });
      setEvents(allowed);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a agenda.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.id, user?.role]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!form.assignedTo && user?.id) setForm((current) => ({ ...current, assignedTo: user.id }));
  }, [user?.id]);

  useEffect(() => {
    setJumpDate(formatDatePtBr(currentDate));
  }, [currentDate]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return events.filter((event) => visibleTypes[event.type]
      && (!query || `${event.title} ${event.description}`.toLocaleLowerCase('pt-BR').includes(query)));
  }, [events, search, visibleTypes]);

  const openNewEvent = useCallback((start = roundToNextHalfHour(new Date()), end?: Date, allDay = false) => {
    const resolvedEnd = end || moment(start).add(1, 'hour').toDate();
    const displayEnd = allDay && resolvedEnd > start ? new Date(resolvedEnd.getTime() - 1) : resolvedEnd;
    setSelectedEvent(null);
    setForm(emptyForm(start, displayEnd, user?.id || '', allDay));
    setIsFormOpen(true);
  }, [user?.id]);

  const handleSelectSlot = (slot: SlotInfo) => {
    openNewEvent(slot.start, slot.end, view === 'month');
  };

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setForm({
      title: event.title,
      type: event.type,
      startDate: formatDatePtBr(event.start),
      startTime: formatTime24(event.start),
      endDate: formatDatePtBr(event.end),
      endTime: formatTime24(event.end),
      allDay: event.allDay,
      description: event.description,
      assignedTo: event.userId === 'unassigned' ? '' : event.userId,
    });
    setIsFormOpen(true);
  };

  const parseFormDates = () => {
    const start = combineDateAndTimePtBr(form.startDate, form.startTime, form.allDay);
    const end = combineDateAndTimePtBr(form.endDate, form.endTime, form.allDay, true);
    return { start, end };
  };

  const updateTask = async (id: string, updates: Record<string, unknown>) => {
    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Falha ao atualizar o evento.');
    }
    return response.json();
  };

  const saveEvent = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Título obrigatório', description: 'Informe um título para o evento.', variant: 'destructive' });
      return;
    }
    const { start, end } = parseFormDates();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast({ title: 'Data ou horário inválido', description: 'Use DD/MM/AAAA e horário de 00:00 a 23:59. O término deve ser posterior ao início.', variant: 'destructive' });
      return;
    }

    const calendarMetadata = buildMetadata({ type: form.type, start, end, allDay: form.allDay });
    setIsSaving(true);
    try {
      if (selectedEvent) {
        const updates: Record<string, unknown> = {
          title: form.title.trim(),
          description: form.description,
          due_date: formatIsoDate(start),
          calendar_metadata: calendarMetadata,
        };
        if (form.assignedTo !== selectedEvent.userId) updates.assigned_to = form.assignedTo || null;
        await updateTask(selectedEvent.id, updates);
        setEvents((current) => current.map((event) => event.id === selectedEvent.id ? {
          ...event,
          title: form.title.trim(),
          type: form.type,
          description: form.description,
          start,
          end,
          allDay: form.allDay,
          userId: form.assignedTo || 'unassigned',
          userName: employees.find((employee) => employee.id === form.assignedTo)?.name,
        } : event));
        toast({ title: 'Evento atualizado', description: 'As alterações de data e horário foram salvas.' });
      } else {
        const createdTask = await apiClient.createTask({
          title: form.title.trim(),
          description: form.description,
          due_date: formatIsoDate(start),
          status: 'Pendente',
          priority: 'Média',
          assigned_to: form.assignedTo || user?.id || null,
          calendar_metadata: calendarMetadata,
        });
        setEvents((current) => [...current, taskToEvent(createdTask)]);
        toast({ title: 'Evento criado', description: 'O compromisso foi adicionado à agenda.' });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível salvar o evento.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!selectedEvent || selectedEvent.source !== 'task') return;
    setIsSaving(true);
    try {
      await apiClient.deleteTask(selectedEvent.id);
      setEvents((current) => current.filter((event) => event.id !== selectedEvent.id));
      setIsFormOpen(false);
      toast({ title: 'Evento excluído', description: 'O compromisso foi removido da agenda.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o evento.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const moveOrResizeEvent = async ({ event, start, end, isAllDay }: EventInteractionArgs<CalendarEvent>) => {
    if (event.source !== 'task') {
      toast({ title: 'Audiência vinculada', description: 'Altere esta data na aba Publicações.', variant: 'destructive' });
      return;
    }
    const nextStart = new Date(start);
    const nextEnd = new Date(end);
    const updated = { ...event, start: nextStart, end: nextEnd, allDay: isAllDay ?? event.allDay };
    setEvents((current) => current.map((item) => item.id === event.id ? updated : item));
    try {
      await updateTask(event.id, {
        due_date: formatIsoDate(nextStart),
        calendar_metadata: buildMetadata(updated),
      });
    } catch (error) {
      console.error(error);
      await fetchEvents();
      toast({ title: 'Não foi possível mover', description: 'A alteração foi desfeita.', variant: 'destructive' });
    }
  };

  const navigate = (direction: -1 | 1) => {
    const unit = view === 'day' ? 'day' : view === 'week' || view === 'work_week' ? 'week' : 'month';
    setCurrentDate(moment(currentDate).add(direction, unit).toDate());
  };

  const calendarTitle = useMemo(() => {
    if (view === 'day') return moment(currentDate).format('D [de] MMMM [de] YYYY');
    if (view === 'week' || view === 'work_week') {
      const start = moment(currentDate).startOf('week');
      const end = moment(currentDate).endOf('week');
      return start.month() === end.month()
        ? `${start.format('D')} – ${end.format('D [de] MMMM [de] YYYY')}`
        : `${start.format('D [de] MMM')} – ${end.format('D [de] MMM [de] YYYY')}`;
    }
    return moment(currentDate).format('MMMM [de] YYYY');
  }, [currentDate, view]);

  const selectedIsReadOnly = selectedEvent?.source === 'publication';

  return (
    <div className={styles.googleCalendar}>
      <header className={styles.topbar}>
        <div className={styles.branding}>
          <Menu className="h-5 w-5 text-slate-500" />
          <div className={styles.calendarLogo}><CalendarDays className="h-5 w-5" /></div>
          <span>Agenda</span>
        </div>

        <div className={styles.navigation}>
          <Button variant="outline" className={styles.todayButton} onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" aria-label="Período anterior" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" aria-label="Próximo período" onClick={() => navigate(1)}><ChevronRight className="h-5 w-5" /></Button>
          <h1>{calendarTitle}</h1>
        </div>

        <div className={styles.topActions}>
          <div className={styles.searchBox}>
            <Search className="h-4 w-4" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar" />
          </div>
          <Select value={view} onValueChange={(value) => setView(value as View)}>
            <SelectTrigger className={styles.viewSelect}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['day', 'week', 'month', 'agenda'] as View[]).map((item) => (
                <SelectItem key={item} value={item}>{VIEW_LABELS[item]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <Button className={styles.createButton} onClick={() => openNewEvent()}>
            <Plus className="h-5 w-5" /> Criar
          </Button>

          <div className={styles.miniDate}>
            <Label htmlFor="calendar-date">Ir para uma data</Label>
            <Input
              id="calendar-date"
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="DD/MM/AAAA"
              aria-label="Data no formato dia, mês e ano"
              value={jumpDate}
              onChange={(event) => {
                const value = maskDatePtBr(event.target.value);
                setJumpDate(value);
                const parsed = parseDatePtBr(value);
                if (parsed) {
                  parsed.setHours(12, 0, 0, 0);
                  setCurrentDate(parsed);
                }
              }}
            />
          </div>

          <div className={styles.calendarsList}>
            <h2>Minhas agendas</h2>
            {(Object.keys(EVENT_LABELS) as CalendarEventType[]).map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={visibleTypes[type]}
                  onChange={(event) => setVisibleTypes((current) => ({ ...current, [type]: event.target.checked }))}
                />
                <span style={{ backgroundColor: EVENT_COLORS[type] }} />
                {EVENT_LABELS[type]}
              </label>
            ))}
          </div>

          <div className={styles.sidebarHint}>
            <Clock3 className="h-4 w-4" />
            Arraste eventos para mudar o horário. Puxe a borda inferior para alterar a duração.
          </div>
        </aside>

        <main className={styles.calendarPanel}>
          {isLoading ? (
            <div className={styles.loading}>
              <Loader2 className="h-7 w-7 animate-spin" />
              <span>Carregando agenda...</span>
            </div>
          ) : (
            <DraggableCalendar
              localizer={localizer}
              events={filteredEvents}
              date={currentDate}
              view={view}
              onView={setView}
              onNavigate={setCurrentDate}
              startAccessor="start"
              endAccessor="end"
              allDayAccessor="allDay"
              titleAccessor="title"
              style={{ height: 760 }}
              toolbar={false}
              selectable
              resizable
              popup
              step={30}
              timeslots={2}
              scrollToTime={new Date(1970, 0, 1, 8, 0)}
              views={['month', 'week', 'day', 'agenda']}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={openEvent}
              onEventDrop={moveOrResizeEvent}
              onEventResize={moveOrResizeEvent}
              draggableAccessor={(event) => event.source === 'task'}
              resizableAccessor={(event) => event.source === 'task' && !event.allDay}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: EVENT_COLORS[event.type],
                  borderColor: EVENT_COLORS[event.type],
                  color: '#fff',
                },
              })}
              dayPropGetter={(date) => moment(date).isSame(moment(), 'day') ? { className: styles.todayCell } : {}}
              formats={{
                dayFormat: (date) => moment(date).format('ddd D'),
                weekdayFormat: (date) => moment(date).format('ddd'),
                timeGutterFormat: (date) => moment(date).format('HH:mm'),
                agendaTimeFormat: (date) => moment(date).format('HH:mm'),
                agendaDateFormat: (date) => moment(date).format('ddd, D [de] MMM'),
              }}
              messages={{
                next: 'Próximo', previous: 'Anterior', yesterday: 'Ontem', tomorrow: 'Amanhã',
                today: 'Hoje', month: 'Mês', week: 'Semana', work_week: 'Semana útil',
                day: 'Dia', agenda: 'Programação', date: 'Data', time: 'Hora', event: 'Evento',
                allDay: 'Dia inteiro',
                noEventsInRange: 'Nenhum evento neste período.', showMore: (count) => `+${count} mais`,
              }}
            />
          )}
        </main>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={styles.eventDialog}>
          <DialogHeader>
            <DialogTitle>{selectedEvent ? (selectedIsReadOnly ? 'Detalhes da audiência' : 'Editar evento') : 'Novo evento'}</DialogTitle>
          </DialogHeader>

          <div className={styles.formBody}>
            {selectedIsReadOnly && (
              <div className={styles.readOnlyNotice}>Este evento veio de Publicações. Para alterar a data, edite a publicação vinculada.</div>
            )}
            <Input
              className={styles.titleInput}
              value={form.title}
              disabled={selectedIsReadOnly}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Adicionar título"
              autoFocus={!selectedEvent}
            />

            <div className={styles.formRow}>
              <div className={styles.rowIcon}><Clock3 className="h-5 w-5" /></div>
              <div className={styles.dateGrid}>
                <div className={styles.dateLine}>
                  <Label>Início</Label>
                  <Input type="text" inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" aria-label="Data de início" value={form.startDate} disabled={selectedIsReadOnly} onChange={(event) => setForm((current) => ({ ...current, startDate: maskDatePtBr(event.target.value) }))} />
                  {!form.allDay && <Input type="text" inputMode="numeric" maxLength={5} placeholder="HH:MM" aria-label="Horário de início em 24 horas" value={form.startTime} disabled={selectedIsReadOnly} onChange={(event) => setForm((current) => ({ ...current, startTime: maskTime24(event.target.value) }))} />}
                </div>
                <div className={styles.dateLine}>
                  <Label>Término</Label>
                  <Input type="text" inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" aria-label="Data de término" value={form.endDate} disabled={selectedIsReadOnly} onChange={(event) => setForm((current) => ({ ...current, endDate: maskDatePtBr(event.target.value) }))} />
                  {!form.allDay && <Input type="text" inputMode="numeric" maxLength={5} placeholder="HH:MM" aria-label="Horário de término em 24 horas" value={form.endTime} disabled={selectedIsReadOnly} onChange={(event) => setForm((current) => ({ ...current, endTime: maskTime24(event.target.value) }))} />}
                </div>
                <label className={styles.allDayToggle}>
                  <input type="checkbox" checked={form.allDay} disabled={selectedIsReadOnly} onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))} />
                  Dia inteiro
                </label>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.rowIcon}><CalendarDays className="h-5 w-5" /></div>
              <Select disabled={selectedIsReadOnly} value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as CalendarEventType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_LABELS) as CalendarEventType[]).map((type) => <SelectItem key={type} value={type}>{EVENT_LABELS[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.rowIcon}><UserRound className="h-5 w-5" /></div>
              <Select disabled={selectedIsReadOnly || user?.role !== 'admin'} value={form.assignedTo || user?.id || ''} onValueChange={(value) => setForm((current) => ({ ...current, assignedTo: value }))}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name || employee.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              value={form.description}
              disabled={selectedIsReadOnly}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Adicionar descrição"
              rows={4}
            />
          </div>

          <DialogFooter className={styles.dialogFooter}>
            {selectedEvent?.source === 'task' && (
              <Button type="button" variant="ghost" className={styles.deleteButton} disabled={isSaving} onClick={deleteEvent}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
            <div className={styles.footerActions}>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              {!selectedIsReadOnly && (
                <Button type="button" className={styles.saveButton} disabled={isSaving} onClick={saveEvent}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
