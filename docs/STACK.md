# Stack y herramientas — BRIMEC

Las herramientas, capa por capa, distinguiendo **lo que está construido** de **lo que está
propuesto**. Los diagramas de estructura están en [`ARQUITECTURA.md`](ARQUITECTURA.md).

> **Por qué los logos no están dentro de los diagramas:** Mermaid no puede mostrar imágenes dentro
> de los nodos cuando GitHub lo renderiza — el visor sanitiza el HTML de las etiquetas y descarta
> los `<img>`. Por eso los diagramas van en Mermaid (estructura) y los logos en tablas HTML
> (herramientas). Hay una versión que combina ambas cosas en una sola página, enlazada al final.

---

## 🟩 Construido: el prototipo navegable

Todo esto funciona hoy en <https://MateoSantolin.github.io/brimec-asistente/>.

<table>
<tr>
<td align="center" width="120"><img src="logos/react.svg" width="40" height="40" alt="React"><br><sub><b>React 18</b></sub></td>
<td>Interfaz de las 7 pantallas. Estado de la aplicación mediante Context, sin librería externa de estado: el alcance no la justifica.</td>
</tr>
<tr>
<td align="center"><img src="logos/vite.svg" width="40" height="40" alt="Vite"><br><sub><b>Vite 5</b></sub></td>
<td>Empaquetado y servidor de desarrollo. Se configuró <code>base: './'</code> para que el build funcione en cualquier subruta sin reconfigurar.</td>
</tr>
<tr>
<td align="center"><img src="logos/typescript.svg" width="40" height="40" alt="TypeScript"><br><sub><b>TypeScript</b></sub></td>
<td>Las interfaces replican los nombres de tabla y campo del modelo de datos destino en <code>snake_case</code>, para que la correspondencia con el ERD sea verificable uno a uno.</td>
</tr>
<tr>
<td align="center"><img src="logos/tailwindcss.svg" width="40" height="40" alt="Tailwind CSS"><br><sub><b>Tailwind CSS</b></sub></td>
<td>Sistema visual. Los tokens de color salen de las variables reales de <a href="https://brimec.com.ar">brimec.com.ar</a>.</td>
</tr>
<tr>
<td align="center"><img src="logos/reactrouter.svg" width="40" height="40" alt="React Router"><br><sub><b>React Router</b></sub></td>
<td>Enrutado por hash, para que recargar una pantalla interna no devuelva 404 en un hosting estático.</td>
</tr>
<tr>
<td align="center"><img src="logos/lucide.svg" width="40" height="40" alt="Lucide"><br><sub><b>Lucide</b></sub></td>
<td>Iconografía. Es la única dependencia de interfaz más allá de React.</td>
</tr>
<tr>
<td align="center"><img src="logos/googlechrome.svg" width="40" height="40" alt="Web Speech API"><br><sub><b>Web Speech API</b></sub></td>
<td><b>Dictado por voz.</b> T-09 define la voz como canal principal: el operario tiene las manos ocupadas. Funciona en Chrome y Edge; siempre queda la alternativa por texto, porque el ruido de planta es un riesgo identificado.</td>
</tr>
</table>

### Herramientas de soporte

<table>
<tr>
<td align="center" width="120"><img src="logos/nodedotjs.svg" width="36" height="36" alt="Node.js"><br><sub><b>Node.js 20</b></sub></td>
<td>Entorno de build y ejecución del banco de pruebas.</td>
</tr>
<tr>
<td align="center"><img src="logos/python.svg" width="36" height="36" alt="Python"><br><sub><b>Python</b></sub></td>
<td>Generación determinista de los datos sintéticos (<code>scripts/generar-datos.py</code>) y corrección de los entregables <code>.docx</code>.</td>
</tr>
<tr>
<td align="center"><img src="logos/githubactions.svg" width="36" height="36" alt="GitHub Actions"><br><sub><b>GitHub Actions</b></sub></td>
<td>En cada push: instala, <b>corre los 41 casos de prueba</b>, compila y publica. <b>Si un test falla, no publica.</b></td>
</tr>
<tr>
<td align="center"><img src="logos/githubpages.svg" width="36" height="36" alt="GitHub Pages"><br><sub><b>GitHub Pages</b></sub></td>
<td>Hosting estático de la demo. Sin costo y con HTTPS, que el micrófono exige.</td>
</tr>
</table>

---

## 🟨 Simulado: el flujo se representa, la tecnología no está conectada

| Capa | Qué hace el prototipo | Qué haría la solución real |
|---|---|---|
| **Comprensión del lenguaje** | Analizador por reglas **tolerante**: normaliza acentos, acepta sinónimos de taller, soporta errores de tipeo y de transcripción, detecta ambigüedad y repregunta | Un LLM con *tool calling* |
| **Transcripción de voz** | La hace el navegador | Un servicio de Speech-to-Text contratado, con su contrato de tratamiento de datos |
| **Persistencia** | LocalStorage | La base de datos del ERP, vía middleware |
| **Seguridad** | La matriz RBAC se evalúa en el navegador | Validación del lado servidor, obligatoria |

> ⚠️ Los controles de permisos del prototipo **no son un control de seguridad**. Representan el
> flujo. Un usuario con la consola del navegador abierta podría saltearlos. Por eso T-10 insiste en
> que la autorización debe vivir en el backend.

---

## ⬜ Propuesto para producción

Ninguna de estas piezas está implementada ni conectada.

<table>
<tr>
<td align="center" width="120"><img src="logos/openai.svg" width="40" height="40" alt="LLM"><br><sub><b>LLM con tool calling</b></sub></td>
<td>Interpreta la intención y elige la herramienta a invocar. <b>Proveedor y modelo por evaluar</b>: hay que comparar precisión, latencia, costo por token y, sobre todo, las condiciones de retención y uso de los datos.</td>
</tr>
<tr>
<td align="center"><img src="logos/fastapi.svg" width="40" height="40" alt="FastAPI"><br><sub><b>FastAPI</b></sub></td>
<td>Middleware. Centraliza autenticación, autorización, reglas de negocio, confirmación y auditoría. Es la <b>única</b> vía de escritura.</td>
</tr>
<tr>
<td align="center"><img src="logos/odoo.svg" width="40" height="40" alt="Odoo"><br><sub><b>ERP SaaS (Odoo)</b></sub></td>
<td>Sistema transaccional. Provee los datos maestros, el catálogo de etapas, las reglas y el registro de auditoría. <b>Su puesta en marcha es la dependencia número uno.</b></td>
</tr>
<tr>
<td align="center"><img src="logos/postgresql.svg" width="40" height="40" alt="PostgreSQL"><br><sub><b>Base de datos</b></sub></td>
<td>Persistencia del ERP. El modelo nunca la toca: no accede directo ni ejecuta SQL.</td>
</tr>
</table>

---

## Por qué este stack y no la herramienta de prototipado

T-10 registraba originalmente que el prototipo se había construido en una suite de prototipado
(Lovable / v0). Se rehízo sobre código propio por tres razones concretas:

1. **El catálogo de etapas tenía que salir de un archivo de configuración**, no estar fijado en el
   código. Es el requisito de la regla 3 del prompt de T-10 y no se puede demostrar dentro de una
   herramienta cerrada.
2. **Las entidades debían replicar el modelo de datos destino** campo por campo. Eso permitió
   detectar cuatro huecos reales del ERD que hoy están documentados.
3. **Un banco de pruebas automatizado.** 41 casos que cubren CP-01 a CP-10, la tolerancia a errores
   de tipeo y de voz, y —explícitamente— un caso donde el analizador **falla**.

Sin costo de licencia, y el código queda auditable línea por línea por la cátedra.

---

## Versión con logos dentro de los diagramas

La página combinada —diagramas **y** logos en un mismo lugar, con la arquitectura ilustrada— está
publicada como artefacto visual aparte. El enlace está en el [README](../README.md).

---

Los logotipos provienen de [Simple Icons](https://simpleicons.org) bajo licencia
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (dominio público). Ver
[`logos/LICENSE.md`](logos/LICENSE.md).
