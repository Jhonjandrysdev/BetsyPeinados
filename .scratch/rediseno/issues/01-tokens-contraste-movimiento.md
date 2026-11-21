# 01: Tokens de contraste y movimiento

**What to build:** Todo el sitio (home, /reservar, páginas por evento y admin) gana contraste AA en botones y rótulos pequeños, tiene menos aire vertical entre secciones en celular, responde al toque con `:active` y anima la aparición solo en los títulos de sección. Base de spec: `docs/spec-rediseno.md` → Implementation Decisions, "Tokens globales" y "Animación de aparición".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] El texto blanco sobre el botón principal da ≥ 4.5:1 (fondo `#a4512f`; hover `--clay-deep`)
- [ ] Los eyebrows y rótulos pequeños en arcilla dan ≥ 4.5:1 sobre crema y crema-2
- [ ] `--muted` da ≥ 4.5:1 sobre crema-2
- [ ] El padding vertical de sección es `clamp(3rem, 8vw, 6rem)` y el tracking del eyebrow es 0.12em
- [ ] Ya no hay brillo que barra los botones en hover; `:active` escala a 0.97
- [ ] La aparición animada solo afecta a los títulos de sección, el hero aparece ya visible y reducir movimiento sigue respetado
- [ ] El admin se ve igual salvo por el mejor contraste
