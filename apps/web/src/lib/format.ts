const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats API money strings ("12.50") or numbers as USD. */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? currency.format(n) : '—';
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

/** 125 → "2h 5m" */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Monday 00:00 local time of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** yyyy-mm-dd in local time, for URLs and date inputs. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Value for <input type="datetime-local"> in local time. */
export function toDateTimeLocal(value: string | Date): string {
  const d = new Date(value);
  return `${toDateParam(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
