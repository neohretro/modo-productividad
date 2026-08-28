# Brand OS 2026 — extracto operativo

Fuente: `MODO_CREADOR_Brand_OS_2026.pdf` (52 pp). Aquí solo lo que afecta a esta app.

## Paleta (§32)

| Función | Hex | Rol en la app |
| --- | --- | --- |
| ESPACIO | `#070707` | fondo base (`--ink`) |
| CLARIDAD | `#F4F3EF` | texto / superficies claras (`--paper`) |
| ACTIVACIÓN | `#FF8C00` | **único** acento: acción, inicio, cambio de estado (`--orange`) |

Proporción de marca: **60% papel / 30% negro / 10% naranja**.
→ Esta app **invierte** a fondo oscuro dominante a propósito (glass cinematic sobre negro,
ver PLAN.md §2). El naranja sigue siendo ≤10% y solo señala estado activo/progreso/CTA.

## Tipografía (§33)

- **Aptos Display** — titulares, Bold. (Brand: 52–88pt; app: 24–40px escalado a UI.)
- **Aptos** — cuerpo, Regular/Medium. (Brand: 16–24pt; app: 13–15px.)
- Fallback: Inter → system-ui. Bundlear Aptos + Inter como assets en Fase 3 (CSP bloquea CDN).

## Sistema gráfico (§34) — "el gesto de activar"

1. **Esquina activa** — marca el punto donde algo inicia. → esquina naranja de la card principal + ícono activo del nav.
2. **Línea de progreso** — conecta idea, proceso y resultado. → el **anillo de avance** con el punto orbitando.
3. **Ventana** — enmarca una exploración sin encerrarla. → cards glass con borde sutil.

## Astronauta (§35–36)

Símbolo cultural, **no mascota**. NO se infantiliza, NO reemplaza el logo, **NO aparece en cada
pantalla**. Puede ser fotográfico/3D/ilustrado, proporción humana, tono premium. En la app:
presencia sutil y opcional en la card de bienvenida — no un personaje en cada vista.

## Motion (§40)

Tres movimientos: **ESPERA** (quieto) → **SEÑAL** (la esquina naranja aparece) → **EXPANSIÓN**
(el contenido entra con precisión). Duración base **600–900 ms**, curvas suaves, **sin rebotes,
glitches ni transiciones gratuitas**. Token: `transitionTimingFunction.modo`.

## Iconografía (§39)

Trazos 1.5–2 px, esquinas ópticas, sin rellenos decorativos, **naranja solo para estado activo**.
lucide-react con `strokeWidth={1.75}`.

## Voz (§44–46)

Directo · Humano · Útil · Curioso · Latino. "Planea. Crea. Aprueba. Publica." (verbos, no adjetivos).
Evitar: revolución, disruptivo, gurú, hack, fórmula secreta, éxito garantizado.
→ Aplica al copy de las sugerencias del Resumen (PLAN.md §4.2): observaciones, nunca regaño.
