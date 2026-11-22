/**
 * Dominio del aviso por WhatsApp: decide si sale, cómo (texto gratis o plantilla de Meta) y qué queda registrado.
 * No importa Supabase ni hace HTTP: el cliente de Meta y el registro llegan inyectados.
 */
import { aceptaAvisos } from './cita';
import { MIN_DIGITOS_INTERNACIONAL } from './celular';
import { META_TEMPLATES, type NoticeEvent } from './messages';
import type { Appointment, WaStatus } from './types';

export type SendResult =
  | { ok: true; kind: 'texto' | 'plantilla'; messageId?: number }
  | { ok: false; reason: 'not_configured' | 'window_closed' | 'opt_out' | 'error'; error?: string; messageId?: number };

/** Fila de la conversación que deja cada intento de aviso. */
export interface RegistroAviso {
  appointment_id: string | null;
  phone: string;
  direction: 'out';
  event: string;
  body: string;
  kind: 'texto' | 'plantilla';
  status: Extract<WaStatus, 'enviado' | 'fallido' | 'bloqueado'>;
  error: string | null;
  wa_message_id: string | null;
}

export interface AvisoDeps {
  now: () => Date;
  configurado: () => boolean;
  /** Envía a la Cloud API; devuelve el id de Meta o lanza un Error con el motivo para Betsy. */
  meta: { enviar: (payload: Record<string, unknown>) => Promise<string | undefined> };
  /** Último mensaje que escribió la clienta (abre la ventana gratis de 24 h). */
  ultimoEntrante: (phone: string) => Promise<string | null>;
  /** Texto de Mensajes (el que Betsy edita) ya lleno con los datos de la cita. */
  textoDeMensajes: (a: Appointment, ev: NoticeEvent) => Promise<string>;
  /** Valores de la cita para los {{n}} de la plantilla de Meta. */
  valores: (a: Appointment) => Promise<Record<string, string>>;
  plantilla: { prefijo: string; idioma: string };
  /** Guarda el intento en la conversación; devuelve su id si lo hay. */
  registrar: (r: RegistroAviso) => Promise<number | undefined | void>;
  marcarAvisado: (a: Appointment, ev: NoticeEvent) => Promise<void>;
}

/** Número en formato internacional, solo dígitos (Colombia por defecto). */
export const waNumber = (p: string) => {
  const d = (p ?? '').replace(/\D/g, '');
  return d.length === 10 && d.startsWith('3') ? `57${d}` : d;
};

/** ¿La clienta escribió en las últimas 24 h? (ventana de atención de WhatsApp; 1 min de margen) */
export const windowOpen = (last: string | null, now = new Date()) => Boolean(last && now.getTime() - Date.parse(last) < 24 * 3600_000 - 60_000);

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Mensaje de texto libre o con botones (solo dentro de la ventana de 24 h). */
export function freePayload(to: string, body: string, buttons?: string[]) {
  if (!buttons?.length) return { to, type: 'text', text: { body: clip(body, 4000), preview_url: false } };
  return {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: clip(body, 1024) },
      action: { buttons: buttons.map((title, i) => ({ type: 'reply', reply: { id: `b${i}`, title: clip(title, 20) } })) },
    },
  };
}

const BLOQUEO: Record<'opt_out' | 'not_configured', string> = {
  opt_out: 'La clienta no aceptó avisos automáticos por WhatsApp',
  not_configured: 'El WhatsApp automático no está conectado',
};

export function createAvisos(deps: AvisoDeps) {
  const registrar = async (r: Omit<RegistroAviso, 'direction'>) => (await deps.registrar({ ...r, direction: 'out' })) ?? undefined;

  return {
    /**
     * Envía el aviso de un momento de la cita. Dentro de la ventana de 24 h va el texto de Mensajes
     * (o el que Betsy ajustó); fuera de ella, la plantilla aprobada en Meta.
     */
    async enviar(a: Appointment, event: NoticeEvent, customText = ''): Promise<SendResult> {
      const phone = waNumber(a.customer_phone);
      const bloqueo = !deps.configurado() ? 'not_configured' : !aceptaAvisos(a) ? 'opt_out' : null;
      if (bloqueo) {
        // Queda en la conversación para que Betsy vea por qué no salió y lo mande a mano.
        const body = customText.trim() || (await deps.textoDeMensajes(a, event));
        const messageId = await registrar({ appointment_id: a.id, phone, event, body: clip(body, 4000), kind: 'texto', status: 'bloqueado', error: BLOQUEO[bloqueo], wa_message_id: null });
        return { ok: false, reason: bloqueo, messageId };
      }
      if (phone.length < MIN_DIGITOS_INTERNACIONAL) return { ok: false, reason: 'error', error: 'El WhatsApp de la clienta no parece válido.' };

      const meta = META_TEMPLATES[event];
      let kind: 'texto' | 'plantilla';
      let body: string;
      let payload: Record<string, unknown>;
      if (windowOpen(await deps.ultimoEntrante(phone), deps.now())) {
        kind = 'texto';
        body = customText.trim() || (await deps.textoDeMensajes(a, event));
        payload = freePayload(phone, body, meta.buttons);
      } else {
        kind = 'plantilla';
        const params = meta.params(await deps.valores(a)).map((t) => clip(String(t ?? '').replace(/\s+/g, ' ').trim() || '-', 200));
        body = meta.text.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? '');
        payload = {
          to: phone,
          type: 'template',
          template: {
            name: `${deps.plantilla.prefijo}${event}`,
            language: { code: deps.plantilla.idioma },
            components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
          },
        };
      }

      let waId: string | undefined;
      let error: string | null = null;
      try {
        waId = await deps.meta.enviar(payload);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      const messageId = await registrar({ appointment_id: a.id, phone, event, body: clip(body, 4000), kind, status: error ? 'fallido' : 'enviado', error, wa_message_id: waId ?? null });
      if (error) return { ok: false, reason: 'error', error, messageId };
      await deps.marcarAvisado(a, event);
      return { ok: true, kind, messageId };
    },
  };
}
