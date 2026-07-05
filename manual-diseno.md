# Turnos Manager — Manual de diseño

> Guía de identidad visual y UX para la landing pública y el panel. Escrita para un
> gestor de turnos médicos/de consultorio en Argentina. Prioridad: **sobriedad,
> confianza y legibilidad** por encima de la expresividad. Stack de referencia:
> React 19 + Tailwind v4. Los tokens están pensados como custom properties para
> `@theme`.

---

## 1. Punto de vista

Los sitios de salud argentinos (Sanatorio Allende, Meducar, Docturno) comparten un
lenguaje conservador: azul/blanco, tipografía sans legible, mucho aire, un CTA claro
("Sacar turno" / "Agendar turno") y un buscador por profesional/especialidad/servicio.
Eso es lo que el paciente **espera** y lo que transmite competencia. No hay que
romperlo; hay que ejecutarlo mejor que el promedio.

La decisión de identidad, entonces, es **no** caer en el "azul hospital genérico".
Anclamos en las señales de confianza (azul-frío, neutro, alto contraste) pero elegimos
un **teal profundo** como primario en vez del royal blue corporativo, un **papel
cálido-frío** en vez del blanco puro (menos fatiga visual, se lee más premium), y un
único elemento memorable: el **chip de horario** (el "token de turno"). Toda la audacia
se gasta ahí; el resto es disciplina y aire.

**Sujeto:** encontrar al profesional adecuado y reservar un turno en el menor número de
pasos. **Audiencia:** pacientes de rango etario amplio (incluye adultos mayores),
profesionales y personal administrativo. **Trabajo de la landing:** buscar → elegir →
reservar.

---

## 2. Color

Paleta de 7 tokens. Cool, clínica, calma. El cálido (terracota) está **reservado**
para alertas/cancelaciones — nunca es color de marca.

| Token | Hex | OKLCH aprox. | Uso |
|---|---|---|---|
| `--paper` | `#F6F8F9` | `oklch(0.975 0.005 210)` | Fondo base (no blanco puro) |
| `--surface` | `#FFFFFF` | `oklch(1 0 0)` | Tarjetas, modales sobre `paper` |
| `--ink` | `#12212B` | `oklch(0.24 0.02 230)` | Texto principal (slate frío) |
| `--muted` | `#586A72` | `oklch(0.52 0.02 220)` | Texto secundario, labels |
| `--primary` | `#0E5A6B` | `oklch(0.45 0.06 210)` | Marca, headers, CTA principal |
| `--primary-strong` | `#0A4552` | `oklch(0.37 0.05 210)` | Hover/pressed del primario |
| `--accent` | `#2E8C79` | `oklch(0.60 0.08 165)` | Disponibilidad, éxito, confirmado |
| `--alert` | `#B8482A` | `oklch(0.50 0.12 35)` | Cancelar, ausente, error (solo) |
| `--line` | `#DBE3E6` | `oklch(0.90 0.008 210)` | Bordes, divisores hairline |

Reglas:

- **Blanco + azul-frío = confianza.** Neutros (papel/línea) hacen el 70–80% de cada
  pantalla; el primario aparece con moderación (estructura + un CTA por vista).
- El **verde `--accent`** es semántico: significa "disponible / confirmado / hecho".
  No usarlo como decoración.
- El **terracota `--alert`** solo en destructivo o error. Si aparece más de una vez por
  pantalla, algo está mal.
- **Contraste AA obligatorio** (4.5:1 texto normal, 3:1 texto grande/íconos). `--ink`
  sobre `--paper` y blanco-sobre-`--primary` cumplen holgado. El verde `--accent` sobre
  blanco **no** sirve para texto chico: usarlo en rellenos/badges, no en tipografía < 18px.
- **Nunca comunicar estado solo por color** (hay pacientes daltónicos y adultos
  mayores): cada estado lleva color **+ ícono + etiqueta**.

### Estados de turno (mapa semántico)

| Estado | Color | Ícono sugerido | Etiqueta |
|---|---|---|---|
| `disponible` (slot libre) | `--accent` tint | ⚬ punto | "Disponible" |
| `solicitado` | `--muted` / ámbar tenue | ⏳ reloj | "A confirmar" |
| `confirmado` | `--accent` | ✓ check | "Confirmado" |
| `en_sala` | `--primary` | → flecha | "En sala" |
| `atendido` | `--muted` | ✓✓ doble | "Atendido" |
| `ausente` | `--alert` | ⃠ prohibido | "Ausente" |
| `cancelado` | `--alert` tint | ✕ cruz | "Cancelado" |
| `sobreturno` | `--primary` borde punteado | ＋ más | "Sobreturno" |

El **sobreturno** se distingue visualmente (borde punteado) porque rompe la grilla a
propósito: el personal debe verlo como excepción, no como turno normal.

---

## 3. Tipografía

Evitamos los defaults universales (Roboto/Open Sans). Pareja deliberada:

- **Display / títulos → Source Serif 4.** Un serif editorial, sobrio y legible aporta
  gravedad "institucional" (revista médica, no marketing). Combinado con el teal frío
  **no** cae en el cliché cálido crema+serif+terracota.
- **Cuerpo / UI → Public Sans.** Sans humanista diseñada para servicios públicos y
  accesibilidad. Legible, neutra sin ser genérica, con excelente rendering en pantalla.
- **Datos / horarios → Public Sans con `tabular-nums`.** Los horarios de la agenda
  deben alinear en columnas: `font-variant-numeric: tabular-nums`. (Mono opcional solo
  en tablas internas del panel.)

### Escala (base 16px)

| Rol | Tamaño / interlínea | Peso | Familia |
|---|---|---|---|
| Display (hero) | 44–56px / 1.05 | 600 | Source Serif 4 |
| H1 | 32px / 1.15 | 600 | Source Serif 4 |
| H2 | 24px / 1.2 | 600 | Source Serif 4 |
| H3 | 20px / 1.3 | 600 | Public Sans |
| Cuerpo | 16px / 1.55 | 400 | Public Sans |
| Cuerpo chico | 14px / 1.5 | 400 | Public Sans |
| Label / eyebrow | 13px / 1.4, `letter-spacing: .04em`, uppercase | 600 | Public Sans |
| Horario (chip) | 15–16px, `tabular-nums` | 600 | Public Sans |

Reglas de legibilidad (críticas por el rango etario): cuerpo **nunca < 16px**,
interlínea **1.5–1.6**, ancho de medida 60–75 caracteres, jerarquía por tamaño+peso
antes que por color.

---

## 4. Layout y grilla

- Espaciado en múltiplos de **4px** (4/8/12/16/24/32/48/64).
- Ancho de contenido: 1120–1200px máx.; formularios y flujo de reserva a **una sola
  columna** centrada (máx ~520px) para no dispersar la atención.
- Radios: **10–12px** en tarjetas y chips (redondeo suave, cálido pero serio), **8px**
  en inputs. Nada de radios grandes tipo "app juguetona".
- Sombras: mínimas. `0 1px 2px rgba(18,33,43,.06)` en tarjetas; elevar solo modales.
  La jerarquía la da el **aire y las hairlines** `--line`, no la sombra.
- **Mobile-first**: la mayoría de las reservas de salud ocurren en el teléfono. Todo se
  diseña primero a 360px de ancho.

### Landing — estructura

```
┌──────────────────────────────────────────┐
│  [logo]                    [Ingresar]     │  ← nav sobria, sticky
├──────────────────────────────────────────┤
│  HERO (serif)                             │
│  "Reservá tu turno"                       │
│  ┌────────────────────────────────────┐   │
│  │ [Especialidad ▾][Profesional ▾][🔍]│   │  ← buscador = héroe
│  └────────────────────────────────────┘   │
├──────────────────────────────────────────┤
│  Profesionales  (cards con filtro por     │
│  especialidad)   [Clínica][Pediatría]…    │  ← filtro exigido por multidisciplina
│  ┌──────┐ ┌──────┐ ┌──────┐               │
│  │ card │ │ card │ │ card │               │
│  └──────┘ └──────┘ └──────┘               │
├──────────────────────────────────────────┤
│  Cómo funciona (3 pasos)  ·  Obras soc.   │
│  Contacto / sede / footer                 │
└──────────────────────────────────────────┘
```

El **buscador es el héroe** (no un carrusel de fotos). Es lo que el paciente vino a
hacer. El filtro por especialidad es obligatorio porque conviven disciplinas distintas.

### Card de profesional

```
┌─────────────────────────────┐
│ [avatar]  Dra. Nombre Apellido│
│           Cardiología          │  ← especialidad en --muted
│           📍 Sede Centro        │
│  ── obras sociales: OSDE, …    │
│  Próximo: [ 10:30 ][ 11:00 ]   │  ← chips = signature
│  [ Ver agenda ]                │
└─────────────────────────────┘
```

---

## 5. Elemento signature — el chip de horario

Un slot disponible se representa como un **chip táctil** con el horario en tabular-nums,
teñido con el `--accent` cuando está libre. Es el objeto que se repite en toda la app
(landing, reserva, agenda) y le da identidad:

- Libre: fondo `--accent` tint, texto `--ink`, borde `--accent`.
- Seleccionado: fondo `--primary`, texto blanco.
- Ocupado (en agenda): fondo `--surface`, texto `--muted`, sin interacción.
- Sobreturno: borde punteado `--primary`.
- Alto de toque **≥ 44px** (accesibilidad táctil).

Consistencia: el mismo chip que el paciente toca para reservar es el que el
administrativo ve en la agenda. Un solo lenguaje.

---

## 6. Flujo de reserva (máx. 4 pasos)

La evidencia de UX médica es clara: reserva en ≤4 pasos, formularios cortos.

```
1. Especialidad / Profesional   →   2. Fecha   →   3. Horario (chip)   →   4. Confirmar
                                                                            (datos + obra social)
```

- Un paso por pantalla en mobile; barra de progreso discreta (1·2·3·4).
- Pedir **solo lo necesario** para agendar (nombre, documento, teléfono, obra social +
  N° afiliado). El resto de la ficha va después, en el portal.
- Si la obra social del paciente **no** está entre las compatibles del profesional →
  aviso claro, no bloqueante: *"Este profesional no atiende por [OS]. El turno será
  particular y los costos corren por tu cuenta."* + checkbox de conformidad.
- Confirmación final según el modo de la ventana: **automático** ("Turno confirmado") o
  **a aprobación** ("Solicitud enviada. Te avisamos cuando se confirme.").

---

## 7. Componentes

**Botones**
- Primario: fondo `--primary`, texto blanco, hover `--primary-strong`. Un solo primario
  por vista.
- Secundario: borde `--line`, texto `--primary`, fondo `--surface`.
- Destructivo: texto/borde `--alert`, relleno solo al confirmar la acción.
- Verbo exacto de lo que pasa: "Reservar turno", no "Enviar". La acción mantiene el
  nombre en todo el flujo (botón "Confirmar" → toast "Turno confirmado").

**Inputs / selects**
- Alto ≥ 44px, borde `--line`, foco con anillo `--primary` de 2px visible (nunca quitar
  el outline).
- Label siempre visible arriba del campo (no placeholder-as-label).

**Badges de estado**: color + ícono + texto (ver tabla §2).

**Agenda (panel)**: grilla día/semana por profesional, columnas por profesional o por
día, filas por franja horaria. Los turnos son bloques con el color de estado; los slots
libres, chips tenues. Tabular-nums en el eje horario.

**Estados vacíos y errores** (voz de la interfaz, no de una persona):
- Vacío = invitación a actuar: *"No hay turnos para esta fecha. Probá otro día o elegí
  otro profesional."*
- Error = qué pasó + cómo seguir, sin disculpas: *"Ese horario se acaba de ocupar.
  Elegí otro."* (este es el mensaje del 409 de anti-overbooking, traducido a lenguaje
  humano).

---

## 8. Voz y copy

- **Vos** argentino, registro profesional y claro. Nada de jerga técnica ni de sistema
  ("webhook", "registro"): el paciente gestiona *turnos*, no *reservas de recurso*.
- Voz activa, oración en minúscula (sentence case), sin relleno.
- Específico antes que ingenioso. "Recibirás la confirmación por email" > "¡Listo,
  crack!".
- Consistencia de vocabulario: si se llama "turno" en un lado, es "turno" en todos.

---

## 9. Accesibilidad (piso no negociable)

- Contraste AA (4.5:1 / 3:1). Verificar cada par color-fondo.
- Estado nunca solo por color (color + ícono + texto).
- Foco de teclado visible en todo control interactivo.
- Objetivos táctiles ≥ 44×44px.
- Cuerpo ≥ 16px, interlínea ≥ 1.5.
- `prefers-reduced-motion`: respetar; animación al mínimo (una transición de página,
  microinteracciones de hover, nada más — el exceso de animación lee "genérico/IA").
- Responsive real hasta 360px.

---

## 10. Dark mode (panel/agenda)

El panel administrativo pasa horas en pantalla; conviene un modo oscuro sobrio:
- Fondo `#0E1A20`, superficie `#152730`, texto `#E6EDEF`.
- Primario se **aclara** a `oklch(0.62 0.06 205)` para mantener contraste.
- Cuidar el bug conocido de "línea blanca en tablas" en oscuro (heredado de Suites):
  definir bordes con el token `--line` en su versión dark, no con blanco translúcido.

---

## 11. Referencias (patrones observados en salud AR)

- **Buscador por profesional / subespecialidad / servicio** en portada (Sanatorio
  Allende): el paciente entra sabiendo a quién busca.
- **Confirmación por email + recordatorio** como expectativa base (Docturno, Meducar).
- **Rol secretaria/administrativo** que gestiona la agenda del profesional (Meducar):
  refuerza el modelo de permisos.
- **Métrica de ausentismo** como KPI operativo central (Meducar): la reemplaza a la
  facturación del proyecto hotelero como número que importa.

---

## 12. Tokens (Tailwind v4 `@theme`)

```css
@theme {
  --color-paper: #F6F8F9;
  --color-surface: #FFFFFF;
  --color-ink: #12212B;
  --color-muted: #586A72;
  --color-primary: #0E5A6B;
  --color-primary-strong: #0A4552;
  --color-accent: #2E8C79;
  --color-alert: #B8482A;
  --color-line: #DBE3E6;

  --font-display: "Source Serif 4", Georgia, serif;
  --font-sans: "Public Sans", system-ui, sans-serif;

  --radius-card: 12px;
  --radius-input: 8px;
}
```
