# Guion de Mateo — versión trabajada

Parte de [`GUION-MATEO`](GUION-MATEO), que **queda tal cual está**. Acá va la misma estructura con
otra elección de palabras, un error de arquitectura corregido y un paso que faltaba.

Tu original: **329 palabras ≈ 2:21**. Esta versión: ver al pie.

---

## ▶ El texto

> 🗣️ Pausá donde hay párrafo. Al llegar a *«Así funciona»*, girá hacia el diagrama.

Antes de elegir una solución con inteligencia artificial generativa, nos hicimos una pregunta que no
nos habíamos hecho: **¿cuál es el dolor más grande que nos marcaron en el relevamiento?**

Y coincidimos: **la falta de comunicación entre el taller y administración.**

Buena parte de eso lo resuelve el ERP, como ya explicaron mis compañeros: centralizar los datos.
Pero nos quedó dando vueltas algo que nos dijo el sponsor:

> *«Necesito que los chicos de la planta no pierdan tiempo completando formularios ni listas
> desplegables. Tiene que ser algo rápido e intuitivo.»*

De ese pedido nació **Asistente de Taller**: una capa que interpreta lo que el usuario pide en su
propio idioma y le permite consultar, crear y actualizar pedidos, órdenes de fabricación e ítems.

**Así funciona.** Sigamos una frase.

El jefe de producción escribe —o dicta— **«pasá el ítem 333 a tratamiento»**.

El **middleware** recibe la petición, valida quién es y qué rol tiene, y arma la consulta que le va a
mandar al modelo.

El **modelo** interpreta el mensaje y elige la herramienta que corresponde. Si le falta un dato, lo
pregunta. Y ahí termina su trabajo: **no toca los datos.**

El middleware revisa que la operación esté permitida, **le muestra el cambio al usuario y espera que
confirme**. Recién entonces llama a la **API del ERP**, que es donde viven los datos.

El ERP devuelve el resultado, el modelo lo redacta en castellano, y el usuario lo ve.

Además de plantear la solución, construimos un **prototipo**. Nos enfocamos en que la interfaz sea
simple, predecible y fácil de navegar, y en aplicar **mínimo privilegio**: cada rol ve y hace solo lo
suyo.

Esto facilita consultar y actualizar las órdenes, mejora la experiencia del usuario y ayuda a que el
cambio digital se incorpore con menos resistencia.

---

## ⚠️ Un error que conviene corregir

En tu versión el flujo dice:

> *«el middleware es capaz de enviar una request a la base de datos del ERP (donde viven los datos)»*

**El middleware no toca la base.** Llama a la **API del ERP**, y es el ERP el que escribe en su base,
dentro de su propia lógica.

No es una sutileza: si decís que el middleware va a la base, estás describiendo justo la arquitectura
que descartamos. Y si te repreguntan *«¿entonces la IA puede llegar a los datos?»*, la respuesta
deja de ser limpia.

El cambio es una palabra: **base de datos → API del ERP**.

---

## ➕ Un paso que faltaba: la confirmación

Tu flujo va: middleware → modelo → datos → respuesta. Entre *«está permitido»* y *«se ejecuta»* falta
**el usuario confirmando**.

Es el paso más fuerte que tenés para defender la solución, porque responde antes de que la hagan la
pregunta obvia: *«¿y si la IA se manda una macana?»*. La respuesta es que **no puede**: propone, y
una persona confirma.

Además está dibujado en el diagrama —el chip **Confirmación**— así que si no lo mencionás queda un
elemento en pantalla sin explicar.

---

## 🔄 El ejemplo

Cambié *«actualizar el estado del pedido 303 a finalizado»* por *«pasá el ítem 333 a tratamiento»*,
por tres razones:

1. **Los pedidos no tienen etapas.** Las etapas de producción son de los **ítems**; el estado de la
   OF se deriva de ellos. Un pedido tiene otro estado (abierto, en producción, entregado).
2. **El salto a «finalizado» no suele estar permitido** — hay que pasar por las etapas intermedias.
   Si alguien conoce el modelo, el ejemplo se cae.
3. **Es el mismo caso que se ve en el video**, así que las dos diapositivas se refuerzan en vez de
   contar casos distintos.

---

## ✍️ Cambios de redacción

| Tu versión | Propuesta | Por qué |
|---|---|---|
| *«Una pregunta que no hicimos antes de plantear y elegir una solución… fue cuál es el dolor más grande»* | *«nos hicimos una pregunta que no nos habíamos hecho: ¿cuál es el dolor más grande…?»* | La pregunta se **hace**, no se anuncia. Dicha como pregunta real, la gente la contesta mentalmente |
| *«Todos estuvimos de acuerdo que la falta de un medio de comunicación…?»* | *«Y coincidimos: la falta de comunicación entre el taller y administración.»* | Era afirmación con signo de pregunta. Como respuesta corta pega más |
| *«Pero además de eso que, como ya explicaron mis compañeros, el ERP y los datos centralizados venía a solucionar»* | *«Buena parte de eso lo resuelve el ERP, como ya explicaron mis compañeros»* | 19 palabras → 11, y se desenreda la subordinada |
| *«Nos acordamos de una inquietud que nos marcó nuestro sponsor»* | *«nos quedó dando vueltas algo que nos dijo el sponsor»* | «Nos quedó dando vueltas» suena a persona; «inquietud que nos marcó» suena a informe |
| *«normas de mínimos privilegios»* | *«mínimo privilegio»* | Es el nombre correcto del principio. Dicho mal, le da a un evaluador un lugar donde pinchar |
| *«interpretar la solicitud del usuario en lenguaje natural, interprete su petición»* | *«interpreta lo que el usuario pide en su propio idioma»* | Decía «interpretar» dos veces en la misma frase |
| *«el LLM»* | *«el modelo»* | En castellano hablado, la sigla obliga a deletrear. «El modelo» ya quedó definido |
| *«prototipo de solución»* | *«prototipo»* | |
| *«esto facilitará enormemente»* | *«esto facilita»* | El futuro suena a promesa. El presente suena a hecho, y además ya lo mostraste |

---

## 📝 Ortografía

Por si querés corregir [`GUION-MATEO`](GUION-MATEO) — están todas en el original:

`elelgir` → elegir · `artifical` → artificial · `enttre` → entre · `compenieros` → compañeros ·
`iterpte` → interprete · `fbricacion` → fabricación · `mensaie` → mensaje · `solictiar` → solicitar ·
`midleware` → middleware · `prebicible` → predecible · `tambirn` → también ·
`acutalizacion` → actualización · `expreriencia` → experiencia · `suaurio` → usuario ·
`mejoara` → mejorará · `guin` → guion

---

## ⏱️ Duración

| | Palabras | Tiempo |
|---|---|---|
| Tu original | 329 | ~2:21 |
| Esta versión | 275 | ~1:57 |

Si tu tramo tiene que entrar en **3 minutos con la diapositiva del video**, esto es largo: te deja
menos de un minuto para el video. Dos formas de recortar, en orden de lo que menos duele:

1. **El último párrafo** (*«esto facilita consultar y actualizar…»*) — los beneficios ya se
   entienden solos. −20 s.
2. **El párrafo del prototipo** — pasalo a la diapositiva 2, que es donde se ve. −20 s.

Con esos dos cortes el tramo queda en ~1:40 y el video entra cómodo.

**Lo que no conviene recortar:** la pregunta del arranque, la cita del sponsor y el recorrido del
ejemplo. Son las tres cosas que hacen que esto suene a trabajo de campo y no a presentación genérica.
