import { beforeEach, describe, expect, it } from 'vitest';
import { createAvisos, type AvisoDeps, type RegistroAviso } from './aviso';
import { base } from './cita.fixtures';
import type { Appointment } from './types';

const AHORA = new Date('2026-11-22T15:00:00.000Z');
const confirmada: Appointment = { ...base, status: 'confirmada', deposit_confirmed_at: '2026-11-22T14:00:00.000Z' };

describe('envío de avisos por WhatsApp', () => {
  let enviados: Record<string, any>[];
  let registro: RegistroAviso[];
  let avisados: string[];
  let ultimoEntrante: string | null;
  let falla: string | null;
  let configurado: boolean;
  let topeAgotado: boolean;

  const deps = (): AvisoDeps => ({
    now: () => AHORA,
    configurado: () => configurado,
    topeAgotado: async () => topeAgotado,
    meta: {
      enviar: async (payload) => {
        if (falla) throw new Error(falla);
        enviados.push(payload);
        return `wamid.${enviados.length}`;
      },
    },
    ultimoEntrante: async () => ultimoEntrante,
    textoDeMensajes: async (_a, ev) => `Texto de Mensajes: ${ev}`,
    valores: async () => ({ nombre: 'Ana', servicio: 'Ondas', fecha: 'lunes 1 de diciembre', hora: '10:00 a. m.', abono: '$40.000', llave: '300', motivo: 'borroso' }),
    plantilla: { prefijo: 'betsy_', idioma: 'es_CO' },
    registrar: async (r) => registro.push(r),
    marcarAvisado: async (a, ev) => void avisados.push(`${a.id}:${ev}`),
  });
  const enviar = (a: Appointment, ev: Parameters<ReturnType<typeof createAvisos>['enviar']>[1], texto = '') => createAvisos(deps()).enviar(a, ev, texto);

  beforeEach(() => {
    enviados = [];
    registro = [];
    avisados = [];
    ultimoEntrante = null;
    falla = null;
    configurado = true;
    topeAgotado = false;
  });

  it('fuera de la ventana de 24 h envía la plantilla aprobada con sus datos', async () => {
    const r = await enviar(confirmada, 'abono');
    expect(r).toMatchObject({ ok: true, kind: 'plantilla' });
    expect(enviados[0]).toMatchObject({
      to: '573001234567',
      type: 'template',
      template: { name: 'betsy_abono', language: { code: 'es_CO' }, components: [{ type: 'body', parameters: [{ text: 'Ana' }, { text: 'Ondas' }, { text: 'lunes 1 de diciembre' }, { text: '10:00 a. m.' }] }] },
    });
    expect(registro[0]).toMatchObject({ status: 'enviado', kind: 'plantilla', wa_message_id: 'wamid.1', event: 'abono' });
    expect(registro[0].body).toContain('recibimos tu abono');
  });

  it('dentro de la ventana envía el texto de Mensajes (gratis)', async () => {
    ultimoEntrante = '2026-11-22T10:00:00.000Z';
    const r = await enviar(confirmada, 'abono');
    expect(r).toMatchObject({ ok: true, kind: 'texto' });
    expect(enviados[0]).toMatchObject({ type: 'text', text: { body: 'Texto de Mensajes: abono' } });
  });

  it('con la ventana vencida (más de 24 h) vuelve a la plantilla', async () => {
    ultimoEntrante = '2026-11-21T14:00:00.000Z';
    expect(await enviar(confirmada, 'abono')).toMatchObject({ ok: true, kind: 'plantilla' });
  });

  it('el recordatorio dentro de la ventana lleva los botones Confirmo y Cambiar hora', async () => {
    ultimoEntrante = '2026-11-22T10:00:00.000Z';
    await enviar(confirmada, 'recordatorio');
    expect(enviados[0].interactive.action.buttons.map((b: any) => b.reply.title)).toEqual(['Confirmo', 'Cambiar hora']);
  });

  it('marca el evento como avisado solo cuando el mensaje sale', async () => {
    await enviar(confirmada, 'abono');
    expect(avisados).toEqual(['c1:abono']);
    falla = 'WhatsApp no aceptó el mensaje';
    await enviar(confirmada, 'gracias');
    expect(avisados).toEqual(['c1:abono']);
  });

  it('si Meta rechaza el mensaje, queda registrado como fallido con el motivo', async () => {
    falla = 'WhatsApp no aceptó el mensaje (el token de Meta venció o no es válido)';
    const r = await enviar(confirmada, 'abono');
    expect(r).toMatchObject({ ok: false, reason: 'error', error: falla });
    expect(registro[0]).toMatchObject({ status: 'fallido', error: falla });
  });

  it('sin permiso de la clienta no envía nada y lo registra como bloqueado', async () => {
    const r = await enviar({ ...confirmada, wa_opt_in: false }, 'abono');
    expect(r).toMatchObject({ ok: false, reason: 'opt_out' });
    expect(enviados).toEqual([]);
    expect(registro[0]).toMatchObject({ status: 'bloqueado', event: 'abono', error: 'La clienta no aceptó avisos automáticos por WhatsApp' });
    expect(registro[0].body).toBe('Texto de Mensajes: abono');
    expect(avisados).toEqual([]);
  });

  it('sin WhatsApp conectado no envía ni registra nada', async () => {
    configurado = false;
    const r = await enviar(confirmada, 'abono');
    expect(r).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(enviados).toEqual([]);
    expect(registro).toEqual([]);
  });

  it.each([['muy corto', '12345'], ['muy largo', '1234567890123456']])('con un número %s no intenta enviar ni registra (aunque no haya permiso)', async (_, phone) => {
    for (const a of [{ ...confirmada, customer_phone: phone }, { ...confirmada, customer_phone: phone, wa_opt_in: false }]) {
      expect(await enviar(a, 'abono')).toMatchObject({ ok: false, reason: 'error' });
    }
    expect(enviados).toEqual([]);
    expect(registro).toEqual([]);
  });

  it('con el tope mensual agotado no envía plantillas: quedan bloqueadas por tope', async () => {
    topeAgotado = true;
    const r = await enviar(confirmada, 'recordatorio');
    expect(r).toMatchObject({ ok: false, reason: 'tope' });
    expect(enviados).toEqual([]);
    expect(registro[0]).toMatchObject({ status: 'bloqueado', event: 'recordatorio', error: 'Se alcanzó el tope mensual de gasto en WhatsApp' });
    expect(registro[0].body).toContain('te recordamos tu cita');
    expect(avisados).toEqual([]);
  });

  it('con el tope agotado, dentro de la ventana de 24 h el texto gratis sí sale', async () => {
    topeAgotado = true;
    ultimoEntrante = '2026-11-22T10:00:00.000Z';
    expect(await enviar(confirmada, 'abono')).toMatchObject({ ok: true, kind: 'texto' });
  });

  it('usa el texto que Betsy ajustó a mano si viene uno', async () => {
    ultimoEntrante = '2026-11-22T10:00:00.000Z';
    await enviar(confirmada, 'abono', '  Hola Ana, ¡listo! ');
    expect(enviados[0].text.body).toBe('Hola Ana, ¡listo!');
  });
});
