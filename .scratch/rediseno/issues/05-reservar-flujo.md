# 05: /reservar, flujo más ágil

**What to build:** En /reservar la clienta ve:
- Servicios en tarjetas compactas (nombre, "desde", duración). Los precios por largo aparecen solo en el servicio elegido.
- Un "Continuar" fijo abajo con el resumen de su elección.
- Pasos con nombre (Servicio · Fecha · Datos) y el actual marcado; los pasos completados se pueden tocar para volver.
- Si llega con `?servicio=` válido, empieza en la elección de fecha.
- Al elegir un día, la página lleva a las horas, con placeholders mientras cargan.
- Una línea de abono con ícono cerca del botón final.

La API y la lógica de reserva no cambian. Spec: Implementation Decisions → "/reservar".

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] El paso 1 mide ≤ 1 pantalla y media a 390 px
- [ ] "Continuar" está siempre visible y muestra el servicio elegido con su precio "desde"
- [ ] `?servicio=ondas` abre directo en el paso 2 con ondas elegido
- [ ] Los pasos tienen nombre, `aria-current="step"` y se puede volver tocando uno completado
- [ ] Al elegir un día se ven las horas (o sus placeholders) sin buscarlas
- [ ] Una reserva completa sigue funcionando en modo demo
