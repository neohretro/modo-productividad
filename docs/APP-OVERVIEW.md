# MODO CREADOR - Productividad — contexto completo de la app

_Documento para alimentar el trabajo de landing / copy. Describe todo lo que la
app hace hoy (v0.1.1, beta) y lo que viene._

---

## Qué es

App de **escritorio para Windows** (Mac más adelante) de **productividad para
creadores de contenido**. Parte del ecosistema **MODO CREADOR** (junto a Planner,
Academy, Community, Gear, Lab). Está en **beta**.

No es un gestor de tareas más. Está pensada para el día a día de quien vive de
crear: planear lo del día, enfocarse en una cosa a la vez, y ver en qué se fue el
tiempo — sin fricción y sin estrés.

## Para quién

Freelancers, community managers, editores, equipos de marketing y creadores
independientes. Cualquiera que maneje varias marcas / varios frentes y necesite
foco.

## La idea central (el diferenciador)

- **Vive flotando en tu pantalla, no en una pestaña.** La ventana principal es una
  burbuja mini translúcida, siempre visible, que estorba lo mínimo.
- **Una tarea a la vez.** Si intentas enfocar varias, te avisa (con un dato real
  de la American Psychological Association: el multitasking baja la productividad
  hasta ~40% por el costo de cambiar de tarea). Es un aviso, nunca un bloqueo.
- **El tiempo se mide en silencio.** No hay un cronómetro corriendo que te
  estrese. El dato aparece cuando terminas ("te tomó 25 min") y se acumula en el
  Resumen.
- **Local y rápida.** Funciona sin internet y sin cuenta. Tus tareas viven en tu
  PC.
- **Con un toque de videojuego.** Racha diaria con "protector de racha" tipo
  Duolingo, para que cerrar el día se vuelva hábito.

---

## Cómo funciona

### La ventana mini (la principal)

Una burbuja de vidrio flotante, siempre encima de todo, que puedes arrastrar a
donde quieras. Muestra:

- **El anillo de avance del día** — el % de tareas completadas.
- **Un selector** para ver las tareas de "Hoy" o las de cualquier proyecto.
- **La lista de tareas**, cada una con: ▶ para ponerte a trabajarla, ⏸ para
  pausar, ✓ para completarla. Las pausadas se marcan como tal, con el tiempo que
  llevas.
- **Un campo para agregar tareas** sin salir del mini.
- **Clic derecho en una tarea**: editar, copiar el texto, duplicar, moverla a
  mañana o a otra fecha, moverla a un proyecto, ponerle un **recordatorio**
  (en 1 h, hoy a las 18:00, mañana a las 9:00 o la hora que elijas), o eliminarla.
- **Un botón para expandir** a la ventana completa.

### La ventana completa

Cinco secciones:

**Hoy** — Card de bienvenida con saludo según la hora. El anillo de avance grande.
Tarjetas de stats: tareas completadas, racha, mini gráfico de los últimos 7 días.
La lista continua de tareas del día. Un botón "Copiar lista" que copia tus
pendientes con viñetas (para pegárselos a una IA, por ejemplo). Y una sección
"Programadas" con las tareas que pusiste para una fecha futura, que aparecen solas
ese día.

**Semana** — Vista de calendario: los 7 días (lunes a domingo) en columnas, con
navegación entre semanas y un botón para volver a hoy. Cada día muestra sus
tareas — los días pasados, lo que completaste ese día; hoy, tu lista de Hoy; los
días futuros, lo que dejaste programado. Puedes agregar una tarea a un día
concreto y arrastrar una tarea de un día a otro para reprogramarla.

**Proyectos** — Crea proyectos (MODO Planner, Gear, lo que sea), renómbralos,
elimínalos. Cada proyecto tiene su propio anillo de progreso **acumulado** (no se
reinicia solo, vive semanas). Chips para cambiar de uno a otro.

**Resumen** — Elige el período (hoy / 7 días / 30 días) y ves:
- En qué trabajaste, agrupado por proyecto, con el tiempo de cada tarea.
- El progreso de cada proyecto activo.
- Tu consistencia de los últimos 14 días (mini gráfico de barras).
- 3–5 observaciones sobre **tus propios datos**, en tono directo (nunca regaño):
  "«Responder DMs» lleva 4 días rodando, ¿la partes en algo más chico?", "Esta
  semana cerraste menos días completos que la anterior", "Planner no tiene
  movimiento hace 5 días", "Racha de 4 días, vas en buen ritmo", "Promedio por
  tarea con cronómetro: 23 min".

**Ajustes** — Tema (claro / oscuro / el del sistema), iniciar con Windows, atajo
global de teclado, aviso de multitasking, activar el modo mini, la cuenta para
sincronizar, y las actualizaciones.

### "Hoy" vs. Proyectos — la diferencia clave

- **"Hoy" no se vacía cada día.** Es una lista continua. Al cambiar de día se
  guarda una foto (para el Resumen), las tareas completadas se archivan, y las
  pendientes se quedan — cada una con un contador de cuántos días lleva rodando.
- **Los proyectos no se reinician nunca.** Su progreso crece o cambia solo cuando
  tú agregas, completas o borras tareas.

### El modo enfoque

Eliges una tarea y le das ▶. Corre un cronómetro **invisible**. Puedes pausar y
reanudar (con el mismo botón): el tiempo se acumula entre tramos, la pausa no
cuenta. Al completar la tarea, ves un aviso breve con lo que te tomó, y ese tiempo
queda en el Resumen agrupado por proyecto.

Una tarea pausada se ve distinta de una que no has empezado: muestra "en pausa" y
el tiempo que ya llevas, para que te acuerdes de retomarla.

**Las tareas de proyecto que trabajas hoy aparecen también en "Hoy".** Si le das ▶
a una tarea de un proyecto, se suma a tu lista de Hoy (con una etiqueta que dice de
qué proyecto es) y se queda ahí todo el día, aunque la pauses, hasta que la cierres
o cambie el día. Así lo que estás haciendo hoy vive en un solo lugar.

Si enfocas dos o más tareas a la vez, aparece el aviso de multitasking: una
notificación de Windows con el dato completo, y en la app un recordatorio
discreto de una línea. Es suave y con cooldown; puedes seguir si quieres.

### Recordatorios

A cualquier tarea le puedes poner un recordatorio con clic derecho: presets
rápidos (en 1 hora, hoy a las 18:00, mañana a las 9:00) o la fecha y hora exacta
que quieras. A esa hora salta una **notificación nativa de Windows** con el texto
de la tarea; un clic te lleva a la app. Si la hora llegó con la app cerrada, el
aviso aparece la próxima vez que la abres (hasta 24 h después). Las tareas con
recordatorio muestran una campanita.

### La racha

Sube un día si lo cierras al 100%. Se rompe si fallas. Pero tienes un **protector
de racha** (freeze) que cubre un día fallado sin perderla — ganas uno cada 5 días
seguidos (máximo 3 guardados).

### Comportamiento nativo de escritorio

- **Ícono en la bandeja del sistema** con menú: Mostrar, Ventana completa, Modo
  mini, Iniciar con Windows, Salir.
- **Atajo global** (Ctrl+Shift+M por defecto, configurable) para mostrar u ocultar
  la app desde cualquier lugar.
- **Inicia con Windows** en segundo plano (activado por defecto, se puede apagar).
- Cerrar la ventana completa te devuelve al mini. Salir de verdad es desde la
  bandeja.

### Sincronización en la nube (opcional)

La app funciona **sin cuenta**: tus tareas viven en tu computadora. Si quieres
tenerlas en varios equipos, en Ajustes hay una sección **"Cuenta"**: escribes tu
correo, te llega un código de un solo uso, lo tecleas y listo (sin contraseñas).

Desde ese momento, cada cambio se guarda solo en la nube unos segundos después, y
cada equipo con tu sesión se mantiene al día. Si dos equipos cambiaron cosas
distintas, se combinan sin perder nada. Puedes cerrar sesión cuando quieras y la
app sigue funcionando en local.

Es la misma cuenta del ecosistema MODO CREADOR. Al entrar puedes marcar si quieres
recibir novedades por correo (opcional).

### Actualizaciones automáticas

La app revisa sola si hay una versión nueva. Cuando la hay, muestra una barra:
**"Nueva versión disponible → Descargar"**, y al terminar **"Actualización lista →
Reiniciar e instalar"**. Un clic y queda al día. También hay un botón manual en
Ajustes.

---

## Descarga e instalación

- **Plataforma:** Windows 64-bit. (Mac en el roadmap.)
- **Descarga:** https://github.com/neohretro/modo-productividad/releases/latest
  (el enlace siempre lleva a la última versión).
- **Instalador:** ~112 MB. Asistente con "Siguiente" — elige carpeta, crea
  accesos directos. **No pide permisos de administrador** (se instala por
  usuario).
- **Aviso de Windows:** como la beta va **sin firma de código**, SmartScreen
  muestra un aviso azul la primera vez ("Windows protegió tu PC"). Se resuelve con
  **"Más información" → "Ejecutar de todas formas"**. (Se quitará al comprar un
  certificado de firma para la versión pública.)
- **Versión actual:** 0.4.3

## Privacidad

- Todo es **local por defecto**. Tus tareas viven en tu computadora; sin cuenta no
  hay ningún servidor de por medio.
- La **sincronización en la nube es opcional** y solo se activa cuando tú inicias
  sesión. Puedes cerrar sesión cuando quieras.
- Al desinstalar, **no se borran tus tareas** (por si reinstalas).

---

## Roadmap (lo que viene)

- **Versión para Mac.**
- **Plan de pago** (a futuro): la sincronización básica seguirá siendo gratis.

---

## Marca

Parte del ecosistema **MODO CREADOR**. Mismo sistema visual: negro (#070707),
papel (#F4F3EF), naranja (#FF8C00) como único acento, y la "esquina activa" que
marca dónde algo empieza. El isotipo de la app es la "O" de MODO como una tarjeta
con una ventana dentro y la esquina naranja.

Tagline del sistema: **"Activa tu modo creador."**
