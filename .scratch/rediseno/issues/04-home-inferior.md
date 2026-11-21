# 04: Home, parte inferior y UI fija

**What to build:** Debajo de los servicios, la clienta ve:
- Un "Sobre mí" corto con foto.
- Cuatro preguntas frecuentes en acordeón.
- Un cierre con el horario de hoy y "Reservar ahora".
- Un footer que incluye contacto, "Cómo llegar" (enlace a Maps, sin iframe) y redes, sin desbordes.

Además:
- El header enlaza a las nuevas secciones.
- La barra fija "Reservar + WhatsApp" aparece solo cuando los botones del hero salen de pantalla y no tapa el final.
- Se quitan la sección "tres pasos", el mapa embebido y el botón flotante en el home.

Spec: Solution y Implementation Decisions → "Barra fija" y "Header".

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Home ≤ 5 000 px a 390 px de ancho
- [ ] La barra fija aparece y desaparece según la visibilidad de los botones del hero (IntersectionObserver) y lleva a `/reservar`
- [ ] El cierre y el footer no quedan tapados por la barra
- [ ] El email largo no desborda; "Cómo llegar" abre Google Maps
- [ ] Los enlaces del header llevan a las secciones existentes; el menú móvil sigue funcionando
- [ ] Las reseñas siguen ocultas sin datos y se muestran junto a la galería si existen
