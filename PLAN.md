# MODO CREADOR - Productividad — Plan de Desarrollo

App de escritorio de productividad · MODO Creador · Beta

Documento fuente de verdad para el desarrollo fase por fase.

---

## 1. Nombre

**MODO CREADOR - Productividad.** Misma convención que _MODO CREADOR - Planner_: marca madre
+ línea de producto, sin submarca ni logo independiente (regla Brand OS 2026).

El mecanismo visual (el anillo de avance con el punto que orbita) es metáfora de interacción,
no nombre de producto.

## 2. Referencias — qué tomamos

| Referencia | Qué tomamos | Qué NO tomamos |
| --- | --- | --- |
| ZenWave (bento dashboard) | Estructura de bento grid: card grande + cards pequeñas de stats. Anillo circular central. Mini-gráfico de picos junto a un stat. | Paleta lavanda/coral, estilo "wellness app", ilustración 3D. |
| Music player (glass) | Glassmorphism: cards translúcidas con blur y borde de luz. Jerarquía limpia: elemento circular protagonista + controles debajo. | Fondo claro/pastel, degradados saturados, estilo "player". |
| Daily Cockpit (sales dashboard) | Concepto de "centro de mando": card de bienvenida con avatar, nav inferior con íconos, mezcla de donuts + barras en un grid. | Densidad de información, paleta corporativa azul/blanco plano. |

**Dirección final:** bento grid + glassmorphism en el sistema MODO (negro casi puro, blanco hueso,
naranja como único acento). Glass = transparencia sobre negro + blur (premium/cinematic), no
sobre fondos claros.

## 3. Sistema de diseño (tokens)

### Color

```
--ink:               #070707                    fondo base
--ink-glass:         rgba(244,243,239,0.04)      relleno de card (glass sobre negro)
--ink-glass-strong:  rgba(244,243,239,0.07)
--border:            rgba(244,243,239,0.10)      borde de card
--paper:             #F4F3EF                     texto principal
--paper-dim:         rgba(244,243,239,0.55)      texto secundario
--orange:            #FF8C00                     único acento — activo, progreso, CTA
--orange-glow:       rgba(255,140,0,0.18)        resplandor ambient, no relleno sólido
```

### Tipografía

Aptos Display (titulares, bold, 28–40px) / Aptos (cuerpo, regular/medium, 13–15px).
Fallback: Inter o system-ui.

### Layout

Bento grid de 12 columnas, gap 16px. Radio 20–24px en cards grandes, 14px en chips/botones.
Padding interno mínimo 24px en cards principales. Mucho aire.

### Glassmorphism (modo oscuro)

```css
background: var(--ink-glass);
backdrop-filter: blur(20px);
border: 1px solid var(--border);
```

Nunca blanco sólido, nunca pastel de fondo.

### Elemento de firma

**El anillo de avance:** ring de progreso circular con un punto naranja que _orbita_ el anillo
mientras avanza el porcentaje del día (no un donut estático). Traducción del astronauta/espacio
a una métrica de producto. Reemplaza al "Work-Life Balance" de ZenWave y a los donuts del Daily
Cockpit.

La **esquina activa** (gesto naranja del logo) se repite en miniatura en la esquina superior
derecha de la card principal.

## 4. Estructura de pantalla (bento grid)

```
┌─────────────────────────────────────────────┐
│  Saludo + fecha            [avatar/astronauta]│  ← card bienvenida
├───────────────────┬───────────────────────────┤
│                   │  Tareas completadas: 4/6   │
│   ANILLO DE       ├───────────────────────────┤
│   AVANCE (grande) │  Racha: 12 días            │
│                   ├───────────────────────────┤
│                   │  Mini gráfico 7 días        │
├───────────────────┴───────────────────────────┤
│  Selector de proyectos (chips)                 │
├─────────────────────────────────────────────┤
│  Lista de tareas del proyecto activo           │
│  (checkbox glass + swipe/hover para borrar)    │
├─────────────────────────────────────────────┤
│  + Agregar tarea                               │
└─────────────────────────────────────────────┘
     [Hoy] [Proyectos] [Resumen] [Ajustes]       ← nav inferior, ícono naranja en activo
```

**Modo mini (flotante):** el anillo de avance solo, en una burbuja de vidrio arrastrable,
`alwaysOnTop`, con el punto orbitando.

### 4.1 Dos modelos de progreso: Hoy vs. Proyectos

**"Hoy" no se reinicia. Se actualiza.** Es una lista continua, no una lista que se vacía cada 24h.

Al cambiar de día (detectado al abrir la app, o con timer si queda en segundo plano):

1. Se toma una foto del día que terminó (`DailySnapshot`) → alimenta el Resumen.
2. Las tareas completadas se archivan (salen de la lista activa, quedan en historial).
3. Las tareas pendientes se quedan en "Hoy", cada una con `daysRolled++`.
4. Durante el nuevo día se siguen agregando tareas normalmente a la misma lista.

El anillo de "Hoy" refleja: `completadas hoy / (pendientes de antes + nuevas de hoy)`.

**Los proyectos** (Planner, Gear, los que crees) tienen progreso **acumulado**. Un proyecto
nunca se reinicia solo. Su progreso (`completadas / total`) cambia solo cuando agregas, completas
o borras tareas. Puede vivir semanas. **Claude Code no debe aplicar la lógica de reinicio diario
a los proyectos.**

### Modelo de datos

Ver [`src/shared/types.ts`](src/shared/types.ts). Resumen:

```ts
Task { id, text, done, projectId, createdDate, completedDate, daysRolled }
DailySnapshot { date, totalTasks, completedTasks, completionRate, tasksCarriedOver }
Project { id, name, tasks: Task[], createdDate }   // progreso acumulado, nunca resetea solo
```

### 4.2 Resumen: datos y sugerencias

Nueva pantalla (reemplaza y amplía "Estadísticas"). Muestra:

- **En qué trabajaste:** tareas completadas del período (hoy / semana / mes), agrupadas por proyecto.
- **Progreso por proyecto:** barra/anillo pequeño por cada proyecto activo (avance acumulado).
- **Racha y consistencia:** historial de `DailySnapshot` como mini gráfico de barras (Lun–Dom, % de cierre).
- **Puntos de mejora:** 3–5 observaciones a partir de los datos, en tono directo y útil (nunca regaño). Reglas locales, sin IA:
  - `daysRolled >= 3` → "Esta tarea lleva 3 días rodando. ¿La partes en algo más chico o la sueltas?"
  - Tasa de cierre semanal baja vs. semana anterior → "Esta semana cerraste menos días completos."
  - Proyecto sin tareas nuevas > 5 días → "Planner no tiene movimiento hace 5 días."
  - Racha en buen ritmo → refuerzo simple.

**Stretch (Fase 5):** enviar el resumen semanal a la API de Claude para redactar resumen y
sugerencias en lenguaje natural. Para v1 no hace falta.

## 5. Arquitectura técnica

| Pieza | Elección |
| --- | --- |
| Runtime | **Electron** (no Tauri) — `alwaysOnTop` + ventanas transparentes sin bordes de fábrica |
| Build | **electron-vite** |
| UI | **React + TypeScript** |
| Estilos | **Tailwind CSS** con los tokens de §3 en `tailwind.config.ts` |
| Animación | **CSS** `@keyframes` + transiciones — curva `cubic-bezier(0.22,1,0.36,1)`, 250–850ms, sin rebotes (Framer Motion se descartó por bugs de bundling con Vite/Electron) |
| Estado | **Zustand** |
| Persistencia | **electron-store** (JSON en disco, sin backend) |
| Empaquetado | **electron-builder** (.exe Windows; .dmg Mac más adelante) |

### Comportamiento nativo clave

- `BrowserWindow` con `alwaysOnTop`, `frame: false`, `transparent: true`, `resizable: false` para el modo mini.
- Ícono en system tray: Mostrar/Ocultar, Modo mini, Salir.
- Atajo global (`Ctrl+Shift+M`) para mostrar/ocultar.
- Inicio automático con Windows (configurable en Ajustes, no forzado).

## 6. Estructura de carpetas

```
modo-productividad/
├── src/
│   ├── main/        index.ts, tray.ts, windows.ts, store.ts
│   ├── preload/     index.ts
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── components/  ProgressRing, ProjectChips, TaskList, StatCard, MiniFloating, BottomNav
│   │       ├── screens/     Today, Projects, Summary, Settings
│   │       ├── store/       useAppStore.ts
│   │       ├── styles/      tokens.css
│   │       └── App.tsx
│   └── shared/      types.ts
├── tailwind.config.ts
├── electron-builder.yml
└── package.json
```

## 7. Roadmap

### Fase 0 — Bootstrap ✅

- [x] Electron + React + TS + Tailwind (electron-vite).
- [x] Tokens de color/tipografía en `tailwind.config.ts` + `tokens.css`.
- [x] Ventana principal sin bordes nativos, con glass funcionando.

### Fase 1 — Core funcional (paridad con el prototipo web) ✅

- [x] Estado global de proyectos y tareas (Zustand + electron-store en disco vía IPC).
- [x] `ProgressRing` con el punto orbitando (transición CSS + count-up, ease modo ~850ms).
- [x] Lista de tareas: checkbox glass, agregar/completar/borrar/editar (doble clic).
- [x] Selector de proyectos (chips) + crear/renombrar/eliminar proyecto.
- [x] Lógica "Hoy" continua + rollover diario + `DailySnapshot` (`src/shared/rollover.ts`).
- [x] Racha con corte por fecha + protector de racha (freeze). 7 tests en vitest.

Nota: la animación del anillo se hace por transición CSS, no por Framer Motion — es la
pieza más visible y así es 100% fiable. Framer Motion (`motion`) queda para microinteracciones
de Fase 3 (entrada de cards, etc.).

### Fase 2 — Comportamiento nativo ✅

- [x] Modo mini flotante (`BrowserWindow` aparte, `alwaysOnTop`, arrastrable, recuerda posición).
- [x] System tray + menú contextual (Mostrar / Ventana completa / Modo mini / Autostart / Salir).
- [x] Atajo global de teclado (configurable, default `Ctrl+Shift+M`).
- [x] Persistencia real en disco + sync main↔mini (`store:changed`).
- [x] Cerrar = a la bandeja; instancia única; inicio con Windows en segundo plano.
- [x] Pantalla de Ajustes funcional.

Nota: se quitó `motion` (Framer Motion) del renderer por bugs de bundling con Vite.
Animaciones por CSS `@keyframes` con la curva del Brand OS. Reevaluar en Fase 3 si hace falta.

### Fase 3 — Pulido UX/UI (bento grid completo)

- [ ] Card de bienvenida con saludo dinámico.
- [ ] Cards de stats (completadas, racha, mini gráfico 7 días).
- [ ] Pantalla de Resumen con detalle histórico.
- [ ] Nav inferior con las 4 secciones.
- [ ] Microinteracciones: hover, transición al marcar tarea, entrada de cards.

### Fase 4 — Empaquetado y distribución

- [ ] electron-builder → instalador `.exe` Windows.
- [ ] Ícono de la app (isotipo MODO con la esquina naranja).
- [ ] Firma/notarización — evaluar interno vs. público.
- [ ] Auto-actualización (`electron-updater`) — stretch, no bloqueante.

### Fase 5 — Stretch (post-beta)

- [ ] Sincronización opcional en la nube (Supabase).
- [ ] Vista de calendario/semana.
- [ ] Integración con MODO Planner (compartir proyectos).
- [ ] Notificaciones nativas de Windows.
- [ ] Resumen semanal redactado por la API de Claude.

## 8. Decisiones tomadas

- **Plataforma:** Windows primero, pero el código y `electron-builder.yml` ya contemplan Mac
  (target `dmg` arm64+x64). Sin firma de código por ahora.
- **Racha:** modelo tipo videojuego — se rompe si un día no se cierra al 100%, pero con
  **"protector de racha"** (freeze) tipo Duolingo: `StreakState.freezesAvailable` cubre un día
  fallado sin perder la racha. Cantidad y forma de ganar freezes se afina en Fase 1.
