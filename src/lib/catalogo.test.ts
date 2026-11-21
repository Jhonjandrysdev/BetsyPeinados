import { describe, expect, it } from 'vitest';
import { faqDelHome, horarioDeHoy, opcionesDeOcasion, serviciosDelHome } from './catalogo';
import type { EventPackage } from './defaults';
import type { Service } from './types';

const sv = (slug: string, name: string, price_from: number | null = 70000): Service => ({
  id: slug,
  slug,
  name,
  description: '',
  category: '',
  duration_min: 60,
  price_from,
  active: true,
  featured: false,
  sort: 0,
});
const pk = (p: Partial<EventPackage> & Pick<EventPackage, 'slug' | 'name'>): EventPackage => ({ title: '', pitch: '', price: null, includes: [], ...p });

describe('serviciosDelHome', () => {
  it('etiqueta cada servicio con los paquetes que lo usan y enlaza a su reserva', () => {
    const servicios = [sv('ondas', 'Ondas'), sv('peinados-sociales', 'Peinados sociales'), sv('quinceaneras', 'Quinceañeras')];
    const paquetes = [
      pk({ slug: 'grados', name: 'Grado', serviceSlug: 'peinados-sociales' }),
      pk({ slug: 'quince', name: 'Quinceañera', serviceSlug: 'quinceaneras' }),
      pk({ slug: 'grupos', name: 'Grupo a domicilio' }),
    ];

    expect(serviciosDelHome(servicios, paquetes).map((x) => [x.service.slug, x.etiquetas, x.href])).toEqual([
      ['ondas', [], '/reservar?servicio=ondas'],
      ['peinados-sociales', ['Grado'], '/reservar?servicio=peinados-sociales'],
      ['quinceaneras', ['Quinceañera'], '/reservar?servicio=quinceaneras'],
    ]);
  });
});

describe('opcionesDeOcasion', () => {
  const servicios = [
    { ...sv('quinceaneras', 'Quinceañeras', 75000), duration_min: 120 },
    sv('novias', 'Novias', null),
    { ...sv('ninas', 'Peinados para niñas', 60000), description: 'Trenzas y rizos.', duration_min: 45 },
  ];
  const paquetes = [
    pk({ slug: 'quince', name: 'Quinceañera', price: 75000, from: true, includes: ['Corona'], serviceSlug: 'quinceaneras' }),
    pk({ slug: 'novias', name: 'Novia', price: null, serviceSlug: 'novias' }),
    pk({ slug: 'grupos', name: 'Grupo a domicilio', price: 70000, unit: 'por persona' }),
  ];
  const opciones = opcionesDeOcasion(servicios, paquetes);
  const de = (key: string) => opciones.find((o) => o.key === key)!;

  it('primero los paquetes y luego los servicios que ningún paquete usa', () => {
    expect(opciones.map((o) => [o.key, o.label])).toEqual([
      ['quince', 'Quinceañera'],
      ['novias', 'Novia'],
      ['grupos', 'Grupo a domicilio'],
      ['ninas', 'Peinados para niñas'],
    ]);
  });

  it('un paquete con precio y servicio se reserva, con abono del 50 % redondeado a mil', () => {
    expect(de('quince')).toMatchObject({ price: 75000, from: true, deposit: 38000, includes: ['Corona'], durationMin: 120, accion: { tipo: 'reservar', href: '/reservar?servicio=quinceaneras' } });
  });

  it('sin precio se cotiza por WhatsApp y no tiene abono', () => {
    expect(de('novias')).toMatchObject({ price: null, deposit: null, accion: { tipo: 'cotizar' } });
  });

  it('el grupo, sin servicio asociado, se cotiza por WhatsApp y se cobra por persona', () => {
    expect(de('grupos')).toMatchObject({ price: 70000, unit: 'por persona', deposit: 35000, accion: { tipo: 'cotizar' } });
  });

  it('un servicio suelto usa su descripción como inclusión y su precio desde', () => {
    expect(de('ninas')).toMatchObject({ price: 60000, from: true, includes: ['Trenzas y rizos.'], durationMin: 45, accion: { tipo: 'reservar', href: '/reservar?servicio=ninas' } });
  });
});

describe('horarioDeHoy', () => {
  const horario = [
    { weekday: 5, enabled: true, open_time: '08:00:00', close_time: '19:00:00' },
    { weekday: 6, enabled: false, open_time: '07:00', close_time: '19:00' },
  ];

  it('da el horario del día en Bogotá', () => {
    // Viernes 20 nov 2026, 10:00 en Bogotá.
    expect(horarioDeHoy(horario, new Date('2026-11-20T15:00:00Z'))).toBe('Hoy atiendo de 08:00 a 19:00');
  });

  it('a las 03:00 UTC del sábado en Bogotá todavía es viernes', () => {
    expect(horarioDeHoy(horario, new Date('2026-11-21T03:00:00Z'))).toBe('Hoy atiendo de 08:00 a 19:00');
  });

  it('un día deshabilitado no atiende', () => {
    // Sábado 21 nov 2026, 01:00 en Bogotá.
    expect(horarioDeHoy(horario, new Date('2026-11-21T06:00:00Z'))).toBe('Hoy no atiendo');
  });

  it('un día sin fila en el horario no atiende', () => {
    expect(horarioDeHoy([], new Date('2026-11-20T15:00:00Z'))).toBe('Hoy no atiendo');
  });
});

describe('faqDelHome', () => {
  it('quita la pregunta de precios (ya están en Servicios y precios) y conserva el orden', () => {
    const faq = [
      { q: '¿Cómo aparto mi cita?', a: '…' },
      { q: '¿Cuánto cuesta mi peinado?', a: '…' },
      { q: '¿Atiendes a domicilio?', a: '…' },
    ];
    expect(faqDelHome(faq).map((f) => f.q)).toEqual(['¿Cómo aparto mi cita?', '¿Atiendes a domicilio?']);
  });

  it('muestra como mucho cuatro preguntas', () => {
    const faq = Array.from({ length: 6 }, (_, i) => ({ q: `P${i}`, a: '' }));
    expect(faqDelHome(faq).map((f) => f.q)).toEqual(['P0', 'P1', 'P2', 'P3']);
  });
});
