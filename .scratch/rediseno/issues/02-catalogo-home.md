# 02: Módulo "catálogo del home" con tests

**What to build:** Un módulo puro que deriva lo que muestra el nuevo home: servicios con etiquetas de paquete y enlace de reserva, opciones de ocasión (precio, "desde", unidad, abono, inclusiones, duración, acción reservar o cotizar por WhatsApp), el texto del horario de hoy en la zona de Bogotá, y la FAQ del home sin la pregunta de precios. Se añade vitest con la misma versión y el mismo script `test` que la rama del abono. Spec: Implementation Decisions → "Módulo nuevo y puro" y Testing Decisions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `npm test` corre vitest y pasa
- [ ] Cada servicio trae sus etiquetas de paquete correctas y `/reservar?servicio=<slug>`
- [ ] Opciones de ocasión: abono del 50 % redondeado a mil, "a cotizar" sin precio, acción WhatsApp sin servicio asociado, "por persona" en grupos
- [ ] Horario de hoy: correcto en Bogotá, también en la frontera de medianoche UTC; "Hoy no atiendo" en días deshabilitados
- [ ] La FAQ del home excluye la de precios y conserva las demás en orden
