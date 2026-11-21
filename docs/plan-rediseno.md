# Plan: rediseño del home y de /reservar

> Grilling del 2026-11-21 (dos rondas) más la evaluación de tres expertos: crítica visual, accesibilidad, y motion e interacción.
> Prototipo con las variantes: rama `prototype/rediseno-home` (fuente primaria; no va a main).

## Por qué

- El home mide **14 844 px a 390 px de ancho**, unas 17,6 pantallas. La mayoría de las clientas llegan en celular desde Instagram o WhatsApp.
- La primera foto de un trabajo aparece a unos 7 000 px. Antes hay unas 5 pantallas de precios.
- Los precios salen tres veces: paquetes, servicios y la pregunta de la FAQ.
- Las CTAs compiten entre sí. "Reservar mi cita" lleva a `/reservar`. "Apartar mi fecha" abre WhatsApp en los paquetes y en la barra fija lleva a `#paquetes`.
- Hay unos 15 bucles decorativos (cintas, órbita, blobs, glows, mechones, sello girando) y animaciones de aparición en unos 60 elementos.
- El texto blanco sobre el botón arcilla tiene un contraste de 4.23:1 (WCAG pide 4.5). Los eyebrows en arcilla quedan en 3.88:1.
- En `/reservar`:
  - El paso 1 mide unos 1 700 px y "Continuar" no está fijo.
  - Al cambiar de paso, el foco se pierde.
  - Las horas usan `role="radio"` pero no se manejan con teclado.
  - Los errores se borran solos a los 4 s.

## Decisiones

| # | Decisión |
|---|---|
| R1 | Se rediseñan el home y `/reservar`. El panel admin queda fuera, salvo lo que cambie por los tokens globales. |
| R1 | Mobile-first: todo se valida primero a 390 px. |
| R1 | Se mantienen el logo y la identidad: crema/arcilla/salvia y Fraunces + Jost. |
| R1 | El cambio es una **reestructuración**: reordenar, fusionar y quitar secciones. No es un pulido ni un rediseño total. |
| R2-Q1 | Base: **variante A "Lookbook"**. De la variante B se toman el **panel de ocasión** (precio, abono e inclusiones) y la **barra fija inferior** "Reservar + WhatsApp". |
| R2-Q2 | La acción principal es **reservar online** con "Reservar", que lleva a `/reservar?servicio=…`. WhatsApp queda como opción secundaria. Lo que no tiene precio (novia, peinado + maquillaje, grupos) se cotiza por WhatsApp. |
| R2-Q3 | Paquetes y servicios se unen en **"Servicios y precios"**, con los paquetes como etiquetas. Sale de la FAQ la pregunta de precios. Las páginas `/grados`, `/quince` y `/novias` se mantienen. |
| R2-Q4 | Se quita toda la decoración en bucle. La aparición animada queda solo en los títulos. El subrayado de "accesorio" se queda como único detalle de marca. |
| R2-Q5 | Contraste en los tokens globales: fondo del botón `#a4512f` (5.33:1) y texto pequeño en arcilla con `--clay-deep`. Aplica también al admin. |
| R2-Q6 | El mapa embebido se cambia por un botón "Cómo llegar" más el horario de hoy. Contacto y footer se unen en uno solo. |
| R2-Q7 | `/reservar` tendrá: "Continuar" fijo con resumen, pasos con nombre, salto al paso 2 cuando llega `?servicio=`, foco gestionado, radios reales para las horas, errores persistentes y spinner al enviar. |
| R2-Q8 | El filtro de galería por ocasión queda fuera: requiere un cambio de esquema. |
| R2-Q9 | Las reseñas siguen ocultas hasta tener 3 reales. Cuando aparezcan, irán junto a la galería. |
| R2-Q10 | Spec y plan en `docs/`. Implementación en la rama `feat/rediseno`, creada desde main y en su propio worktree. |

## Nuevo orden del home (móvil)

Hero de una pantalla → Galería → Servicios y precios (con panel de ocasión y franja de domicilio) → Sobre mí corto → FAQ (4) → Cierre con horario de hoy → Footer con contacto. Meta: **≤ 5 000 px a 390 px**.
