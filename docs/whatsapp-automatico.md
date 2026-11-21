# WhatsApp automático de Betsy Peinados: cómo conectarlo

Cuando esté conectado:

- **Confirmar citas por WhatsApp.** El día antes de cada cita confirmada (9:00 a. m.) le llega a la clienta "¿Nos confirmas tu asistencia?" con dos botones: **Confirmo** y **Cambiar hora**. También puedes mandarlo cuando quieras con el botón **Pedir confirmación** de la cita.
  - Si toca **Confirmo**, la cita queda marcada "Confirmó por WhatsApp" en la agenda y le llega un "¡Gracias!".
  - Si toca **Cambiar hora**, la cita queda marcada "Pide cambiar la hora" y se abre sola la sección para moverla.
- **Cambiar hora o reagendar** desde la cita: eliges la nueva fecha y hora, el horario anterior queda libre, se mueve en tu Google Calendar y la clienta recibe el aviso de la nueva hora.
- Al **confirmar el abono**, **cancelar** o **marcar como realizada**, el aviso le llega solo a la clienta. Cuando alguien reserva en la web, le llega solo el mensaje de **cupo apartado** con los datos del abono.
- Cada cita muestra la **conversación de WhatsApp** (✓ enviado, ✓✓ entregado, ✓✓ azul leído) y lo que la clienta responde. Si te escribió en las últimas 24 horas, le contestas desde ahí mismo.
- En **Mensajes** ves el **costo del mes** de WhatsApp de Betsy (separado de UNDRWEAR): mensajes cobrados, gratis, recibidos y el valor en pesos (o en dólares, el dato real de Meta, si pones `WHATSAPP_WABA_ID`).

Mientras no lo conectes, todo sigue como hoy: el botón de WhatsApp abre tu app con el mensaje listo.

---

## Cuánto cuesta

| Mensaje | Precio aproximado en Colombia |
| --- | --- |
| Plantilla de **Utilidad** (la clienta no te escribió en las últimas 24 h) | unos **US$0,0008** cada una (≈ COP 3 a 4) |
| Mensajes dentro de las 24 h después de que la clienta te escribió (incluye las respuestas a Confirmo / Cambiar hora) | **gratis** |

Con 3 o 4 avisos por cita son unos **COP 10 a 15 por cita**. Meta cobra a la tarjeta de la cuenta de WhatsApp de Betsy. El precio que usa el panel para estimar se cambia en **Mensajes → Precio por mensaje cobrado**.

---

## Paso 1. Base de datos (2 minutos)

Supabase (proyecto **betsy-peinados**) → **SQL Editor** → New query → pega todo `supabase/migrations/20261120000000_whatsapp_automatico.sql` → **Run**. Se puede correr más de una vez.

## Paso 2. Número y app de Meta propios de Betsy

Betsy usa **su propio número y su propia app de Meta**, aparte de UNDRWEAR, para que los costos y los chats no se mezclen.

1. Un **chip nuevo** para Betsy (recomendado), o el número actual si al registrarlo Meta ofrece **"Conectar tu app WhatsApp Business"** (coexistencia).
2. developers.facebook.com → **Mis apps → Crear app** → caso de uso **Conectar con los clientes a través de WhatsApp** → portafolio comercial de **Betsy Peinados** (créalo si no existe).
3. **WhatsApp → Configuración de la API → Agregar número**: nombre visible "Betsy Peinados", verifica con el código.
4. Copia el **Identificador del número de teléfono** (Phone number ID) y el **Identificador de la cuenta de WhatsApp Business** (WABA ID).
5. **WhatsApp Manager → Configuración de pago**: agrega la tarjeta.
6. La app necesita **política de privacidad**: usa `https://betsy-peinados.vercel.app/privacidad`. Luego publícala (modo **Live**).

## Paso 3. Token que no vence

1. business.facebook.com → **Usuarios del sistema → Agregar** ("betsy-api", Administrador).
2. **Asignar activos**: la app y la cuenta de WhatsApp de Betsy (control total).
3. **Generar token** → caducidad **Nunca** → permisos `whatsapp_business_messaging` y `whatsapp_business_management` → copia el token (`EAA…`).
4. App → **Configuración → Básica** → copia la **Clave secreta de la app**.

## Paso 4. Las 6 plantillas (todas en **Español (COL)**, categoría **Utilidad**)

**WhatsApp Manager → Plantillas de mensajes → Crear plantilla.** El nombre y el texto deben ser exactos. Todas en el **mismo idioma** que `WHATSAPP_LANG` (`es_CO` = Español (COL)); si una queda en otro idioma, Meta la rechaza al enviar.

| Nombre | Texto | Ejemplos |
| --- | --- | --- |
| `betsy_apartada` | Hola {{1}}, tu cupo de {{2}} para el {{3}} a las {{4}} está apartado en Betsy Peinados. Para confirmarlo envía el abono de {{5}} a la llave {{6}} y comparte el comprobante por este chat. | Laura · Ondas · sábado 22 de noviembre · 3:00 p. m. · $40.000 · 3001234567 |
| `betsy_abono` | Hola {{1}}, recibimos tu abono. Tu cita de {{2}} quedó confirmada para el {{3}} a las {{4}}. Recuerda llegar con el cabello limpio y seco. | Laura · Ondas · sábado 22 de noviembre · 3:00 p. m. |
| `betsy_recordatorio` | Hola {{1}}, te recordamos tu cita de {{2}} el {{3}} a las {{4}} en Betsy Peinados. ¿Nos confirmas tu asistencia? | Laura · Ondas · sábado 22 de noviembre · 3:00 p. m. |
| `betsy_reagendada` | Hola {{1}}, tu cita de {{2}} cambió para el {{3}} a las {{4}}. Si no te queda bien, respóndenos por este chat. | Laura · Ondas · domingo 23 de noviembre · 10:00 a. m. |
| `betsy_gracias` | Hola {{1}}, gracias por tu cita de {{2}} en Betsy Peinados. Si tienes alguna duda sobre tu peinado, respóndenos por este chat. | Laura · Ondas |
| `betsy_cancelada` | Hola {{1}}, tu cita de {{2}} del {{3}} a las {{4}} fue cancelada. Si quieres reprogramarla, respóndenos por este chat. | Laura · Ondas · sábado 22 de noviembre · 3:00 p. m. |

En **`betsy_recordatorio`** agrega **Botones → Respuesta rápida** con dos botones, exactamente: **`Confirmo`** y **`Cambiar hora`**.

Los textos con emojis de **Mensajes** en el panel se usan cuando la clienta te escribió en las últimas 24 horas (gratis).

## Paso 5. Variables en Vercel (proyecto betsy-peinados)

Vercel → **Settings → Environment Variables** (Production) → agrega y luego **Redeploy**:

| Nombre | Valor |
| --- | --- |
| `WHATSAPP_TOKEN` | el token `EAA…` |
| `WHATSAPP_PHONE_ID` | el Phone number ID |
| `WHATSAPP_APP_SECRET` | la clave secreta de la app |
| `WHATSAPP_VERIFY_TOKEN` | una palabra que inventes, p. ej. `betsy-2026-xyz` |
| `WHATSAPP_LANG` | `es_CO` |
| `WHATSAPP_WABA_ID` | el WABA ID (para ver el costo real) |
| `CRON_SECRET` | un texto largo aleatorio (activa el recordatorio de las 9:00 a. m.) |

## Paso 6. Que las respuestas lleguen al panel

1. developers.facebook.com → app de Betsy → **WhatsApp → Configuración → Webhook → Editar**:
   - URL: `https://betsy-peinados.vercel.app/api/whatsapp/webhook`
   - Token de verificación: el mismo `WHATSAPP_VERIFY_TOKEN`
   - **Verificar y guardar**, y en **Campos del webhook** suscribe **messages**.
2. **Importante** (lo aprendimos con UNDRWEAR): suscribe la app a la cuenta de WhatsApp, o no llegan los mensajes. En el **Explorador de la API Graph**, con el token: `POST /{WABA_ID}/subscribed_apps`.

## Paso 7. Probar

1. Panel → **Mensajes**: debe decir **Activo** con los 4 puntos en verde.
2. Agenda una cita para mañana con tu celular y pulsa **Pedir confirmación**: te llega con los botones.
3. Toca **Confirmo**: en la cita aparece "Confirmó por WhatsApp". Toca **Cambiar hora** en otra prueba y muévela desde **Cambiar hora o reagendar**.
4. Mira en **Mensajes** el costo del mes.

## Si algo falla

El panel muestra el motivo y siempre queda **Abrir en mi WhatsApp** para mandarlo a mano.

- *La plantilla no existe o no está aprobada*: nombre exacto, estado **Activa** y en Español (COL).
- *El token venció*: genera otro (caducidad Nunca) y cámbialo en Vercel.
- *Pasaron más de 24 h*: para escribir libre la clienta debe haberte escrito en el último día; usa **Pedir confirmación** o **Abrir en mi WhatsApp**.
- *Solo puedes escribir a números de prueba*: con el número de prueba de Meta, agrega tu celular en la lista de destinatarios.
