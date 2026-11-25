/**
 * Enlace para abrir un chat de WhatsApp con el mensaje escrito.
 * Usa api.whatsapp.com/send y no wa.me: el salto de wa.me daña los emojis en iPhone
 * (llegan como «?»), y con este enlace llegan bien.
 */
export const waUrl = (phone: string, text?: string) =>
  `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
