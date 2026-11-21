# Abono, valor final y WhatsApp automático — decisiones

Acordado el 2026-11-21 (sesión de grilling). Se implementa en **una sola fase**, con Meta integrado desde el inicio.

## Precios y abono

- La cita guarda **valor y abono** en el momento de reservar (`appointments.price`, `appointments.deposit`). Cambiar precios en Servicios no altera citas existentes.
- Las citas que ya existen se llenan una vez con el valor que se calcula hoy (precio del largo o "desde" del servicio). Las que no tienen precio quedan vacías.
- **Valor final** editable por Betsy en la cita. Cubre:
  - cm adicionales (la clienta no escribe cm al reservar),
  - servicios sin precio fijo (paquetes, grupos),
  - desplazamiento a domicilio, mostrado aparte como "incluye desplazamiento $X".
- Antes de confirmar el abono: abono = 50% del valor final, y la página de la clienta se actualiza.
- Después de confirmar: el abono pagado queda fijo y solo cambia el saldo. Saldo mínimo $0, sin devoluciones.
- La página de la clienta y el panel muestran **Valor · Abono pagado · Saldo el día de la cita**.

## Comprobantes y cupos

- **Rechazar comprobante** con motivo corto: se borra el archivo, la cita vuelve a "Esperando abono" y la clienta ve el motivo.
- **Vencimiento automático** de cupos apartados sin comprobante:
  - 24 h desde la reserva, o 2 h si la cita es en menos de 24 h,
  - pasa a cancelada (sin abono) y libera el horario.
- Con un comprobante **en revisión**, el cupo no vence y el panel lo resalta.
- Si Betsy rechaza el comprobante, el plazo vuelve a empezar desde el rechazo.
- No hay aviso antes de que venza el cupo (se puede agregar después).
- Una tarea en Supabase (pg_cron + pg_net) llama cada 15 min a un endpoint protegido del sitio, con `CRON_SECRET`.

## WhatsApp (Cloud API de Meta)

- Número actual de Betsy en **modo coexistencia**. Se desarrolla con el número de prueba de Meta (máx. 5 destinatarios) y luego se cambia a producción.
- **Automáticos (plantillas aprobadas por Meta):**
  - abono recibido,
  - recordatorio N h antes (por defecto 24, editable en Ajustes; no se envía si la cita se confirmó dentro de ese margen),
  - cupo liberado por falta de abono,
  - comprobante rechazado.
- **Manuales (enlace wa.me, como hoy):** pedir abono, gracias, cancelada por Betsy.
- En "Mensajes", las plantillas automáticas son **solo lectura**; las manuales siguen editables.
- La API **solo envía plantillas** y nunca contesta sola. Betsy responde desde su app, gratis dentro de la ventana de 24 h después de que la clienta escribe.
- No se limitan las respuestas de la clienta: sus mensajes son gratis y no se pueden bloquear.
- **Permiso para recibir avisos:**
  - casilla marcada por defecto en la reserva web y en el formulario manual del panel, guardada en `appointments.wa_opt_in`,
  - sin permiso no sale ningún mensaje automático.
- **Teléfono:** solo celular colombiano (10 dígitos que empiezan por 3) o número con prefijo internacional. Ya no se aceptan fijos.
- Cada envío queda en `wa_messages`, con estados (enviado, entregado, leído, fallido) que llegan por webhook validado con `WA_APP_SECRET`.
- Si un envío falla, la cita muestra "⚠️ No se pudo enviar el aviso" con el botón manual.
- Variables de entorno: `WA_TOKEN` (usuario del sistema, sin vencimiento), `WA_PHONE_NUMBER_ID`, `WA_APP_SECRET`, `CRON_SECRET`. La facturación es la de la cuenta de Meta Business de Betsy.

## Panel de uso y tope de gasto

- **Página "WhatsApp"** en el panel:
  - gasto del mes, con el monto real de Meta (sincronizado una vez al día) y un estimado al momento,
  - mensajes por tipo, separados entre gratis (dentro de la ventana) y pagados,
  - entregados, leídos y fallidos, con enlace a la cita,
  - comparación con el mes anterior.
- El gasto se muestra en la moneda que cobra Meta y, si es USD, también un aproximado en COP con tasa editable en Ajustes.
- **Tope mensual en COP**, editable en Ajustes:
  - al 80%, aviso en el panel,
  - al 100%, se detienen los envíos automáticos hasta el mes siguiente y vuelven los enlaces manuales.
