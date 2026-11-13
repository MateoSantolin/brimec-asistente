# Guion de presentación — 3 minutos

Asistente conversacional integrado al ERP · BRIMEC · T-09 / T-10

> Escrito para **decir en voz alta**. Frases cortas, una idea por frase.
> ~410 palabras ≈ **2:50** a ritmo normal. Si hablás rápido, te sobran 20 segundos.

---

## ⏱️ 0:00 — 0:40 · El problema

> 🖥️ **En pantalla:** el diagrama de arquitectura, o nada. Mirá a la gente, no a la pantalla.

Hoy en BRIMEC, Administración genera las órdenes de fabricación, **las imprime** y las entrega en
papel al jefe de planta.

Desde ese momento, pierde visibilidad.

Cuando un cliente llama para preguntar por su pedido, alguien de Administración tiene que ir hasta
planta, interrumpir al jefe, y esperar a que busque la orden entre sus papeles.

Eso pasa **todos los días**.

El costo son demoras con el cliente, interrupciones en producción, y cero trazabilidad entre las
dos áreas.

---

## ⏱️ 0:40 — 1:30 · Por qué esta solución

> 🖥️ **En pantalla:** la demo, perfil Operario. No la toques todavía.

El ERP que BRIMEC está poniendo en marcha resuelve **dónde viven los datos**. Pero no resuelve el
**canal**.

Un operario con guantes, con el torno andando y con ruido de planta, no va a parar la máquina para
navegar menús y completar formularios.

Y una solución por comandos fijos tampoco sirve: lo obligaría a decir la frase exacta, siempre
igual.

Por eso proponemos una **capa conversacional, principalmente por voz**.

Administración consulta el avance sin interrumpir a nadie. El taller registra novedades dictando,
sin soltar la herramienta. Y la trazabilidad queda registrada sola, como subproducto del trabajo,
no como una tarea extra.

No reemplazamos al ERP ni a sus controles. **Facilitamos el acceso.**

---

## ⏱️ 1:30 — 2:40 · La arquitectura

> 🖥️ **En pantalla:** el diagrama de arquitectura. Señalá cada bloque mientras lo nombrás.

La arquitectura tiene **tres bloques**.

**Primero, la puerta de entrada**: el widget conversacional dentro del ERP, y el servicio de
transcripción, que convierte la voz en texto.

**Segundo, el modelo de inteligencia artificial.** Y acá está la decisión más importante del
diseño: el modelo **solo** interpreta lo que la persona quiso decir, y elige qué herramienta
invocar. No accede a la base de datos. No ejecuta SQL.

**Tercero, el middleware.** Es el que realmente decide. Verifica la identidad. Valida los permisos
según el rol. Aplica las reglas de negocio. Exige confirmación antes de escribir. Y deja todo
registrado en auditoría. Es la **única vía de escritura**.

Recién ahí el conector llama a la API del ERP, que ejecuta y persiste.

En una frase: **el modelo entiende, el middleware decide, el ERP ejecuta.**

---

## ⏱️ 2:40 — 3:00 · Cierre

> 🖥️ **En pantalla:** quedate en el diagrama.

Esa separación es lo que hace que la solución sea **gobernable**: si el modelo se equivoca, no
puede romper nada, porque no tiene permiso para escribir.

Lo que ven en pantalla es un prototipo navegable con datos sintéticos. El modelo y el ERP todavía
**no están conectados**.

---
---

## 🆘 Si te cortan el tiempo — versión 60 segundos

Administración imprime las órdenes y las entrega en papel. Desde ahí pierde visibilidad: para saber
cómo viene un pedido hay que ir a planta e interrumpir al jefe.

El ERP resuelve dónde viven los datos, pero no el canal: un operario con guantes y la máquina
andando no va a completar formularios.

Proponemos una capa conversacional por voz sobre el ERP. Tres bloques: el widget y la transcripción
reciben; el modelo de IA **solo interpreta** y elige la herramienta; el middleware **decide** —
permisos, reglas, confirmación y auditoría— y es la única vía de escritura. El ERP ejecuta.

El modelo entiende, el middleware decide, el ERP ejecuta. Si el modelo se equivoca, no rompe nada.

---

## 🎯 Lo que no podés dejar de decir

Si tuvieras que salvar **tres frases**, son estas:

1. *"Administración imprime la OF y desde ahí pierde visibilidad."* → el problema, concreto.
2. *"El ERP resuelve dónde viven los datos, pero no el canal."* → por qué hace falta esto.
3. *"El modelo entiende, el middleware decide, el ERP ejecuta."* → la arquitectura entera.

---

## 💬 Preguntas probables

| Pregunta | Respuesta en una línea |
|---|---|
| *¿Qué quiere decir que no ejecuta SQL?* | El modelo no escribe consultas. Elige una herramienta de un catálogo cerrado y la devuelve como JSON. Quien valida y ejecuta es el middleware, y quien toca la base es el ERP. |
| *¿Y qué hace exactamente cuando interpreta?* | Traduce la frase a una llamada: identifica la intención y extrae los parámetros. Si falta un dato, repregunta en vez de inventarlo. Después, con el resultado, redacta la respuesta. |
| *¿Y si el modelo se equivoca?* | No puede escribir. Propone; el middleware valida permisos y reglas, y la persona confirma. Confirmar, cancelar y rechazar quedan los tres auditados. |
| *¿Por qué no un menú o un formulario?* | Es el complemento, no el canal principal: obliga al operario a detener la máquina. La voz existe para no interrumpir la cadencia de trabajo. |
| *¿Y si hay mucho ruido en planta?* | Es un riesgo identificado en T-09. Por eso la alternativa por texto está siempre disponible, y el servicio de transcripción definitivo todavía hay que elegirlo y probarlo en planta. |
| *¿Qué pasa con los datos que se mandan al proveedor del modelo?* | Se envía el contexto mínimo. Credenciales, datos bancarios y salariales están excluidos del alcance. Las condiciones contractuales se revisan antes de producción. |
| *¿Está funcionando de verdad?* | La interfaz sí, con datos sintéticos. El modelo, el middleware y el ERP están simulados. La integración real es la fase siguiente. |
| *¿Cuánto cuesta?* | No está validado. Depende del modelo, del proveedor de transcripción y del volumen. Estimarlo es parte de los próximos pasos. |

---

## 🔍 Si te piden detalle: qué hace el modelo, paso a paso

Existe una arquitectura, **text-to-SQL**, donde el modelo escribe la consulta directamente. **La
descartamos a propósito**: ahí la superficie de lo que puede pedir es *todo lo expresable en SQL*, y
los permisos terminan dependiendo de que el modelo se porte bien. Eso no es un control.

En cambio, el modelo recibe un **catálogo cerrado de herramientas** y su único trabajo es traducir
la frase a una de esas llamadas.

Ante *«Pasá el ítem 333 a tratamiento»*, el modelo produce **texto**:

```json
{
  "herramienta": "actualizar_estado_item",
  "parametros": { "of_detalle_id": 333, "etapa": "Tratamiento" }
}
```

Y ahí **termina su trabajo**. Todavía no pasó nada.

Después, el **middleware** decide: ¿este rol puede llamar esa herramienta? ¿el ítem existe? ¿la
etapa está en el catálogo del ERP? ¿la transición está permitida? ¿la persona confirmó? Recién
entonces llama a la **API REST** del ERP — tampoco escribe SQL. Y el ERP es el único que toca la
base, dentro de su propia lógica de negocio.

> **La analogía:** el modelo es el que **completa el formulario**, no el que tiene la llave del
> depósito. Si se equivoca, llenó mal un formulario. No rompió nada.

Un detalle que conviene mencionar: el modelo se usa **dos veces**. A la entrada, para entender. A la
salida, para redactar la respuesta con lo que devolvió el ERP. En el medio no participa.

**En el prototipo:** `src/lib/nlu.ts` → `analizar()` devuelve `{ intencion, herramienta, slots }` —
ese es el tool call simulado. `src/store/AppContext.tsx` → `ejecutar()` es el middleware. En el chat
se ve debajo de cada respuesta: *«herramienta invocada: `actualizar_estado_item()`»*.

---

## ✅ Antes de salir a presentar

- [ ] Abrí la demo **en una pestaña propia**, no embebida — el micrófono se bloquea dentro de un iframe.
- [ ] Probá el dictado una vez. Chrome o Edge.
- [ ] Dejá el diagrama de arquitectura abierto en otra pestaña.
- [ ] Si vas a mostrar una operación, usá **"Pasá el ítem 333 a tratamiento"** con el perfil Jefe de
      Producción: muestra el panel de confirmación, que es el corazón del diseño.
- [ ] No prometas lo que está simulado. Decí "está simulado" y seguí: resta cero y suma criterio.
