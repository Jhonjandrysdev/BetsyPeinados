# Spec: valor final, ciclo del abono y avisos automáticos por WhatsApp

> Decisiones de origen: `docs/plan-abono-whatsapp.md` (grilling del 2026-11-21).

## Problem Statement

Betsy gestiona sola sus reservas. El panel ya le permite ver el comprobante del abono, confirmarlo y abrir WhatsApp con un mensaje escrito. Aun así, varias cosas dependen de su memoria y se descuadran:

- **El valor de la cita no se conserva.** Se calcula al momento con los precios actuales del servicio. Si sube precios, las citas ya reservadas muestran otro valor y otro abono, en el panel y en los mensajes.
- **No hay dónde anotar el valor real.** Faltan los cm adicionales en ondas, los servicios sin precio fijo (paquetes, grupos) y el desplazamiento a domicilio. Por eso la clienta no sabe cuánto abonar ni cuánto le queda por pagar.
- **Los cupos sin pagar bloquean la agenda para siempre.** Si la clienta nunca envía el comprobante, el horario no se libera.
- **No puede rechazar un comprobante** falso, borroso o por menos dinero. La cita queda atascada en "Revisar comprobante".
- **Todos los avisos son manuales.** Si olvida avisar "abono recibido" o enviar el recordatorio, la clienta no se entera. Además, "avisado" se marca cuando abre el enlace, no cuando el mensaje se envía.
- Con envíos automáticos por la API de WhatsApp aparecería un **gasto en mensajes** que hoy no podría ver ni limitar.

## Solution

- **Precio fijado al reservar.** La cita guarda su valor y su abono en el momento de reservar.
- **Valor final.** Betsy puede ajustar el valor final de cada cita (cm, paquete, desplazamiento). Mientras no haya abono confirmado, el abono se recalcula al 50%. Una vez confirmado, queda fijo y solo cambia el saldo.
- **Valor, abono y saldo a la vista.** La clienta ve en su página el valor, el abono y el saldo, y la página se actualiza sola.
- **Vencimiento de cupos.** Una tarea programada libera los cupos sin comprobante: a las 24 h, o a las 2 h si la cita está cerca. Un comprobante en revisión detiene el plazo.
- **Rechazo de comprobante.** Betsy puede rechazarlo con un motivo. La cita vuelve a "Esperando abono" y el plazo empieza de nuevo.
- **Avisos automáticos.** Abono recibido, recordatorio, cupo liberado y comprobante rechazado salen solos por la Cloud API de WhatsApp, desde el número actual de Betsy en coexistencia. Solo se envían plantillas aprobadas y a clientas que dieron permiso. Los demás mensajes siguen como enlace manual.
- **Panel de uso y tope.** Una página "WhatsApp" muestra gasto, mensajes y entregas. Un tope mensual detiene los envíos automáticos al alcanzarse y vuelve a los enlaces manuales.

## User Stories

### Clienta: reserva y permiso

1. Como clienta, quiero que al reservar quede fijo el valor del servicio según mi largo de cabello, para que no me cambie el precio si Betsy actualiza su lista después.
2. Como clienta, quiero ver una casilla, marcada por defecto, para aceptar avisos de mi cita por WhatsApp, para decidir si recibo mensajes automáticos.
3. Como clienta, quiero que el formulario me avise si mi número no es un celular válido, para no quedarme sin avisos por un error al escribirlo.
4. Como clienta de otro país, quiero poder escribir mi número con prefijo internacional, para reservar aunque no tenga celular colombiano.

### Clienta: abono y saldo

5. Como clienta, quiero ver en la página de mi cita el valor, el abono a pagar y el saldo para el día de la cita, para saber exactamente cuánto transferir y cuánto llevar.
6. Como clienta de un servicio sin precio fijo, quiero que la página me muestre el abono en cuanto Betsy fije el valor, para poder pagar sin preguntar por WhatsApp.
7. Como clienta a domicilio, quiero ver cuánto del valor corresponde al desplazamiento, para entender el total.
8. Como clienta, quiero que la página se actualice sola si Betsy ajusta el valor final, para no trabajar con un monto viejo.
9. Como clienta que ya pagó el abono, quiero que mi abono no cambie aunque Betsy ajuste el valor después, para tener claro lo que ya pagué y que solo cambie el saldo.

### Clienta: comprobante y vencimiento

10. Como clienta, quiero saber cuánto tiempo tengo para enviar el comprobante antes de que se libere mi cupo, para no perderlo.
11. Como clienta, quiero que mi cupo no se libere mientras Betsy revisa el comprobante que ya subí, para no perder la cita por su demora.
12. Como clienta con comprobante rechazado, quiero ver el motivo en la página de mi cita, para corregirlo.
13. Como clienta con comprobante rechazado, quiero poder subir uno nuevo desde la misma página, para no empezar la reserva de cero.
14. Como clienta con comprobante rechazado, quiero tener otra vez un plazo completo para pagar, para que no me venza el cupo enseguida.

### Clienta: avisos por WhatsApp

15. Como clienta, quiero recibir por WhatsApp un aviso de que mi abono fue recibido y mi cita quedó confirmada, para tener tranquilidad.
16. Como clienta, quiero un recordatorio por WhatsApp antes de mi cita, para no olvidarla.
17. Como clienta, quiero que me avisen por WhatsApp si mi cupo se liberó por falta de abono, para saber que debo reservar de nuevo.
18. Como clienta, quiero que me avisen por WhatsApp si rechazaron mi comprobante y por qué, para corregirlo a tiempo.
19. Como clienta, quiero poder responder esos mensajes y hablar con Betsy normalmente, para resolver dudas en el mismo chat.
20. Como clienta que no aceptó avisos, quiero no recibir mensajes automáticos, para que se respete mi decisión.

### Betsy: valor y abono

21. Como Betsy, quiero que cada cita conserve el valor y el abono con que se reservó, para que los cambios de precios no descuadren citas existentes.
22. Como Betsy, quiero editar el valor final de una cita, para cobrar los cm adicionales tras ver la foto o el cabello.
23. Como Betsy, quiero fijar el valor de un servicio sin precio (paquete, grupo), para que la clienta pueda pagar el abono.
24. Como Betsy, quiero anotar el desplazamiento a domicilio dentro del valor final, para que quede registrado y el abono lo incluya.
25. Como Betsy, quiero que el abono se recalcule mientras la cita está pendiente, para no hacer cuentas a mano.
26. Como Betsy, quiero que el abono quede fijo una vez lo confirmo, para que el registro de lo pagado sea fiel.
27. Como Betsy, quiero ver valor, abono y saldo en el detalle de cada cita, para saber cuánto cobrar el día del servicio.
28. Como Betsy, quiero que el saldo nunca sea negativo si bajo el valor final por debajo del abono, porque no hago devoluciones.
29. Como Betsy, quiero que las citas existentes queden con su valor actual al aplicar el cambio, para no tener que llenarlas una por una.

### Betsy: comprobantes y vencimiento

30. Como Betsy, quiero un botón "Rechazar comprobante" con un motivo corto, para resolver comprobantes falsos, borrosos o incompletos.
31. Como Betsy, quiero que al rechazar se borre el comprobante y la cita vuelva a "Esperando abono", para que el estado sea claro.
32. Como Betsy, quiero que los cupos sin comprobante se liberen solos a las 24 h (o 2 h si la cita está cerca), para no perder horarios con reservas fantasma.
33. Como Betsy, quiero que las citas con comprobante sin revisar se resalten en el panel, para no dejar a nadie esperando.
34. Como Betsy, quiero que una cita liberada por vencimiento quede como cancelada por falta de abono, distinguible de las que cancelo yo, para entender por qué se cayó.
35. Como Betsy, quiero que liberar un cupo también lo quite de mi Google Calendar, igual que una cancelación manual, para que mi agenda coincida.

### Betsy: WhatsApp automático

36. Como Betsy, quiero que el aviso de "abono recibido" salga solo al confirmar el abono, para no olvidarlo.
37. Como Betsy, quiero que el recordatorio salga solo N horas antes de cada cita confirmada, para no revisar la agenda cada día.
38. Como Betsy, quiero elegir en Ajustes con cuántas horas de anticipación sale el recordatorio, para adaptarlo a mi forma de trabajar.
39. Como Betsy, quiero que no se envíe recordatorio si la cita se confirmó dentro de ese margen, para no repetir mensajes.
40. Como Betsy, quiero seguir usando mi número y mi app de WhatsApp Business, para que las clientas me escriban donde siempre.
41. Como Betsy, quiero que el sistema nunca conteste solo a las clientas, para que la conversación siga siendo mía.
42. Como Betsy, quiero seguir teniendo los enlaces manuales para pedir abono, agradecer y avisar cancelaciones, para escribir algo personal cuando quiera.
43. Como Betsy, quiero ver en "Mensajes" las plantillas automáticas en modo lectura, para saber qué recibe la clienta.
44. Como Betsy, quiero seguir editando las plantillas manuales, para ajustar mi tono.
45. Como Betsy, quiero ver en cada cita qué avisos salieron y si fueron entregados o leídos, para saber si la clienta está enterada.
46. Como Betsy, quiero que el panel me alerte si un aviso no se pudo enviar y me ofrezca el enlace manual, para que ninguna clienta se quede sin aviso.
47. Como Betsy, quiero marcar en el formulario de cita manual si la clienta acepta avisos (marcado por defecto), para que esas citas también los reciban.
48. Como Betsy, quiero que no salgan avisos automáticos a clientas que no aceptaron, para cumplir las reglas de WhatsApp.
49. Como Betsy, quiero que un aviso no se envíe dos veces aunque la tarea programada se repita, para no gastar ni molestar.

### Betsy: uso y gasto

50. Como Betsy, quiero una página "WhatsApp" con el gasto del mes, para saber cuánto llevo.
51. Como Betsy, quiero ver un estimado al momento y el monto real que reporta Meta, para tener la cifra del día y la exacta.
52. Como Betsy, quiero ver cuántos mensajes salieron por tipo y cuántos fueron gratis o pagados, para entender en qué se va el dinero.
53. Como Betsy, quiero ver entregados, leídos y fallidos, con enlace a la cita de cada fallido, para actuar sobre los problemas.
54. Como Betsy, quiero comparar el mes actual con el anterior, para ver la tendencia.
55. Como Betsy, quiero ver el gasto en COP aunque Meta cobre en USD, usando una tasa que puedo editar, para entenderlo en mi moneda.
56. Como Betsy, quiero fijar un tope mensual de gasto en Ajustes, para no llevarme sorpresas.
57. Como Betsy, quiero un aviso en el panel cuando llegue al 80% del tope, para decidir si lo subo.
58. Como Betsy, quiero que al 100% se detengan los avisos automáticos y vuelvan los enlaces manuales, para no pasarme del presupuesto sin dejar de atender.
59. Como Betsy, quiero que el tope se reinicie cada mes, para no tener que reactivarlo a mano.

### Desarrollador

60. Como desarrollador, quiero probar todo con el número de prueba de Meta antes de conectar el número real, para no enviar mensajes a clientas reales.
61. Como desarrollador, quiero que el webhook rechace peticiones sin firma válida, para que nadie falsifique estados de mensajes.
62. Como desarrollador, quiero que el endpoint de la tarea programada exija un secreto, para que nadie dispare vencimientos o envíos desde fuera.
63. Como desarrollador, quiero que el sitio siga funcionando sin las credenciales de WhatsApp (modo demo o local), cayendo a los enlaces manuales, para desarrollar sin Meta.

## Implementation Decisions

### Módulo de dominio de citas (nuevo, el centro del cambio)

- Un módulo de dominio concentra el ciclo de la cita, el abono y los avisos. Recibe por inyección:
  - un **almacén** (lectura y escritura de citas, ajustes, registro de mensajes, gasto),
  - un **cliente de WhatsApp** (enviar plantilla, consultar gasto),
  - un **reloj**.
- No importa Supabase ni hace llamadas HTTP directamente.
- Operaciones públicas, de alto nivel:
  - **fijar precio al reservar**: calcula valor y abono a partir del servicio y el largo, para el flujo de reserva web y manual;
  - **ajustar valor final**: recibe valor y desplazamiento opcional; recalcula el abono solo si el abono no está confirmado;
  - **confirmar abono**: transición pendiente → confirmada, fija el abono y dispara el aviso "abono recibido";
  - **rechazar comprobante**: recibe un motivo; vuelve a "esperando abono", reinicia el plazo y dispara el aviso de rechazo;
  - **tick**: lo invoca la tarea programada; vence cupos, envía recordatorios pendientes y es idempotente;
  - **registrar estado de mensaje**: la entrada del webhook;
  - **resumen de uso**: datos para la página WhatsApp.
- **Reglas que encapsula:**
  - abono = 50% del valor, redondeado a miles (regla actual);
  - saldo = máx(0, valor − abono);
  - plazo de vencimiento: 24 h desde la reserva o el último rechazo, o 2 h si la cita empieza en menos de 24 h; se suspende mientras haya un comprobante en revisión;
  - el recordatorio sale cuando faltan N h (de Ajustes) y no se envía si la confirmación ocurrió dentro de esa ventana;
  - un aviso automático se envía solo si hay permiso, quedan credenciales, el gasto no llegó al tope y ese aviso no se registró antes para esa cita (idempotencia por cita y tipo de aviso);
  - si el envío falla o está bloqueado por tope o falta de permiso, queda registrado y el panel ofrece el enlace manual.
- La lógica de precios existente (precio por largo y abono) se mueve o reutiliza dentro de este módulo. La UI deja de calcular el valor de las citas en vivo.

### Adaptadores (delgados, sin lógica de negocio)

- **Almacén Supabase:** extiende la capa de datos actual con las columnas y tablas nuevas.
- **Cliente WhatsApp Cloud API:**
  - envío de plantillas por número de teléfono, con idioma `es` y parámetros posicionales;
  - consulta diaria del gasto real mediante la analítica de precios de la cuenta de WhatsApp Business;
  - validación de la firma `X-Hub-Signature-256` con el secreto de la app;
  - sin credenciales, el adaptador queda **deshabilitado** y todo aviso se marca como "manual".
- **Google Calendar:** al vencer un cupo se reutiliza la cancelación de evento existente.

### Cambios de esquema (migración aditiva)

- **`appointments`:**
  - valor (`price`), abono (`deposit`), desplazamiento (`travel_fee`),
  - permiso de avisos (`wa_opt_in`, por defecto verdadero),
  - motivo de rechazo y fecha del último rechazo,
  - motivo de cancelación, para distinguir "sin abono" de "por Betsy".
- **Tabla `wa_messages`:**
  - cita, tipo de aviso, plantilla, teléfono, id del mensaje en Meta;
  - estado: `en_cola`, `enviado`, `entregado`, `leido`, `fallido` o `bloqueado` (con razón: tope, sin permiso, sin credenciales);
  - si fue gratis o pagado, categoría de precio reportada por Meta, costo estimado, error, fechas;
  - índice único por cita y tipo de aviso para garantizar la idempotencia.
- **Tabla de gasto real diario** sincronizada desde Meta: fecha, monto, moneda.
- **`site_settings`:** horas del recordatorio (por defecto 24), tope mensual en COP, tasa USD→COP y costo estimado por mensaje pagado.
- **Relleno único:** las citas existentes reciben `price` y `deposit` según la regla actual; las que no tienen precio quedan en null.
- **Seguridad:** las tablas nuevas siguen el patrón actual de RLS, accesibles solo por el servidor.

### Endpoints y contratos

- **Endpoint de la tarea programada (público, protegido por `CRON_SECRET` en cabecera):** ejecuta `tick` y responde un resumen (vencidas, recordatorios enviados, bloqueados). Lo invoca Supabase pg_cron + pg_net cada 15 min.
- **Webhook de WhatsApp (público):**
  - GET para la verificación de Meta (token de verificación),
  - POST con firma validada; solo procesa estados de mensajes e ignora los mensajes entrantes,
  - responde 200 rápido.
- **Sincronización de gasto real:** corre dentro del `tick` una vez al día.
- **Acciones del panel** (detrás del middleware de admin actual): ajustar valor final, rechazar comprobante (con motivo) y confirmar abono, que ahora delega en el módulo de dominio.
- **Endpoint de estado de la clienta:** además del estado, devuelve valor, abono, saldo, motivo de rechazo y hora de vencimiento, para que la página se actualice sola.

### Interfaz

- **Página de la cita:**
  - bloque Valor · Abono · Saldo,
  - plazo restante para el comprobante,
  - motivo de rechazo con opción de subir otro comprobante,
  - desglose del desplazamiento.
- **Reserva web y formulario manual:**
  - casilla de permiso de avisos, marcada por defecto,
  - validación del teléfono: celular colombiano de 10 dígitos que empieza por 3, o número con prefijo internacional; ya no se aceptan fijos.
- **Detalle de cita en el panel:**
  - campo de valor final y desplazamiento,
  - botón "Rechazar comprobante",
  - historial de avisos con su estado,
  - alerta de fallo con el enlace manual.
- **Mensajes:** las plantillas automáticas aparecen en solo lectura con la etiqueta "aprobada por WhatsApp"; las manuales siguen editables.
- **Página nueva "WhatsApp":**
  - gasto del mes (real y estimado; en COP aproximado si Meta cobra en USD),
  - mensajes por tipo, gratis frente a pagados,
  - entregados, leídos y fallidos con enlace a la cita,
  - comparación con el mes anterior,
  - barra del tope con aviso al 80%.
- **Ajustes:** horas del recordatorio, tope mensual, tasa USD→COP y costo estimado por mensaje.

### Plantillas de Meta (categoría utilidad, idioma es)

- `abono_recibido`, `recordatorio_cita`, `cupo_liberado` y `comprobante_rechazado`.
- Parámetros posicionales derivados de los placeholders actuales: nombre, servicio, fecha, hora y motivo.
- Se crean y aprueban en el administrador de WhatsApp de Meta. El código las referencia por nombre.

### Configuración

- Variables nuevas: `WA_TOKEN` (usuario del sistema, sin vencimiento), `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_ACCOUNT_ID` (para la analítica de gasto), `WA_APP_SECRET`, `WA_VERIFY_TOKEN` y `CRON_SECRET`. Se documentan en el ejemplo de entorno.
- En desarrollo apuntan al número de prueba de Meta. En producción, al número real de Betsy en coexistencia.

## Testing Decisions

- **Un solo punto de prueba:** el módulo de dominio de citas, probado con **Vitest** (dependencia de desarrollo nueva) contra fakes en memoria del almacén, del cliente de WhatsApp y del reloj.
- **Qué hace un buen test aquí:** prueba comportamiento observable a través de las operaciones públicas: estado resultante de la cita, avisos registrados o enviados al fake de WhatsApp, valores calculados. No prueba funciones internas ni la forma en que se escribe en la base.
- **Casos a cubrir:**
  - precio fijado al reservar con largo y sin largo (servicio sin precio → null);
  - ajuste de valor final antes y después de confirmar el abono; saldo con piso en 0; desplazamiento incluido;
  - confirmar abono envía "abono recibido" una sola vez; sin permiso, queda bloqueado y se ofrece el enlace manual;
  - rechazar comprobante: vuelve a pendiente, reinicia el plazo y envía el aviso con el motivo;
  - `tick`:
    - vence a las 24 h; vence a las 2 h con la cita cercana;
    - no vence con comprobante en revisión; reinicia el plazo tras un rechazo;
    - envía el recordatorio a las N h; no lo envía si la confirmación fue tardía;
    - es idempotente al ejecutarse dos veces;
  - tope de gasto: bajo el tope envía; en el tope bloquea; el aviso al 80% se refleja en el resumen; reinicio al cambiar de mes;
  - fallo del cliente de WhatsApp: queda `fallido` y la cita marca la alerta;
  - registrar estado: enviado → entregado → leído; un estado que llega fuera de orden no retrocede.
- **Fuera del punto de prueba:** los adaptadores de Supabase, Meta y Google, la validación de firma del webhook y las pantallas se verifican a mano con el número de prueba de Meta. La validación de firma, si se quiere, se puede cubrir con un test unitario pequeño, pero no es obligatorio.
- **Prior art:** el repo no tiene tests. Este es el primer conjunto y establece el patrón (fakes inyectados en el dominio).

## Out of Scope

- Bandeja de chat dentro del panel (leer y responder conversaciones o recibir comprobantes por WhatsApp en el panel).
- Respuestas automáticas o bots.
- Limitar o bloquear respuestas de la clienta (sus mensajes son gratis y no se pueden bloquear).
- Aviso previo al vencimiento del cupo.
- Crear o editar plantillas de Meta desde el panel.
- Mensajes de marketing o campañas.
- Pagos en línea o verificación automática del comprobante.
- Reprogramación de citas por parte de la clienta.

## Further Notes

- **Costos de Meta (precio por mensaje desde julio de 2025):**
  - los mensajes de la clienta son gratis;
  - dentro de la ventana de 24 h tras un mensaje de la clienta, las respuestas y las plantillas de utilidad son gratis;
  - solo se pagan las plantillas enviadas fuera de esa ventana.
  - El campo de precio del webhook indica si cada mensaje fue facturable; con eso se separan gratis y pagados.
- **Trámites que no son de código:** verificación del negocio en Meta, alta del número en coexistencia y aprobación de las cuatro plantillas. Se pueden hacer en paralelo con el desarrollo usando el número de prueba.
- **Supabase:** pg_cron y pg_net deben estar habilitados en el proyecto. El secreto del cron se guarda en Vault y no en la definición del job.
- **Modo demo:** el sitio tiene un modo demo sin Supabase. El módulo de dominio con almacén inyectable debe seguir funcionando ahí o degradar con elegancia.
