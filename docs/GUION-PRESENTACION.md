# Guion de presentación — 2 diapositivas, 3 minutos

Asistente conversacional integrado al ERP · BRIMEC · T-09 / T-10

> Escrito para **decir en voz alta**. Una idea por frase.
> ~375 palabras ≈ **2:50** a ritmo normal.
> El recorrido completo, paso a paso, está en [`FLUJO-IDA-Y-VUELTA.md`](FLUJO-IDA-Y-VUELTA.md).

**Reparto del tiempo:** diapositiva 1 ≈ **1:10** · diapositiva 2 ≈ **1:40**

---
---

# 🖼️ DIAPOSITIVA 1 · Selección de la solución

## Qué va en la diapositiva

```
┌──────────────────────────────────────────────────────────────┐
│  SELECCIÓN DE LA SOLUCIÓN CON IA GENERATIVA      ← volanta   │
│                                                              │
│  Asistente conversacional integrado al ERP       ← título    │
│  Consultar y actualizar la producción por voz,   ← subtítulo │
│  sin frenar la planta                                        │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │   [ diagrama de arquitectura con la         │              │
│  │     función de cada componente ]            │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  El modelo entiende · El middleware decide ·     ← pie       │
│  El ERP ejecuta                                              │
└──────────────────────────────────────────────────────────────┘
```

**Volanta:** Selección de la solución con IA Generativa
**Título:** Asistente conversacional integrado al ERP
**Subtítulo:** Consultar y actualizar la producción por voz, sin frenar la planta
**Pie:** El modelo entiende · El middleware decide · El ERP ejecuta

**El diagrama listo para pegar** está en esta misma carpeta, en 16:9:

| Archivo | Para qué |
|---|---|
| `diagrama-arquitectura-diapositiva.png` | 4267 × 2400 px. Pegalo y listo. Sirve en PowerPoint, Google Slides, Keynote y Canva |
| `diagrama-arquitectura-diapositiva.svg` | Vectorial, escala sin pixelarse. PowerPoint lo importa nativo; Google Slides no |

Cada caja ya trae su función escrita adentro, el número de paso, y a la derecha si **funciona hoy**,
está **simulado** o **no implementado**. A la izquierda, el lema atado a la pieza que lo cumple:
ENTIENDE en el modelo, DECIDE en el middleware, EJECUTA en el ERP. Y a la derecha, las flechas de
**ida y vuelta**.

> **No leas las siete cajas.** El diagrama se lee solo. Señalá y nombrá: en 25 segundos recorrés
> todo. Si alguien quiere el detalle, está escrito ahí para que lo lea mientras hablás.

---

## Lo que decís · ≈ 1:10

> 🗣️ *Mirá a la gente en el problema. Recién en la arquitectura girá hacia la pantalla.*

Hoy Administración genera las órdenes de fabricación, **las imprime** y las entrega en papel al jefe
de planta. Desde ahí pierde visibilidad.

Cuando un cliente pregunta por su pedido, hay que ir hasta planta, interrumpir al jefe y esperar a
que lo busque entre sus papeles. Pasa **todos los días**.

El ERP que están poniendo en marcha resuelve **dónde viven los datos**. Pero no resuelve el
**canal**: un operario con guantes y la máquina andando no va a frenar para completar formularios.

Por eso elegimos un **asistente conversacional, principalmente por voz**, como una capa sobre el
ERP.

> 👉 *Ahora sí, señalá el diagrama. Una pasada de arriba hacia abajo.*

El **widget** captura la consulta, hablada o escrita. La **transcripción** la pasa a texto.

El **modelo de IA** solo entiende qué se pidió y elige la herramienta. No accede a la base. No
ejecuta SQL.

El **middleware** es el que decide: valida identidad, permisos y reglas de negocio, exige
confirmación y deja todo auditado. Es la **única vía de escritura**.

Y el **ERP** ejecuta y persiste.

En una frase: **el modelo entiende, el middleware decide, el ERP ejecuta.**

---
---

# 🎬 DIAPOSITIVA 2 · La solución funcionando

## Plan de grabación · ~1:40 de video

Grabá en **pestaña propia**, no embebida — el micrófono se bloquea dentro de un iframe.
Perfil recomendado para arrancar: **Jefe de Producción**.

| ⏱️ | Qué mostrás | Por qué importa |
|---|---|---|
| 0:00–0:12 | Login → selección de perfil | Se ve la matriz de permisos por rol |
| 0:12–0:25 | Dashboard | Administración ve el avance sin ir a planta |
| 0:25–0:45 | Chat: *«Mostrame las OF atrasadas»* | Lenguaje natural → tabla. Se ve **"herramienta invocada"** |
| 0:45–1:10 | Dictar: *«Pasá el ítem 333 a tratamiento»* | **El momento clave:** aparece el panel de confirmación |
| 1:10–1:25 | Cambiar a **Operario** e intentar lo mismo | Se rechaza por permisos. **Esto es lo que más suma** |
| 1:25–1:40 | Auditoría | Lo ejecutado, lo cancelado **y lo rechazado** |

> 💡 Si el dictado te falla en la grabación, escribí la frase. No lo repitas tres veces: perdés
> tiempo y transmite fragilidad.

---

## Lo que decís sobre el video · ≈ 1:40

> 🗣️ *El video corre solo. Vos narrás encima, un poco por delante de lo que se ve.*

Acá se ve funcionando.

Primero el perfil. La identidad y el rol vienen del ERP, y de eso dependen las operaciones
habilitadas.

Hago una consulta en lenguaje natural. Abajo de la respuesta se ve **qué herramienta se invocó**:
eso es lo que devolvió el modelo. Una llamada a una función, no una consulta a la base.

Ahora una escritura. Dicto *«pasá el ítem 333 a tratamiento»*.

El asistente **no ejecuta**. Muestra el estado actual, el cambio propuesto, y espera. Hasta que no
confirmo, **no se escribió nada**.

Y acá lo importante. Si entro como **Operario** e intento la misma operación, se rechaza: ese perfil
no tiene el permiso. **Y el rechazo también queda auditado.**

En la auditoría se ve todo: quién, cuándo, qué operación, con qué resultado y por qué canal. Lo
ejecutado, lo cancelado y lo rechazado.

Esa separación es lo que hace la solución **gobernable**: si el modelo se equivoca, no puede romper
nada, porque no tiene permiso para escribir.

Una aclaración: esto es un **prototipo con datos sintéticos**. La interfaz y el flujo son reales; el
modelo, el middleware y el ERP están **simulados**. La integración es la fase siguiente.

---
---

## 🆘 Si te cortan el tiempo — 60 segundos

Administración imprime las órdenes y las entrega en papel. Desde ahí pierde visibilidad: para saber
cómo viene un pedido hay que ir a planta e interrumpir al jefe.

El ERP resuelve dónde viven los datos, pero no el canal: un operario con guantes y la máquina
andando no va a completar formularios.

Proponemos una capa conversacional por voz sobre el ERP. El widget y la transcripción reciben. El
modelo **solo interpreta** y elige la herramienta. El middleware **decide** —permisos, reglas,
confirmación y auditoría— y es la única vía de escritura. El ERP ejecuta.

Si el modelo se equivoca, no rompe nada: no tiene permiso para escribir.

---

## 🎯 Las tres frases que no podés perder

1. *«Administración imprime la OF y desde ahí pierde visibilidad.»* → el problema, concreto
2. *«El ERP resuelve dónde viven los datos, pero no el canal.»* → por qué hace falta esto
3. *«El modelo entiende, el middleware decide, el ERP ejecuta.»* → la arquitectura entera

---

## 💬 Preguntas probables

| Pregunta | Respuesta en una línea |
|---|---|
| *¿Qué quiere decir que no ejecuta SQL?* | El modelo no escribe consultas. Elige una herramienta de un catálogo cerrado y la devuelve como JSON. Quien valida es el middleware; quien toca la base es el ERP. |
| *¿Y qué hace exactamente cuando interpreta?* | Traduce la frase a una llamada: identifica la intención y extrae los parámetros. Si falta un dato, repregunta en vez de inventarlo. Después, con el resultado, redacta la respuesta. |
| *¿Las funciones viven en FastAPI?* | Sí, pero son delgadas: validan y delegan. La lógica de negocio y los datos quedan en el ERP. |
| *¿Por qué no que el modelo llame directo a la API de Odoo?* | Porque esa API es genérica: expone CRUD sobre casi todo. El middleware estrecha la superficie a ocho funciones y es donde viven la confirmación y la auditoría. |
| *¿Y si el modelo se equivoca?* | No puede escribir. Propone; el middleware valida y la persona confirma. Confirmar, cancelar y rechazar quedan los tres auditados. |
| *¿Por qué no un menú o un formulario?* | Es el complemento, no el canal principal: obliga al operario a detener la máquina. |
| *¿Y si hay mucho ruido en planta?* | Riesgo identificado en T-09. Por eso la alternativa por texto está siempre disponible, y el servicio de transcripción hay que elegirlo y probarlo en planta. |
| *¿Qué datos se le mandan al proveedor del modelo?* | El contexto mínimo. Credenciales, datos bancarios y salariales están excluidos del alcance. |
| *¿Está funcionando de verdad?* | La interfaz sí, con datos sintéticos. El modelo, el middleware y el ERP están simulados. |
| *¿Cuánto cuesta?* | No está validado. Depende del modelo, del proveedor de transcripción y del volumen. Es parte de los próximos pasos. |

---

## 🔍 Si te piden el detalle del flujo

Está completo en [`FLUJO-IDA-Y-VUELTA.md`](FLUJO-IDA-Y-VUELTA.md): los 12 pasos de ida y vuelta, las
cuatro barreras de validación, los tres atajos donde el flujo se corta antes, y en qué archivo del
prototipo está cada paso.

Lo más citable de ahí:

- **El modelo se usa dos veces**: a la entrada para entender, a la salida para redactar. En el medio
  no participa.
- **El catálogo de herramientas se filtra por rol antes de mandárselo al modelo.** A un operario ni
  siquiera se le ofrece `actualizar_estado_item`: el modelo no sabe que existe.
- **El ERP valida de nuevo**, con sus propias reglas. No es redundancia: el middleware valida la
  política del asistente, el ERP valida las suyas.

---

## ✅ Antes de salir a presentar

- [ ] Video grabado y probado **con sonido**.
- [ ] Diapositiva 1 con el diagrama legible desde el fondo del aula.
- [ ] Tené la demo abierta en otra pestaña por si piden verla en vivo.
- [ ] No prometas lo que está simulado. Decí *"está simulado"* y seguí: resta cero y suma criterio.
