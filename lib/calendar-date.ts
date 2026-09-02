export function padCalendarPart(value: number) {
  return String(value).padStart(2, '0');
}

export function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${padCalendarPart(date.getMonth() + 1)}-${padCalendarPart(date.getDate())}`;
}

export function formatDatePtBr(date: Date) {
  return `${padCalendarPart(date.getDate())}/${padCalendarPart(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTime24(date: Date) {
  return `${padCalendarPart(date.getHours())}:${padCalendarPart(date.getMinutes())}`;
}

export function maskDatePtBr(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function maskTime24(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseDatePtBr(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function combineDateAndTimePtBr(dateValue: string, timeValue: string, allDay: boolean, end = false) {
  const date = parseDatePtBr(dateValue);
  if (!date) return new Date(Number.NaN);

  const time = allDay ? (end ? '23:59' : '00:00') : timeValue;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return new Date(Number.NaN);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return new Date(Number.NaN);

  date.setHours(hours, minutes, 0, 0);
  return date;
}
