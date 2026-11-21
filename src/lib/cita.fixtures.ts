// Datos y almacén falso para probar el dominio de la cita sin Supabase.
import type { CitaStore } from './cita';
import type { Appointment } from './types';

/** Almacén falso en memoria: el dominio solo lo ve a través de CitaStore. */
export function fakeStore(rows: Appointment[]): CitaStore & { get(id: string): Appointment | undefined; borrados: string[] } {
  const m = new Map(rows.map((a) => [a.id, { ...a }]));
  const borrados: string[] = [];
  return {
    borrados,
    get: (id) => m.get(id),
    deleteReceipt: async (path) => {
      borrados.push(path);
    },
    getAppointment: async (id) => { const a = m.get(id); return a ? { ...a } : null; },
    updateAppointment: async (id, patch) => {
      const a = m.get(id);
      if (a) Object.assign(a, patch);
    },
    updateAppointmentIfReceipt: async (id, receiptPath, patch) => {
      const a = m.get(id);
      if (!a || a.receipt_path !== receiptPath) return false;
      Object.assign(a, patch);
      return true;
    },
  };
}

export const base: Appointment = {
  id: 'c1',
  service_id: 's1',
  service_name: 'Ondas',
  customer_name: 'Ana Pérez',
  customer_phone: '573001234567',
  customer_email: null,
  notes: '',
  starts_at: '2026-12-01T15:00:00.000Z',
  ends_at: '2026-12-01T16:30:00.000Z',
  status: 'pendiente',
  source: 'web',
  google_event_id: null,
  created_at: '2026-11-21T10:00:00.000Z',
  home_service: false,
  home_address: null,
  hair_length: 'medio',
  price: 80000,
  deposit: 40000,
  deposit_confirmed_at: null,
};
