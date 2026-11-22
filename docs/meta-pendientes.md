# Meta: lo que falta para activar el WhatsApp automático (2026-11-22)

Prompt para Claude Desktop (con el navegador). La guía completa está en `docs/whatsapp-automatico.md`.

Estado actual en Vercel (proyecto **betsy-peinados**): ya están `WHATSAPP_PHONE_ID` (número de prueba de Meta),
`WHATSAPP_WABA_ID`, `WHATSAPP_LANG=es_CO`, `WHATSAPP_TEMPLATE_PREFIX=betsy_` y `CRON_SECRET`.
Faltan `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN`.

---

Ayúdame a terminar de conectar el WhatsApp automático de Betsy Peinados en Meta. Trabaja en mi navegador,
donde ya tengo sesión en Meta. No escribas tokens ni claves secretas en ningún campo ni los repitas en el
chat: cuando haga falta copiar uno, dime dónde está y yo lo copio y lo pego.

1. **Plantillas** — business.facebook.com → WhatsApp Manager → cuenta de WhatsApp con ID `1701433651542898`
   → Plantillas de mensajes. Revisa cuáles de estas 8 existen y en qué estado: `betsy_apartada`,
   `betsy_abono`, `betsy_recordatorio`, `betsy_reagendada`, `betsy_gracias`, `betsy_comprobante_rechazado`,
   `betsy_cupo_liberado`, `betsy_cancelada`. Crea las que falten con el nombre y el texto exactos de la
   tabla del Paso 4 de `docs/whatsapp-automatico.md` (categoría **Utilidad**, idioma **Español (COL)**,
   ejemplos de la tabla; en `betsy_recordatorio`, dos botones de respuesta rápida: `Confirmo` y
   `Cambiar hora`). Antes de enviar cada una a revisión, muéstrame el resumen y espera mi «sí».
2. **Token permanente** — business.facebook.com → Configuración del negocio → Usuarios del sistema.
   Llévame hasta «Generar token» del usuario del sistema (o ayúdame a crear «betsy-api», Administrador,
   con la app y la cuenta de WhatsApp asignadas). Caducidad **Nunca**, permisos `whatsapp_business_messaging`
   y `whatsapp_business_management`. Yo copio el token y lo pego en Vercel como `WHATSAPP_TOKEN`.
3. **Clave secreta de la app** — developers.facebook.com → app de Betsy → Configuración → Básica. Llévame
   hasta «Clave secreta de la app»; yo la copio a Vercel como `WHATSAPP_APP_SECRET`.
4. **Token de verificación** — yo agrego en Vercel `WHATSAPP_VERIFY_TOKEN` con un valor que invento y
   hago **Redeploy**. Avísame cuando lo confirme.
5. **Webhook** (solo después del redeploy) — app → WhatsApp → Configuración → Webhook → Editar:
   URL `https://betsy-peinados.vercel.app/api/whatsapp/webhook`, token de verificación: lo escribo yo.
   «Verificar y guardar» y suscribe el campo **messages**.
6. **Suscribir la app a la cuenta** — Explorador de la API Graph, con el token del paso 2 (lo pego yo):
   `POST /1701433651542898/subscribed_apps`. Confirma que responde `{"success": true}`.
7. **Número de prueba** — WhatsApp → Configuración de la API: agrega mi celular a la lista de
   destinatarios permitidos del número de prueba (el código de verificación lo escribo yo).

Al terminar, dime qué plantillas quedaron aprobadas, cuáles en revisión y si el webhook quedó verificado.
