# Explicar la arquitectura siguiendo un ejemplo

Versión alternativa del tramo de arquitectura de la **diapositiva 1**.
El guion completo de la presentación sigue en [`GUION-PRESENTACION.md`](GUION-PRESENTACION.md),
sin cambios.

**La idea:** en vez de describir las siete piezas una por una, se sigue **una sola frase** mientras
atraviesa el diagrama. El oyente no tiene que armar el recorrido en su cabeza: lo ve pasar.

La frase que se usa es la misma que después aparece en el video, así que las dos diapositivas se
refuerzan.

---

## ▶ Versión mínima · ~36 segundos · 86 palabras

> **Es la única que entra en una presentación de 3 minutos.** Si el problema te lleva 40 s, a la
> arquitectura le quedan unos 30.
> 🗣️ *Señalá cada caja cuando la nombres. El número de la tarjeta te marca el orden.*

Sigamos una frase.

El jefe dice: **«pasá el ítem 333 a tratamiento»**.

Entra por el **widget**, la transcripción lo pasa a texto, y el widget se lo manda **al middleware**
— no al modelo.

El middleware le pregunta al **modelo** qué le están pidiendo. El modelo contesta qué herramienta
usar. **Ahí termina su trabajo.**

Y el middleware decide: si podés hacerlo, si la regla lo permite, y te pide confirmación. Recién ahí
el **ERP** escribe.

Por eso el modelo está al costado: **se lo consulta, no decide.**

---

## ▶ Versión con el recorrido completo · ~53 segundos · 124 palabras

> Suma la vuelta y los cuatro controles. Si la usás, la diapositiva 1 se va a ~1:30 y el total a
> ~3:10: decidí vos si el minuto extra vale.

Sigamos una frase por el diagrama.

El jefe de producción agarra el micrófono y dice: **«pasá el ítem 333 a tratamiento»**.

Entra por el **widget**, que vive dentro del ERP. La **transcripción** lo pasa a texto.

Y el widget se lo manda **al middleware** — no al modelo.

El middleware le pregunta al **modelo**: ¿qué me están pidiendo? El modelo contesta qué herramienta
usar y con qué datos. **Ahí termina su trabajo.**

Entonces el middleware decide: quién sos, si podés hacerlo, si ese salto de etapa está permitido. Y
antes de escribir, te muestra el cambio y espera que confirmes.

Recién ahí el **ERP** escribe, y queda auditado.

Por eso el modelo está al costado y no en la fila: **se lo consulta, no decide.**

---

## ▶ Versión extendida · ~1:53 · 265 palabras

> No es para la presentación: es para responder si te repreguntan por la arquitectura.

Sigamos una frase por el diagrama, así se ve el recorrido completo.

El jefe de producción dice: **«pasá el ítem 333 a tratamiento»**.

Eso entra por el **widget**, que vive dentro del ERP, y la **transcripción** lo convierte en texto.

El widget se lo manda **al middleware**. No al modelo. Y acá está la decisión más importante del
diseño.

El middleware arma la consulta y le pregunta al **modelo**: ¿qué me están pidiendo? El modelo
responde: *quieren actualizar el estado del ítem 333 a tratamiento*. Devuelve qué herramienta usar y
con qué datos. **Nada más.** No tocó la base, no escribió nada.

Con esa respuesta, el middleware decide, y pasa cuatro controles.

Primero, **quién es**: identidad y permisos. Si ese perfil no puede cambiar etapas, se frena acá y
queda registrado el intento.

Segundo, **si tiene sentido**: que el ítem exista, que esa etapa exista.

Tercero, **si la regla lo permite**: el catálogo del ERP dice a qué etapas se puede pasar desde
donde está.

Y cuarto, **confirmación**: le muestra a la persona el estado actual y el propuesto, y **espera**.
Hasta ese momento no se escribió nada.

Confirmado, el **conector** lo traduce en una llamada al ERP, y el **ERP** escribe y registra la
auditoría.

Después vuelve: el ERP devuelve el dato, el middleware se lo pasa al modelo **otra vez** para que lo
redacte en castellano, y el widget lo muestra.

El modelo se usa dos veces: para entender y para redactar. En el medio no participa.

Por eso está al costado. **Si se equivoca, no rompe nada: no tiene permiso para escribir.**

---

## Qué cambié de tu versión, y por qué

Tu texto está bien y dice la verdad. Los cambios son de **oralidad**, no de contenido.

| Tu versión | Propuesta | Por qué |
|---|---|---|
| *«Fuente: docs/ARQUITECTURA.md del repositorio…»* | — se saca | Es una cita de origen. Sirve en una nota escrita, no se dice en voz alta |
| *«Patrón de agente con herramientas sobre una arquitectura desacoplada»* | va **al final**, si va | Abrir con la categoría teórica obliga al oyente a traducirla mientras seguís hablando. Primero que vea el movimiento, después ponele el nombre |
| *«la autorización, la ejecución de las transacciones y el acceso a los datos quedan bajo control del middleware y del ERP»* | *«quién decide y quién escribe es el middleware»* | 21 palabras → 8. Una frase con tres sujetos coordinados se entiende leyéndola; escuchándola, no |
| *«acota el riesgo de modificaciones indebidas»* | *«si se equivoca, no rompe nada»* | Lo abstracto no se recuerda. La consecuencia sí |
| *«comprender el lenguaje natural»* | *«entender lo que le dijeron»* | |
| *«el modelo generativo nunca toca los datos»* | *«no tocó la base, no escribió nada»* | «Generativo» ya está en la volanta. Y en pasado, porque viene de seguir el ejemplo |
| *«Están simulados la comprensión del lenguaje (un analizador por reglas, no un modelo)»* | *«La comprensión está simulada: son reglas, no un modelo»* | Los paréntesis no se escuchan. Dos puntos sí |
| Descripción de las piezas | Un ejemplo que las atraviesa | **El cambio principal.** Siete definiciones seguidas se olvidan; un recorrido se sigue |

### Tres cosas tuyas que dejé igual

1. **El orden widget → middleware → modelo.** Lo tenías bien.
2. **La honestidad sobre lo simulado.** No la toqué, solo la moví (ver abajo).
3. **«El modelo nunca toca los datos».** Es la frase más fuerte de tu versión. La conservé, en pasado y partida en dos.

---

## Dónde queda lo que está simulado

Tu nota cerraba enumerando qué funciona y qué no. **En la versión con ejemplo eso no entra**: cortaría
el recorrido justo cuando llegó al final.

Va en la **diapositiva 2**, al cerrar el video, donde el guion ya dice:

> *«Esto es un prototipo con datos sintéticos. La interfaz y el flujo son reales; el modelo, el
> middleware y el ERP están simulados. La integración es la fase siguiente.»*

Es el mismo contenido, dicho una sola vez y en el lugar donde pega: justo después de mostrarlo
funcionando. Decirlo dos veces lo debilita.

> ⚠️ **No te saltees esa frase.** Desde que quitamos las etiquetas de estado del diagrama, es el
> único lugar donde se aclara qué está construido y qué no.

---

## Si preferís mantener el nombre del patrón

Para una defensa técnica puede convenir nombrarlo. Va **al final**, como cierre, nunca de entrada:

> Esto es un patrón de **agente con herramientas** sobre una arquitectura desacoplada: el modelo
> elige la herramienta, el middleware la ejecuta.

Son 22 palabras. Si vas justo de tiempo, se saca sin perder nada: el diagrama ya lo mostró.
