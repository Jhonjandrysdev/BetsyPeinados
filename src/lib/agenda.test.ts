import { describe, expect, it } from 'vitest';
import { accionCalendario, fueraDeHorario, ventanaDelDia } from './agenda';
import type { BlockedDate, BusinessHour } from './types';

// Lunes a sábado de 9:00 a 18:00; domingo cerrado. 2026-12-01 es martes; 2026-12-06 es domingo.
const horarios: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, enabled: weekday !== 0, open_time: '09:00:00', close_time: '18:00:00' }));
const bloqueos: BlockedDate[] = [{ id: 'b1', day: '2026-12-08', reason: 'Festivo' }];
const revisar = (fecha: string, hora: string, duracionMin = 90) => fueraDeHorario({ fecha, hora, duracionMin, horarios, bloqueos });

describe('reagendar: la nueva hora debe caer en el horario de atención', () => {
  it('dentro del horario no hay problema', () => {
    expect(revisar('2026-12-01', '09:00')).toBeNull();
    expect(revisar('2026-12-01', '16:30')).toBeNull(); // termina justo a las 18:00
  });

  it('un día bloqueado se avisa con su motivo', () => {
    expect(revisar('2026-12-08', '10:00')).toMatch(/bloqueado.*Festivo/);
  });

  it('un día sin atención se avisa', () => {
    expect(revisar('2026-12-06', '10:00')).toMatch(/no atiendes/);
  });

  it('antes de abrir se avisa con el horario del día', () => {
    expect(revisar('2026-12-01', '08:30')).toMatch(/fuera de tu horario.*9:00.*a\. m\..*6:00.*p\. m\./);
  });

  it('si termina después de cerrar también se avisa', () => {
    expect(revisar('2026-12-01', '17:00')).toMatch(/fuera de tu horario/);
  });

  it('sin horario configurado para ese día cuenta como día sin atención', () => {
    expect(fueraDeHorario({ fecha: '2026-12-01', hora: '10:00', duracionMin: 60, horarios: [], bloqueos: [] })).toMatch(/no atiendes/);
  });
});

describe('ventana de atención de un día (la misma regla para la reserva web y para reagendar)', () => {
  it('día con horario: minutos de apertura y cierre', () => {
    expect(ventanaDelDia('2026-12-01', horarios, bloqueos)).toEqual({ abre: 540, cierra: 1080 });
  });

  it('día bloqueado o sin atención: null', () => {
    expect(ventanaDelDia('2026-12-08', horarios, bloqueos)).toBeNull();
    expect(ventanaDelDia('2026-12-06', horarios, bloqueos)).toBeNull();
  });
});

describe('qué hacer en Google Calendar al cambiar el estado de una cita', () => {
  it('confirmar el abono: confirma el evento si existe, o lo crea', () => {
    expect(accionCalendario({ antes: 'pendiente', despues: 'confirmada', tieneEvento: true })).toBe('confirmar');
    expect(accionCalendario({ antes: 'pendiente', despues: 'confirmada', tieneEvento: false })).toBe('crear');
  });

  it('reactivar una cita cancelada (p. ej. vencida sin abono) vuelve a crear su evento', () => {
    expect(accionCalendario({ antes: 'cancelada', despues: 'confirmada', tieneEvento: false })).toBe('crear');
  });

  it('reactivar una cita cancelada que aún tiene evento lo confirma', () => {
    expect(accionCalendario({ antes: 'cancelada', despues: 'confirmada', tieneEvento: true })).toBe('confirmar');
  });

  it('cancelar borra el evento si existe', () => {
    expect(accionCalendario({ antes: 'confirmada', despues: 'cancelada', tieneEvento: true })).toBe('cancelar');
    expect(accionCalendario({ antes: 'confirmada', despues: 'cancelada', tieneEvento: false })).toBeNull();
  });

  it('reabrir una cita marcada como realizada no toca el calendario', () => {
    expect(accionCalendario({ antes: 'completada', despues: 'confirmada', tieneEvento: true })).toBeNull();
    expect(accionCalendario({ antes: 'completada', despues: 'confirmada', tieneEvento: false })).toBeNull();
  });

  it('marcar como realizada o repetir el mismo estado no toca el calendario', () => {
    expect(accionCalendario({ antes: 'confirmada', despues: 'completada', tieneEvento: true })).toBeNull();
    expect(accionCalendario({ antes: 'confirmada', despues: 'confirmada', tieneEvento: true })).toBeNull();
  });
});
