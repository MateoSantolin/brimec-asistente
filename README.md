# BRIMEC · Asistente conversacional del ERP — MVP navegable

### ▶ Demo en vivo: **https://MateoSantolin.github.io/brimec-asistente/**

Prototipo académico de la **Oportunidad 3** de T-09: *Asistente Conversacional para Operaciones de
Producción y Taller*. Representa la solución diseñada en T-10 como una aplicación web navegable.

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | 6 diagramas Mermaid: arquitectura conceptual, flujo de una escritura, matriz de permisos, modelo de datos, estado de construcción y límites del analizador |
| [`docs/GUION-PRESENTACION.md`](docs/GUION-PRESENTACION.md) | Guion de 3 minutos: problema, beneficios y arquitectura, con versión de 60 segundos y preguntas probables |
| [`docs/FLUJO-IDA-Y-VUELTA.md`](docs/FLUJO-IDA-Y-VUELTA.md) | Los 12 pasos de ida y vuelta, las 4 barreras de validación y en qué archivo del prototipo vive cada paso |
| [`docs/STACK.md`](docs/STACK.md) | Las herramientas con sus logotipos, separando lo construido de lo propuesto |

> **No es un producto.** No hay LLM, ni middleware, ni ERP, ni base de datos conectados.
> Los datos son sintéticos y los controles de permisos corren en el navegador: **no son seguridad real**.

---

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abre en `http://localhost:5173`. El login es ficticio: cualquier credencial entra.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (`tsc -b && vite build`) |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm run probar` | **41 casos de prueba** del analizador, del agente y del formulario de creación de OF |

Stack: React 18 · Vite 5 · TypeScript · Tailwind CSS · `lucide-react` · React Router · LocalStorage.
Sin backend.

---

## Publicación

La demo se publica sola: `.github/workflows/deploy.yml` corre en cada push a `main`, ejecuta el
banco de pruebas, compila y despliega en GitHub Pages. Si algún caso falla, **no publica**.

`npm run build` deja todo en `dist/`. Ese build es **estático y autocontenido**: rutas relativas
(`base: './'`), enrutado por hash (`#/dashboard`, sin reglas de reescritura en el servidor) y las
tipografías empotradas como data URI. No pide nada a ningún host externo, así que se puede subir tal
cual a cualquier hosting gratuito:

| Opción | Cómo | Cuenta | Notas |
|---|---|---|---|
| **Netlify Drop** | Arrastrar la carpeta `dist` a `app.netlify.com/drop` | No hace falta para probar; sí para conservar la URL | Lo más rápido: un minuto, URL pública |
| **Cloudflare Pages** | *Direct Upload* de `dist`, o conectar el repo | Gratis | Buen rendimiento, dominio propio opcional |
| **GitHub Pages** | Subir `dist` a la rama `gh-pages` | Gratis | Queda atado al repo del TP; URL estable |
| **Surge** | `npx surge dist` | Email | Sin interfaz web, todo por consola |
| **Vercel** | Importar el repo | Gratis | Build automático en cada push |

Para GitHub Pages en una subruta no hace falta tocar nada: `base: './'` y el hash router ya lo
resuelven.

**Una advertencia sobre la voz:** el dictado usa el micrófono, y los navegadores sólo lo permiten
sobre **HTTPS** (o `localhost`). Todas las opciones de arriba sirven HTTPS, así que funciona. Lo que
sí puede bloquearlo es un visor que embeba la página dentro de un `iframe` sin permiso de micrófono:
en ese caso el botón avisa que el navegador denegó el acceso y queda la alternativa por texto. Para
demostrar la voz, lo más seguro es abrir la URL **en una pestaña propia**.

## Los tres perfiles

| Perfil | Consulta | Crea OF | Actualiza etapas | Comenta | Ve auditoría | Ve precios |
|---|---|---|---|---|---|---|
| **Administración** (Carolina Vera) | clientes, pedidos, OF, ítems | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Operario** (Nicolás Brizuela) | OF, ítems, artículos, comentarios | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Jefe de Producción** (Ramiro Aguirre) | OF, ítems, artículos, comentarios | ❌ | ✅ | ✅ | ✅ | ❌ |

La matriz está en `src/lib/permisos.ts` y es la de T-09/T-10, sin desviaciones.

**Dos decisiones de visibilidad que conviene saber defender:**

- *Producción no lista clientes ni pedidos*, pero sí ve la razón social y la OC del cliente dentro de
  cada OF. T-09: *"Administración podrá consultar pedidos, clientes y avances necesarios para su
  función; Producción podrá consultar la información operativa necesaria para gestionar el taller."*
- *Administración puede leer comentarios de taller pero no escribirlos.* Leerlos es el objetivo de la
  solución (ver el avance sin ir a planta); escribirlos está prohibido explícitamente.

---

## Pantallas

1. **Login** ficticio · 2. **Selección de perfil** con la matriz de permisos visible ·
3. **Dashboard ejecutivo** (KPIs, OF por vencer, OF atrasadas, ítems por etapa, actividad, diagrama de
arquitectura) · 4. **Asistente** (chat con voz, historial, confirmaciones) · 5. **Consultas**
(6 pestañas filtradas por rol) · 6. **Detalle de OF** (ítems, riel de etapas, timeline de
`SEGUIMIENTO_ETAPA`, comentarios, acciones) · 7. **Auditoría** (timeline filtrable).

---

## Correspondencia con el modelo de datos destino

El MVP usa **11 de las 28 tablas** del ERD. Las interfaces de `src/types/index.ts` replican los
nombres de tabla y de campo en `snake_case` para que la correspondencia sea verificable uno a uno.

### Dentro del alcance

`EMPLEADO` · `CLIENTE` · `ARTICULO` · `PEDIDO` · `PEDIDO_DETALLE` · `ORDEN_FABRICACION` ·
`OF_DETALLE` · `ETAPA_PRODUCCION` · `SEGUIMIENTO_ETAPA` · `COMENTARIO_TALLER` · `AUDITORIA`

Es exactamente la lista de la tabla *"Datos e información necesaria"* de T-09.

### Fuera del alcance (17 tablas) y por qué

| Tablas | Motivo |
|---|---|
| `SOLICITUD`, `COTIZACION` | Son la **Oportunidad 1** de T-09 (copiloto de cotización), no la 3 |
| `CONTROL_CALIDAD`, `CERTIFICADO_CALIDAD` | **Oportunidad 2** (procesador de MTR) |
| `PROVEEDOR`, `COMPRA`, `COMPRA_DETALLE`, `LOTE_MATERIA_PRIMA`, `MOVIMIENTO_STOCK`, `CONSUMO_MATERIAL` | T-09: *"el uso de datos de stock y consumos queda sujeto a validación del alcance detallado"* |
| `REMITO`, `REMITO_DETALLE`, `TRANSPORTISTA`, `RECEPCION`, `FACTURA`, `PAGO` | Post-fabricación; fuera del circuito Administración ↔ Producción |
| `DOCUMENTO` | No interviene en ningún caso de uso del asistente |

### Decisiones derivadas del ERD

- **`ORDEN_FABRICACION` no tiene `cliente_id`.** El cliente se resuelve por `PEDIDO`. Las consultas
  "OF de Petrosur" hacen el join `OF_DETALLE → ORDEN_FABRICACION → PEDIDO → CLIENTE`.
- **`ORDEN_FABRICACION` no tiene responsable ni observaciones.** El responsable se deriva del último
  `SEGUIMIENTO_ETAPA`; las observaciones viven en `COMENTARIO_TALLER`.
- **Comentarios y cambios de etapa cuelgan del ÍTEM, no de la OF** (`of_detalle_id` en ambas tablas).
  Por eso, si pedís *"agregá un comentario a la OF-203"* y esa OF tiene varios ítems, el asistente
  **repregunta cuál** en vez de elegir uno.
- **El estado de la OF es derivado**: es la etapa mínima de sus `OF_DETALLE`. Se recalcula en cada
  actualización.
- **Dos fechas distintas**: `ORDEN_FABRICACION.fecha_estimada_fin` (compromiso de planta, contra la
  que se mide "OF atrasada") y `PEDIDO.fecha_entrega_pactada` (compromiso al cliente, contra la que
  se mide "pedido atrasado").
- **`ETAPA_PRODUCCION.requiere_aprobacion`** se usa: *Calidad* y *Finalizado* muestran un aviso extra
  en el panel de confirmación.
- `cotizacion_id` siempre es `null` porque `COTIZACION` está fuera del alcance.

### Huecos del ERD que esta demo tuvo que cubrir

Están implementados y marcados con `// [EXT]` en `src/types/index.ts`. Conviene decidir si se suman
al modelo.

| # | Hueco | Por qué hace falta |
|---|---|---|
| 1 | `AUDITORIA` **no tiene `resultado`** | T-09 exige registrar *"Usuario, Fecha, Acción, **Resultado**"*. Sin esa columna no hay dónde guardar si la operación fue rechazada por permisos o cancelada por el usuario — y es justo lo que prueba CP-08 |
| 2 | `AUDITORIA` no tiene `canal` ni `origen` | Sin ellos no se puede medir adopción del asistente frente a las pantallas del ERP, que es la hipótesis a validar |
| 3 | `ETAPA_PRODUCCION` no modela **transiciones** | Sin reglas, nada impide saltar de Pendiente a Finalizado. Acá viven en `src/data/catalogoEtapas.json`, bajo el bloque `metadatos`, explícitamente separadas de la tabla |
| 4 | No existe `CONVERSACION` / `MENSAJE` | El historial de conversaciones se guarda en LocalStorage. Las **consultas** (no escrituras) no dejan rastro en ninguna tabla |
| 5 | `PEDIDO` no tiene `numero` propio (UK) | `OF`, `REMITO`, `FACTURA` y `COTIZACION` sí lo tienen. Acá se muestra `#pedido_id` |
| 6 | `EMPLEADO.rol` es un string suelto | No hay `ROL`/`PERMISO`. La matriz RBAC vive en código |

---

## Datos sintéticos

En `src/data/`. Volúmenes: **10 clientes · 20 pedidos · 77 líneas de pedido · 30 OF · 87 ítems ·
303 registros de seguimiento · 18 comentarios · 26 registros de auditoría · 20 artículos**.

Las razones sociales son **ficticias**. Los sectores (Oil & Gas, Minería, Nuclear, Petroquímica,
Alimenticia, Siderurgia) y las familias de artículos (bridas ASME B16.5, accesorios forjados, spools
de piping, mecanizados CNC, equipos mineros, partes nucleares) replican las líneas reales publicadas
en brimec.com.ar, para que los datos sean verosímiles sin atribuir pedidos falsos a clientes reales.

**Las fechas son relativas.** Los JSON guardan offsets en días (campos `off_*`) que
`src/data/seed.ts` convierte a fechas reales al cargar. La demo nunca queda vieja: siempre hay
~4 OF atrasadas y ~6 por vencer dentro de 7 días, calculadas contra el día en que se ejecuta.

**Reproducibilidad de los casos de T-10:** el `of_detalle_id = 333` existe, pertenece a una OF de
Petrosur y está en *Mecanizado*, para que CP-02, CP-03 y CP-06 se puedan reproducir literalmente.

Para volver al estado inicial: **Reiniciar datos de la demo** en la barra lateral.

---

## La comprensión de lenguaje natural está simulada

`src/lib/nlu.ts` es un **analizador por reglas**, no un modelo generativo. Esto importa, porque T-09
descarta la automatización por reglas precisamente por rígida:

> *"Requeriría que el usuario ingrese comandos con palabras clave exactas e inflexibles
> (ej. `UPDATE ITEM 333 STATUS SECADO`), lo que genera alta probabilidad de error y frustración."*

Para no contradecir ese argumento, el parser **no** hace coincidencia literal:

- normaliza acentos, mayúsculas y puntuación;
- acepta sinónimos de taller — *"torno"*, *"cnc"*, *"maquinado"* → **Mecanizado**;
- tolera errores de tipeo y de transcripción — *"petro sur"* → **Petrosur Energía S.A.**;
- detecta **ambigüedad** (varios clientes posibles) y **repregunta** en vez de adivinar;
- nunca infiere un identificador que el usuario no dio.

**Su límite es real y está a la vista.** Una frase como *"che, fijate si lo de la semana pasada ya
salió del horno así le aviso al tipo"* no se interpreta, y el asistente lo dice explícitamente:
eso es exactamente lo que aportaría el LLM. Hay un caso de prueba (`LIM-01`) que lo verifica.

El catálogo de etapas **no está fijado en el código**: se carga de
`src/data/catalogoEtapas.json`, que simula la tabla `ETAPA_PRODUCCION` del ERP. Editá ese archivo y
cambian los estados válidos, las transiciones y los sinónimos de toda la demo. Es el cumplimiento de
la regla 3 del prompt de T-10: *"No definas una lista fija de estados."*

---

## Voz

`src/hooks/useDictado.ts` usa la **Web Speech API** (`webkitSpeechRecognition`), en español
rioplatense. Funciona en Chrome y Edge; en otros navegadores el botón queda deshabilitado y
siempre está la alternativa por texto — porque el ruido de planta (tornos, balancines, amoladoras)
es un riesgo identificado en T-09.

T-09 define la voz como **canal principal**, no como extra: el operario tiene las manos ocupadas y no
puede detener la máquina para navegar menús.

En Chrome/Edge el audio se procesa en servidores de Google. **El servicio definitivo de
Speech-to-Text está pendiente de evaluación**, igual que en T-10, incluyendo dónde se procesa el
audio y bajo qué condiciones contractuales.

---

## El middleware simulado

`AppContext.ejecutar()` es el **único** punto por el que pasa una escritura — ni el chat ni las
pantallas tocan el dataset por su cuenta. Replica el orden de la arquitectura de T-10:

1. **Autorización** — si el rol no tiene la capacidad, rechaza **sin ejecutar nada** y audita el
   rechazo.
2. **Slot filling** — si falta un dato, repregunta. Nunca completa identificadores por su cuenta.
   La creación de OF, que necesita cuatro datos, se resuelve como un **formulario multi-turno**
   (`src/lib/formularioOf.ts`): pide el pedido de origen listando los que están en curso, luego las
   líneas a fabricar, la prioridad y la fecha estimada de fin, sugiriendo una semana antes de la
   entrega pactada. El número de OF no se pide: lo asigna el ERP. Se puede cancelar en cualquier paso.
3. **Regla de negocio** — valida la transición contra el catálogo de etapas del ERP.
4. **Confirmación** — toda escritura devuelve una *propuesta* con estado actual, cambio propuesto y
   botones Confirmar / Cancelar. Confirmar, cancelar y rechazar quedan **los tres** en auditoría.

En producción los pasos 1 y 3 deben correr **del lado del servidor**. Acá corren en el navegador
porque no hay backend; es una representación del flujo, no un control de seguridad.

---

## Arquitectura representada

El Dashboard incluye el diagrama de T-10 con cada capa etiquetada según su estado real:

```
Usuarios (Administración / Operarios / Jefe de Producción)   ← funciona
        ↓
Widget conversacional del ERP (texto y voz)                  ← funciona
        ↓
Speech-to-Text                                               ← simulado (Web Speech API)
        ↓
Modelo de IA generativa (tool calling)                       ← simulado (reglas)
        ↓
API agente / Middleware (FastAPI)                            ← simulado
   ├─ Autenticación  ├─ Autorización (RBAC)  ├─ Reglas
   ├─ Confirmación   └─ Auditoría
        ↓
Conector ERP (API REST)                                      ← no implementado
        ↓
ERP SaaS (Odoo) + base de datos                              ← no implementado
```

---

## Mapa de archivos

```
src/
  data/           JSON sintéticos + seed.ts (resuelve fechas relativas)
    catalogoEtapas.json   ETAPA_PRODUCCION + transiciones y sinónimos (middleware)
  types/          interfaces espejo del modelo de datos destino
  lib/
    permisos.ts   matriz RBAC
    texto.ts      normalización, Levenshtein, coincidencia difusa
    nlu.ts        analizador de intención y extracción de slots
    agente.ts     respuesta del agente: autorización → slots → reglas → propuesta
    consultas.ts  herramientas de solo lectura (los joins del ERD)
    formato.ts    fechas, plazos, moneda
  store/
    AppContext.tsx  estado + LocalStorage + middleware simulado + auditoría
  hooks/
    useDictado.ts   Web Speech API
  components/     layout, ui, chat, dashboard
  pages/          Login, SeleccionPerfil, Dashboard, Chat, Consultas, DetalleOF, Auditoria
scripts/
  probar-nlu.ts   41 casos: CP-01..CP-08 de T-10, ejemplos de T-09, tolerancia a tipeo
                  y voz, límites del analizador, y el formulario multi-turno de creación de OF
```

---

## Qué funciona y qué no

**Funciona en la demo:** navegación por perfiles, interfaz conversacional por texto y dictado,
consultas con filtros y ordenamientos sobre datos sintéticos, panel de confirmación previo a cada
escritura, mensajes de restricción por rol, actualización de etapas con validación de transición,
registro de comentarios, creación de OF desde el detalle de un pedido, vista de auditoría con
resultado y canal, persistencia en LocalStorage.

**Simulado o no implementado:** respuestas de un LLM real, transcripción con un servicio contratado,
middleware, conector REST, ERP y su base de datos, persistencia transaccional, seguridad del lado
servidor, auditoría productiva.

**Dependencias previas, en orden:** (1) finalizar la puesta en marcha del ERP y definir maestros,
etapas, reglas, roles y permisos; (2) definir y validar las API de integración, autenticación,
autorización, auditoría y tratamiento de datos enviados al proveedor de IA y al servicio de
transcripción; (3) desarrollar la integración real y correr un piloto controlado con Administración,
operarios y Jefe de Producción, midiendo precisión, tiempos, errores, aceptación y funcionamiento
con el ruido y la conectividad de planta.

---

## Diseño

Paleta y tipografía tomadas del sitio real (brimec.com.ar):

| Token | Hex | Origen |
|---|---|---|
| `brimec-primary` | `#0084D6` | `--ast-global-color-0` |
| `brimec-primary-dark` | `#0075BE` | `--ast-global-color-1` |
| `brimec-navy` | `#243673` | `--ast-global-color-6` |
| `brimec-soft` | `#BFD1FF` | `--ast-global-color-8` |
| `brimec-surface` | `#F5F7F9` | `--ast-global-color-4` |
| `brimec-ink` | `#333333` | `--ast-global-color-3` |

Tipografía: **Oswald** 400/500/700 para títulos y etiquetas de UI, **Inter** 300–800 para cuerpo y
datos — las mismas dos familias que carga el sitio. El logotipo (`public/brimec-logo.png`) es el
de brimec.com.ar.
