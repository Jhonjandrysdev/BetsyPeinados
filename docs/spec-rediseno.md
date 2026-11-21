# Spec: rediseño del home y de /reservar

> Decisiones de origen: `docs/plan-rediseno.md`, que recoge el grilling del 2026-11-21 y la evaluación de los expertos. Variantes del prototipo en la rama `prototype/rediseno-home`; la ganadora es la A ("Lookbook") con piezas de la B.

## Problem Statement

Las clientas de Betsy llegan casi siempre desde Instagram o WhatsApp, en el celular, y lo que quieren primero es ver peinados y saber cuánto cuestan. El home de hoy no les da eso:

- Mide unas 17 pantallas de celular.
- La primera foto aparece después de unas 5 pantallas de precios.
- Los precios se repiten en tres lugares.
- Los botones principales dicen cosas distintas y llevan a sitios distintos: unos a la reserva online, otros a WhatsApp o a otra sección.
- Las decoraciones animadas ocupan espacio y gastan batería sin informar nada.
- El texto de los botones y de los rótulos pequeños tiene poco contraste para leerse bien al sol.

Al reservar, el primer paso es muy largo y el botón "Continuar" queda al fondo. Quien usa lector de pantalla o teclado pierde el foco al cambiar de paso y no puede moverse entre las horas con las flechas. Los mensajes de error, además, desaparecen solos.

## Solution

- **Home más corto (≤ 5 000 px en celular).** El orden queda:
  1. Hero de una sola pantalla con foto real y una sola acción, "Reservar mi cita", más WhatsApp como enlace secundario.
  2. Galería justo después.
  3. "Servicios y precios" en una sola lista compacta, con los paquetes como etiquetas.
  4. Panel de ocasión: al elegir Grado, Quince u otro, muestra el precio, el abono y qué incluye.
  5. Franja corta de domicilio.
  6. "Sobre mí" breve.
  7. Cuatro preguntas frecuentes.
  8. Cierre con el horario de hoy.
  9. Footer con contacto.
- **Barra fija inferior "Reservar + WhatsApp".** Aparece solo cuando los botones del hero salen de la pantalla.
- **Sin decoración en bucle.** Contrastes que cumplen WCAG AA.
- **`/reservar` más ágil.**
  - Tarjetas de servicio compactas.
  - "Continuar" fijo con un resumen de lo elegido.
  - Pasos con nombre.
  - Si la clienta viene de un servicio concreto, entra directo a elegir fecha.
  - El foco y el lector de pantalla acompañan cada paso.
  - Las horas se eligen con radios reales.
  - Los errores se quedan hasta corregirse.
  - Al enviar se ve "Apartando…".

## User Stories

### Clienta en el home

1. Como clienta que llega desde Instagram, quiero ver una foto real de un peinado en la primera pantalla, para confirmar que llegué al lugar correcto.
2. Como clienta, quiero entender en una frase qué hace Betsy y en qué ciudad, para saber si me sirve sin seguir bajando.
3. Como clienta, quiero un único botón principal "Reservar mi cita", para no dudar entre varias opciones.
4. Como clienta que prefiere conversar, quiero un enlace visible a WhatsApp debajo del botón principal, para escribirle sin reservar todavía.
5. Como clienta, quiero ver trabajos recientes justo después del hero, para decidirme por el estilo antes de mirar precios.
6. Como clienta, quiero ver las fotos en una cuadrícula de dos columnas en el celular, para recorrer varias sin tanto scroll.
7. Como clienta, quiero un enlace al Instagram de Betsy junto a la galería, para ver más trabajos si me quedo con ganas.
8. Como clienta, quiero ver todos los servicios con su precio "desde" y su duración en una sola lista, para comparar de un vistazo.
9. Como clienta, quiero que cada servicio me lleve a la reserva con ese servicio ya elegido, para ahorrarme un paso.
10. Como quinceañera o graduanda, quiero elegir mi ocasión y ver al instante el precio por largo, el abono y qué incluye, para saber cuánto debo pagar.
11. Como novia, quiero que la opción "Novia" me invite a cotizar por WhatsApp, porque mi valor depende del diseño.
12. Como clienta que se arregla en grupo, quiero ver en una franja corta que Betsy va a domicilio y que desde 4 personas es gratis, para pedirlo por WhatsApp.
13. Como clienta, quiero que se me diga una sola vez que el cupo se aparta con el 50 %, para entender cómo funciona el abono.
14. Como clienta, quiero conocer a Betsy en pocas líneas y con su foto, para sentir confianza sin leer un bloque largo.
15. Como clienta, quiero las cuatro dudas más comunes en un acordeón, para resolverlas sin salir de la página.
16. Como clienta, quiero ver el horario de hoy en el cierre, para saber si me pueden atender pronto.
17. Como clienta, quiero un botón "Cómo llegar" que abra Google Maps, para llegar sin cargar un mapa pesado en la página.
18. Como clienta, quiero que el teléfono, el Instagram y la dirección estén en el pie de página sin desbordarse de la pantalla, para copiarlos fácil.
19. Como clienta que va bajando, quiero una barra fija con "Reservar" y WhatsApp solo cuando ya no veo los botones del hero, para tener la acción a mano sin que me tape contenido.
20. Como clienta, quiero que la barra fija no tape el final de la página ni los botones del cierre, para poder tocarlos.
21. Como clienta, quiero que la página cargue rápido y no se sienta pesada en mi celular, para no abandonarla.
22. Como clienta con poca visión o bajo el sol, quiero que los botones y los rótulos tengan buen contraste, para leerlos sin esfuerzo.
23. Como clienta con la opción "reducir movimiento" activa, quiero que nada se anime de forma innecesaria, para no marearme.
24. Como clienta, quiero que al tocar un botón se note que respondió, para saber que mi toque funcionó.
25. Como clienta en computador, quiero que el mismo contenido se vea ordenado en columnas, para aprovechar la pantalla.

### Clienta reservando

26. Como clienta, quiero ver los servicios del paso 1 en tarjetas compactas con nombre, "desde" y duración, para elegir rápido.
27. Como clienta, quiero ver los precios por largo solo del servicio que elegí, para que la lista no sea larga.
28. Como clienta, quiero que el botón "Continuar" esté siempre visible abajo con el resumen de mi elección, para avanzar sin buscarlo.
29. Como clienta que viene de un servicio concreto, quiero empezar directamente en la elección de fecha, para no repetir lo que ya elegí.
30. Como clienta, quiero ver el nombre de cada paso (Servicio · Fecha · Datos) y en cuál estoy, para saber cuánto me falta.
31. Como clienta, quiero volver a un paso anterior tocando su nombre, para corregir sin perder lo demás.
32. Como clienta, quiero que al elegir un día la página me lleve a las horas disponibles, para no tener que buscarlas.
33. Como clienta, mientras cargan los horarios quiero ver una señal de carga con la forma de los botones, para entender que algo está pasando.
34. Como clienta, quiero que la hora elegida quede claramente marcada, para estar segura de lo que aparté.
35. Como clienta que usa teclado, quiero moverme entre las horas con las flechas como en cualquier grupo de opciones, para elegir sin ratón.
36. Como clienta con lector de pantalla, quiero que al cambiar de paso se anuncie el paso nuevo, para no perderme.
37. Como clienta con lector de pantalla, quiero escuchar un resumen corto como "10 horarios disponibles" y no la lista entera, para no saturarme.
38. Como clienta, quiero que un error se quede visible hasta que lo corrija, para alcanzar a leerlo.
39. Como clienta, si la hora que elegí ya se ocupó, quiero un botón "Elegir otra hora" en vez de que la página salte sola, para entender qué pasó.
40. Como clienta, al tocar "Reservar" quiero ver "Apartando…" con un indicador, para no tocarlo dos veces.
41. Como clienta, quiero ver cerca del botón final cuánto abono con un ícono y una línea clara, para saber qué viene después.
42. Como clienta con "reducir movimiento" activo, quiero que el cambio de paso no haga un desplazamiento animado, para no marearme.
43. Como clienta, quiero que los enlaces y botones pequeños, como "Volver al inicio" o los días del calendario, sean fáciles de tocar, para no equivocarme.

### Betsy

44. Como Betsy, quiero que mis clientas lleguen a la reserva online con el servicio ya elegido, para recibir reservas completas y menos preguntas por chat.
45. Como Betsy, quiero que los precios aparezcan en un solo lugar del home, para no tener que mantener textos repetidos.
46. Como Betsy, quiero que las fotos de mi galería sean lo primero que se vea después del hero, para que mi trabajo venda por sí solo.
47. Como Betsy, quiero que las secciones de reseñas sigan ocultas hasta que tenga reseñas reales, para no mostrar algo vacío.
48. Como Betsy, quiero que las páginas por evento (grados, quince, novias) sigan funcionando, para no perder posicionamiento en Google.
49. Como Betsy, quiero que el panel admin herede el mejor contraste de los botones sin que cambie nada más, para leerlo mejor.
50. Como Betsy, quiero que el rastreo de origen (`?src=`) siga viajando en los mensajes de WhatsApp y en las reservas, para saber qué me trae clientas.

## Implementation Decisions

- **Módulo nuevo y puro, "catálogo del home".** Es la única costura nueva. Centraliza lo que hoy está repartido en el marcado del home y que la nueva versión necesita derivar:
  - **Servicios con etiquetas:** recibe los servicios activos y la lista de paquetes. Devuelve por cada servicio sus etiquetas de paquete (Grado, Quinceañera, Novia, Peinado + maquillaje) y su enlace de reserva `/reservar?servicio=<slug>`.
  - **Opciones de ocasión:** combina paquetes y servicios sueltos (ondas, niñas, peinado + maquillaje, grupo a domicilio). Cada opción trae etiqueta, precio (o "a cotizar"), si es "desde", unidad, abono (50 % redondeado a mil, con la regla de abono que ya existe), inclusiones, duración y acción. La acción es el enlace de reserva si hay servicio asociado, o la cotización por WhatsApp si no lo hay (grupos y opciones sin precio).
  - **Horario de hoy:** recibe el horario semanal y un instante. Devuelve un texto del tipo "Hoy atiendo de 08:00 a 18:00" u "Hoy no atiendo", calculado en la zona horaria de Bogotá.
  - **FAQ del home:** la lista de preguntas sin la de precios.
- **Home.** Se reescribe la página con el nuevo orden: hero, galería, servicios y precios con panel de ocasión y franja de domicilio, sobre mí, FAQ, cierre y footer. Se conservan:
  - La carga de datos actual (ajustes, servicios, horario, galería).
  - El JSON-LD de negocio y FAQ. El de FAQ conserva **todas** las preguntas, incluida la de precios, porque sirve al SEO aunque no se muestre.
  - El visor de fotos.
  - La caché del CDN.
- **Componentes que salen del home:** el arte animado del hero, las cintas, la órbita de domicilio, la sección "tres pasos", el mapa embebido y el botón flotante de WhatsApp en el home (lo reemplaza la barra fija). El componente de paquetes sigue vivo para las páginas por evento.
- **Hero.** Usa la primera foto de la galería y, si no hay, la foto de Betsy. La copia va sobre un degradado oscuro, con el título que ya viene de los ajustes (`hero_title`, con la última palabra en cursiva) y la ciudad.
- **Barra fija.** Pasa a una sola acción, "Reservar", hacia `/reservar`, más el ícono de WhatsApp. Se muestra con un IntersectionObserver sobre los botones del hero, no con un listener de scroll. La página reserva espacio inferior para que la barra no tape el cierre.
- **Header.** Los enlaces de navegación apuntan a las nuevas secciones (Trabajos, Servicios, Contacto) y se mantiene "Reservar cita".
- **Tokens globales.**
  - Nuevo token de acción `#a4512f`, el mismo tono que ya usa el admin como "clay-ink", para el fondo de los botones principales. El hover pasa a `--clay-deep`.
  - El texto pequeño en arcilla (eyebrows, rótulos) pasa a `--clay-deep`.
  - `--muted` se oscurece a un tono que dé ≥ 4.5:1 sobre crema-2.
  - El padding vertical de sección baja a `clamp(3rem, 8vw, 6rem)`.
  - El tracking del eyebrow baja a 0.12em.
  - Se quita el brillo que barre los botones en hover y se añade `:active` con escala 0.97.
- **Animación de aparición.** Se limita a los títulos de sección (opacidad y 8 px, unos 300 ms, sin escalonado). El hero aparece ya visible. Se mantiene el bloque de reducir movimiento.
- **`/reservar`.** La API y la lógica de reserva no cambian. Cambia solo la presentación y la interacción:
  - Tarjetas compactas. Los precios por largo se muestran solo en el servicio seleccionado.
  - "Continuar" fijo con resumen. Pasos con nombre y `aria-current="step"`. Los pasos completados se pueden tocar.
  - Con `?servicio=` válido se entra directo al paso 2.
  - Tras cada cambio de paso, el foco va al título del paso (`tabindex=-1`). El desplazamiento respeta reducir movimiento.
  - Las horas son `input type=radio` reales dentro de un fieldset. La región `aria-live` anuncia solo el conteo.
  - Placeholders mientras cargan las horas.
  - Los errores persisten hasta corregirse y el foco va al mensaje. En el conflicto de horario (409) aparece el botón "Elegir otra hora" y desaparece el salto automático.
  - El botón de envío muestra "Apartando…" con un indicador.
  - Una línea de abono con ícono cerca del botón final.
  - Áreas táctiles de al menos 44 px en enlaces pequeños y días del calendario.
- **Tests.** Se añade vitest con la misma versión y el mismo script `test` que la rama del abono, para que el merge sea limpio.
- **Datos y esquema.** Sin cambios de esquema ni de API.

## Testing Decisions

- **Un buen test** comprueba el comportamiento observable desde fuera: qué devuelve el módulo dados unos servicios, paquetes, horario e instante. No comprueba cómo lo calcula. No se testea marcado ni CSS.
- **Se testea solo el módulo "catálogo del home"** (la costura acordada):
  - Las etiquetas de paquete correctas por servicio y el enlace de reserva con el slug.
  - En las opciones de ocasión: abono del 50 % redondeado a mil, "a cotizar" cuando no hay precio, acción de WhatsApp para opciones sin servicio asociado, y "por persona" en grupos.
  - El horario de hoy en la zona de Bogotá, con casos en la frontera de medianoche UTC (un instante a las 03:00 UTC sigue siendo el día anterior en Bogotá) y un día deshabilitado.
  - La FAQ del home excluye la pregunta de precios y conserva las demás en orden.
- **Precedente:** los tests de lógica pura con vitest de la rama del abono (`cita`), que usan entradas mínimas tipadas con `Pick<…>` e instantes fijos.
- **Verificación visual (no automatizada):**
  - Capturas a 390 px y 1366 px del home y de `/reservar` en modo demo.
  - Medir el alto del home (meta ≤ 5 000 px a 390 px) y que no haya scroll horizontal.
  - Medir los contrastes de botones y eyebrows (≥ 4.5:1).
  - Recorrer `/reservar` con teclado y comprobar el foco tras cada paso.

## Out of Scope

- Filtro de la galería por ocasión, porque requiere guardar la ocasión de cada foto y añadirla al admin.
- Reseñas reales: el código ya las muestra cuando existan.
- Rediseño del panel admin, más allá de heredar los tokens de contraste.
- Las páginas por evento (`/grados`, `/quince`, `/novias`), `/reserva/[id]`, privacidad y 404, salvo lo que hereden de los tokens y del header.
- Cambios en la lógica de reserva, en los precios o en el abono.
- Cambio de paleta o de tipografías.

## Further Notes

- **Corrección a la evaluación de los expertos.** La "contradicción" de precios entre la FAQ y el paquete Grado no existe. El paquete Grado usa las tarifas de peinados sociales ($90 000 en medio largo) y la FAQ da las de ondas ($80 000). La pregunta de precios sale del home por la decisión de no repetir precios, no por un error.
- **Riesgo de merge.** La rama del abono, sin merge a main todavía, no toca las páginas, los componentes, los estilos ni las constantes por defecto que cambia este rediseño. Solo coinciden `package.json` y el lockfile al añadir vitest, que se resuelve regenerando el lockfile.
- El prototipo muestra fotos de ejemplo en modo demo. La verificación final con fotos reales debe hacerse en el preview de Vercel.
