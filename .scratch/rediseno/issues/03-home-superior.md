# 03: Home, parte superior (hero, galería, servicios y precios)

**What to build:** La clienta que entra al home en celular ve:
1. Un hero de una pantalla con foto real (o la foto de Betsy si no hay galería), el título de los ajustes, la ciudad, un único botón "Reservar mi cita" y un enlace a WhatsApp.
2. Justo después, la galería en cuadrícula de 2 columnas con el visor de fotos y el enlace a Instagram.
3. "Servicios y precios" en una lista compacta con etiquetas de paquete que llevan a la reserva con el servicio elegido.
4. Un panel de ocasión que muestra precio, abono e inclusiones.
5. Una franja corta de domicilio.

Desaparecen el arte animado del hero, las cintas, la sección de paquetes como tarjetas, la órbita y los glows. Las secciones que todavía no se rediseñan (sobre mí, FAQ, contacto) se dejan como están hasta el ticket 04. Spec: Solution y Implementation Decisions → "Home" y "Hero".

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Hero ≤ 1 pantalla a 390×844, sin animaciones en bucle
- [ ] La galería es la segunda sección; el visor sigue funcionando
- [ ] Cada fila de servicio lleva a `/reservar?servicio=<slug>`; los paquetes aparecen como etiquetas
- [ ] El panel de ocasión cambia con teclado y toque (tabs accesibles); las opciones sin precio invitan a cotizar por WhatsApp
- [ ] La franja de domicilio solo aparece si el ajuste lo activa
- [ ] El JSON-LD conserva todas las preguntas de la FAQ; `?src=` sigue viajando en los enlaces de WhatsApp
- [ ] Sin scroll horizontal a 390 px; el componente de paquetes sigue funcionando en las páginas por evento
