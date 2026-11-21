# 06: /reservar, accesibilidad y feedback

**What to build:** Quien reserva con teclado o lector de pantalla no se pierde:
- Al cambiar de paso, el foco va al título del paso nuevo y se anuncia.
- Las horas son radios reales que se recorren con flechas; se anuncia solo "N horarios disponibles".
- Los errores se quedan hasta corregirse y reciben el foco.
- Si la hora ya se ocupó (409), aparece "Elegir otra hora" en vez del salto automático.
- Al enviar se ve "Apartando…" con un indicador.
- El desplazamiento respeta reducir movimiento.
- Los enlaces pequeños y los días del calendario miden al menos 44 px.

Spec: Implementation Decisions → "/reservar".

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Tras "Continuar", `document.activeElement` es el título del paso nuevo
- [ ] Las horas son `input type=radio` dentro de un fieldset y se navegan con flechas
- [ ] La región en vivo anuncia solo el conteo de horarios
- [ ] Un error sigue visible pasados 4 s y desaparece al corregirse
- [ ] Un 409 muestra el botón "Elegir otra hora" y no hay salto automático
- [ ] El botón de envío muestra "Apartando…" y queda deshabilitado mientras envía
- [ ] Con reducir movimiento no hay scroll suave; las áreas táctiles miden ≥ 44 px
