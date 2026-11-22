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
  | { ok: false; reason: 'not_configured' | 'window_closed' | 'opt_out' | 'tope' | 'error'; error?: string; messageId?: number };

/** Fila de la conversación que deja cada intento de aviso. */
export interface RegistroAviso {
  appointment_id: string | null;
  phone: string;
  direction: 'out';
  event: NoticeEvent;
  body: string;
  kind: 'texto' | 'plantilla';
  status: Extract<WaStatus, 'enviado' | 'fallido' | 'bloqueado'>;
  error: string | null;
  wa_message_id: string | null;
}

export interface AvisoDeps {
  now: () => Date;
  configurado: () => boolean;
  /** ¿Se alcanzó el tope mensual de gasto? Solo frena las plantillas (lo que se cobra). */
  topeAgotado: () => Promise<boolean>;
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
  registrar: (r: RegistroAviso) => Promise<number | undefined>;
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

/** Por qué un aviso quedó bloqueado, tal como lo lee Betsy en la conversación. */
export const SIN_PERMISO = 'La clienta no aceptó avisos automáticos por WhatsApp';
export const POR_TOPE = 'Se alcanzó el tope mensual de gasto en WhatsApp';

/** Texto de la plantilla de Meta con sus {{n}} ya llenos, igual al que recibe la clienta. */
export function textoPlantilla(event: NoticeEvent, valores: Record<string, string>): { params: string[]; body: string } {
  const meta = META_TEMPLATES[event];
  const params = meta.params(valores).map((t) => clip(String(t ?? '').replace(/\s+/g, ' ').trim() || '-', 200));
  return { params, body: meta.text.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? '') };
}

/** Mensaje de la conversación que no le llegó a la clienta (falló o quedó bloqueado): se ofrece enviarlo a mano. */
export const noSalio = (m: { direction: string; status: string }) => m.direction === 'out' && (m.status === 'fallido' || m.status === 'bloqueado');

export function createAvisos(deps: AvisoDeps) {
  const registrar = (r: Omit<RegistroAviso, 'direction'>) => deps.registrar({ ...r, direction: 'out' });

  return {
    /**
     * Envía el aviso de un momento de la cita. Dentro de la ventana de 24 h va el texto de Mensajes
     * (o el que Betsy ajustó); fuera de ella, la plantilla aprobada en Meta.
     */
    async enviar(a: Appointment, event: NoticeEvent, customText = ''): Promise<SendResult> {
      // Sin conexión no hay conversación que registrar: el panel ya ofrece los enlaces manuales.
      if (!deps.configurado()) return { ok: false, reason: 'not_configured' };
      const phone = waNumber(a.customer_phone);
      if (phone.length < MIN_DIGITOS_INTERNACIONAL || phone.length > 15) return { ok: false, reason: 'error', error: 'El WhatsApp de la clienta no parece válido' };
      if (!aceptaAvisos(a)) {
        // Queda en la conversación para que Betsy vea por qué no salió y lo mande a mano.
        const body = customText.trim() || (await deps.textoDeMensajes(a, event));
        const messageId = await registrar({ appointment_id: a.id, phone, event, body: clip(body, 4000), kind: 'texto', status: 'bloqueado', error: SIN_PERMISO, wa_message_id: null });
        return { ok: false, reason: 'opt_out', messageId };
      }

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
        const t = textoPlantilla(event, await deps.valores(a));
        const params = t.params;
        body = t.body;
        if (await deps.topeAgotado()) {
          // Las plantillas se cobran: con el tope agotado no salen hasta el mes siguiente (Betsy puede enviarla a mano).
          const messageId = await registrar({ appointment_id: a.id, phone, event, body: clip(body, 4000), kind, status: 'bloqueado', error: POR_TOPE, wa_message_id: null });
          return { ok: false, reason: 'tope', messageId };
        }
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
