import type { APIRoute } from 'astro';

/** La pestaña Mensajes se retiró (sin WhatsApp automático): los enlaces viejos van a la agenda. */
export const GET: APIRoute = ({ redirect }) => redirect('/admin', 301);
