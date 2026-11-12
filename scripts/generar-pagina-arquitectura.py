# -*- coding: utf-8 -*-
"""Genera la pagina de arquitectura del artifact a partir de docs/ARQUITECTURA.md.

Fuente unica de verdad: los diagramas se extraen del .md, no se duplican.
Los logos se incrustan como SVG inline con fill=currentColor, para que tomen el color
de marca desde CSS y no contaminen el resto de la pagina.
"""
import io, os, re, html

APP = r"C:/Users/Mateo}/Desktop/Brimec/projecto_brimec/projecto_brimec/templates/ia/brimec-asistente/"
MD = APP + "docs/ARQUITECTURA.md"
LOGOS = APP + "docs/logos/"
SALIDA = APP + "docs/pagina-arquitectura.html"

# color de marca: claro / oscuro
COLOR = {
    'react': ('#087EA4', '#61DAFB'), 'vite': ('#646CFF', '#A78BFA'),
    'typescript': ('#3178C6', '#6CA9E8'), 'tailwindcss': ('#0891B2', '#38BDF8'),
    'nodedotjs': ('#5FA04E', '#8CC474'), 'npm': ('#CB3837', '#F87171'),
    'github': ('#181717', '#E6EDF3'), 'githubactions': ('#2088FF', '#6CB6FF'),
    'githubpages': ('#181717', '#E6EDF3'), 'fastapi': ('#009688', '#2DD4BF'),
    'odoo': ('#714B67', '#C4A3BC'), 'postgresql': ('#4169E1', '#8FA6F0'),
    'openai': ('#412991', '#B39DDB'), 'python': ('#3776AB', '#6CA9E8'),
    'googlechrome': ('#1A73E8', '#8AB4F8'), 'lucide': ('#E05252', '#F87171'),
    'reactrouter': ('#CA4245', '#F87171'), 'eslint': ('#4B32C3', '#A78BFA'),
    'markdown': ('#333333', '#D1D5DB'),
}


def svg_inline(slug: str) -> str:
    """SVG listo para incrustar: sin <style> propio y pintado con currentColor."""
    s = io.open(LOGOS + slug + ".svg", encoding="utf8").read()
    s = re.sub(r"<style>.*?</style>", "", s, flags=re.S)
    s = s.replace("<svg ", '<svg fill="currentColor" aria-hidden="true" focusable="false" ', 1)
    s = re.sub(r'\s(width|height)="[^"]*"', "", s)
    return s.strip()


def tarjeta(slug: str, nombre: str, detalle: str) -> str:
    return (
        f'<li class="herramienta l-{slug}">'
        f'<span class="marca">{svg_inline(slug)}</span>'
        f'<div><b>{html.escape(nombre)}</b><p>{detalle}</p></div>'
        f"</li>"
    )


# ------------------------------------------------------------- diagramas del .md
md = io.open(MD, encoding="utf8").read()
diagramas = [m.strip() for m in re.findall(r"```mermaid\n([\s\S]*?)```", md)]
assert len(diagramas) == 6, f"se esperaban 6 diagramas, hay {len(diagramas)}"


def bloque(i: int) -> str:
    return f'<div class="lienzo"><pre class="mermaid">{html.escape(diagramas[i])}</pre></div>'


# ------------------------------------------------------------- reglas de color de logos
reglas_claro = "\n".join(f"  .l-{s} .marca {{ color: {c[0]}; }}" for s, c in COLOR.items())
reglas_oscuro = "\n".join(f"  .l-{s} .marca {{ color: {c[1]}; }}" for s, c in COLOR.items())

CONSTRUIDO = [
    ("react", "React 18", "Las 7 pantallas. Estado por Context, sin librería externa: el alcance no la justifica."),
    ("vite", "Vite 5", "Build y servidor de desarrollo. <code>base: './'</code> para que funcione en cualquier subruta."),
    ("typescript", "TypeScript", "Las interfaces replican el modelo de datos destino en <code>snake_case</code>, campo por campo."),
    ("tailwindcss", "Tailwind CSS", "Sistema visual con los tokens de color reales de brimec.com.ar."),
    ("reactrouter", "React Router", "Enrutado por hash: recargar una pantalla interna no devuelve 404."),
    ("lucide", "Lucide", "Iconografía. Única dependencia de interfaz más allá de React."),
    ("googlechrome", "Web Speech API", "<b>Dictado por voz.</b> T-09 lo define como canal principal: el operario tiene las manos ocupadas."),
]

SOPORTE = [
    ("nodedotjs", "Node.js 20", "Entorno de build y del banco de pruebas."),
    ("python", "Python", "Generación determinista de los datos sintéticos y corrección de los <code>.docx</code>."),
    ("githubactions", "GitHub Actions", "Instala, corre los <b>41 casos</b>, compila y publica. Si un test falla, no publica."),
    ("githubpages", "GitHub Pages", "Hosting estático con HTTPS — que el micrófono exige."),
]

PROPUESTO = [
    ("openai", "LLM con tool calling", "Interpreta la intención y elige la herramienta. <b>Proveedor por evaluar</b>: precisión, latencia, costo y condiciones de tratamiento de datos."),
    ("fastapi", "FastAPI", "Middleware. Autenticación, RBAC, reglas, confirmación y auditoría. Única vía de escritura."),
    ("odoo", "ERP SaaS (Odoo)", "Sistema transaccional: maestros, catálogo de etapas, reglas y auditoría. <b>Dependencia número uno.</b>"),
    ("postgresql", "Base de datos", "Persistencia del ERP. El modelo nunca la toca: ni accede directo ni ejecuta SQL."),
]

pagina = f"""<link rel="stylesheet" href="./fuentes.css" />
<style>
  :root {{
    --tinta:#1D2433; --tenue:#5A6478; --borde:#DDE3EC;
    --fondo:#F5F7F9; --panel:#FFFFFF; --papel:#FFFFFF;
    --navy:#243673; --primario:#0084D6; --suave:#BFD1FF;
    --ok:#059669; --okf:#D1FAE5; --sim:#D97706; --simf:#FEF3C7;
    --no:#64748B; --nof:#E2E8F0;
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --tinta:#E6EBF4; --tenue:#98A3B8; --borde:#2C3754;
      --fondo:#0F1526; --panel:#171F36; --papel:#FFFFFF;
      --navy:#BFD1FF; --primario:#4FA8E8; --suave:#2A3A66;
      --ok:#34D399; --okf:#10341F; --sim:#FBBF24; --simf:#3A2A08;
      --no:#94A3B8; --nof:#232D45;
    }}
  }}
  :root[data-theme="dark"] {{
    --tinta:#E6EBF4; --tenue:#98A3B8; --borde:#2C3754;
    --fondo:#0F1526; --panel:#171F36; --papel:#FFFFFF;
    --navy:#BFD1FF; --primario:#4FA8E8; --suave:#2A3A66;
    --ok:#34D399; --okf:#10341F; --sim:#FBBF24; --simf:#3A2A08;
    --no:#94A3B8; --nof:#232D45;
  }}
  :root[data-theme="light"] {{
    --tinta:#1D2433; --tenue:#5A6478; --borde:#DDE3EC;
    --fondo:#F5F7F9; --panel:#FFFFFF; --papel:#FFFFFF;
    --navy:#243673; --primario:#0084D6; --suave:#BFD1FF;
    --ok:#059669; --okf:#D1FAE5; --sim:#D97706; --simf:#FEF3C7;
    --no:#64748B; --nof:#E2E8F0;
  }}

  body {{
    margin:0; background:var(--fondo); color:var(--tinta);
    font-family:Inter,system-ui,sans-serif; font-size:15px; line-height:1.65;
    -webkit-font-smoothing:antialiased;
  }}
  .hoja {{ max-width:1040px; margin:0 auto; padding:40px 20px 80px; }}
  h1,h2,h3 {{ font-family:Oswald,Impact,sans-serif; letter-spacing:.02em; text-wrap:balance; margin:0; }}
  h1 {{ font-size:clamp(28px,5vw,40px); line-height:1.1; color:var(--navy); }}
  h2 {{ font-size:23px; color:var(--navy); margin:56px 0 6px; }}
  h3 {{ font-size:16px; text-transform:uppercase; letter-spacing:.1em; color:var(--tenue); margin:28px 0 10px; }}
  p {{ margin:10px 0; max-width:72ch; }}
  code {{ font-family:ui-monospace,Consolas,monospace; font-size:.88em;
          background:var(--nof); padding:1px 5px; border-radius:4px; }}
  a {{ color:var(--primario); }}
  small {{ color:var(--tenue); }}

  .cabecera {{ border-bottom:2px solid var(--borde); padding-bottom:26px; }}
  .sello {{ display:inline-flex; align-items:center; gap:8px; font-family:Oswald,sans-serif;
            font-size:11px; letter-spacing:.18em; color:var(--tenue); text-transform:uppercase; }}
  .enlaces {{ display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; }}
  .enlaces a {{ display:inline-flex; align-items:center; gap:7px; text-decoration:none;
    border:1px solid var(--borde); background:var(--panel); color:var(--tinta);
    padding:8px 14px; border-radius:9px; font-size:13px; font-weight:600; transition:.15s; }}
  .enlaces a:hover {{ border-color:var(--primario); color:var(--primario); }}
  .enlaces a svg {{ width:15px; height:15px; }}

  .leyenda {{ display:flex; flex-wrap:wrap; gap:8px; margin:22px 0 0; padding:0; list-style:none; }}
  .leyenda li {{ display:inline-flex; align-items:center; gap:7px; font-size:12.5px;
                 padding:5px 11px; border-radius:999px; font-weight:600; }}
  .leyenda .v {{ background:var(--okf); color:var(--ok); }}
  .leyenda .a {{ background:var(--simf); color:var(--sim); }}
  .leyenda .g {{ background:var(--nof); color:var(--no); }}

  /* Los diagramas van sobre papel blanco en ambos temas: sus colores estan
     definidos en el propio Mermaid y asi se leen igual de bien siempre. */
  .lienzo {{ background:var(--papel); border:1px solid var(--borde); border-radius:14px;
    padding:22px 16px; margin:18px 0 6px; overflow-x:auto;
    box-shadow:0 1px 2px rgba(36,54,115,.05), 0 10px 30px -18px rgba(36,54,115,.25); }}
  .lienzo .mermaid {{ margin:0; display:flex; justify-content:center; min-width:min-content; }}

  .nota {{ border-left:3px solid var(--primario); background:var(--panel);
    padding:12px 16px; border-radius:0 10px 10px 0; margin:16px 0; font-size:14px; }}
  .alerta {{ border-left-color:var(--sim); }}

  ul.herramientas {{ list-style:none; padding:0; margin:14px 0 0;
    display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); }}
  .herramienta {{ display:flex; gap:14px; align-items:flex-start;
    background:var(--panel); border:1px solid var(--borde); border-radius:12px; padding:14px 16px; }}
  .herramienta .marca {{ flex:0 0 30px; }}
  .herramienta .marca svg {{ width:30px; height:30px; display:block; }}
  .herramienta b {{ font-size:14.5px; display:block; }}
  .herramienta p {{ margin:3px 0 0; font-size:13px; color:var(--tenue); line-height:1.5; }}

  table {{ border-collapse:collapse; width:100%; margin:14px 0; font-size:13.5px; }}
  th,td {{ text-align:left; padding:9px 12px; border-bottom:1px solid var(--borde); vertical-align:top; }}
  th {{ font-family:Oswald,sans-serif; font-weight:500; font-size:11.5px;
        text-transform:uppercase; letter-spacing:.1em; color:var(--tenue); }}
  .tabla-envoltorio {{ overflow-x:auto; }}

  footer {{ margin-top:64px; padding-top:22px; border-top:1px solid var(--borde);
            font-size:12.5px; color:var(--tenue); }}

{reglas_claro}
  @media (prefers-color-scheme: dark) {{
{reglas_oscuro}
  }}
  :root[data-theme="dark"] {{
{reglas_oscuro}
  }}
  :root[data-theme="light"] {{
{reglas_claro}
  }}
  @media (prefers-reduced-motion: reduce) {{ * {{ transition:none !important; }} }}
</style>

<div class="hoja">

  <header class="cabecera">
    <span class="sello">BRIMEC · Calderería · Industria Argentina</span>
    <h1>Asistente conversacional integrado al ERP</h1>
    <p style="font-size:16.5px; color:var(--tenue); margin-top:10px;">
      Arquitectura, stack y límites del prototipo. Oportunidad 3 de T-09:
      <i>Asistente Conversacional para Operaciones de Producción y Taller</i>, diseñada en T-10.
    </p>
    <div class="enlaces">
      <a href="https://MateoSantolin.github.io/brimec-asistente/" target="_blank" rel="noopener">
        {svg_inline('googlechrome')} Ver la demo</a>
      <a href="https://github.com/MateoSantolin/brimec-asistente" target="_blank" rel="noopener">
        {svg_inline('github')} Código fuente</a>
      <a href="https://github.com/MateoSantolin/brimec-asistente/blob/main/docs/ARQUITECTURA.md" target="_blank" rel="noopener">
        {svg_inline('markdown')} Diagramas en el repo</a>
    </div>
    <ul class="leyenda">
      <li class="v">Funciona en el prototipo</li>
      <li class="a">Simulado</li>
      <li class="g">No implementado</li>
    </ul>
  </header>

  <h2>1 · Arquitectura conceptual</h2>
  <p>Patrón <b>agente con herramientas</b> sobre una arquitectura <b>desacoplada</b>. El modelo
     generativo se usa solo para comprender lenguaje natural y redactar respuestas: la autorización,
     la ejecución de transacciones y el acceso a los datos quedan bajo control del middleware y del
     ERP. Esa separación es la que acota el riesgo de modificaciones indebidas.</p>
  {bloque(0)}

  <h2>2 · Flujo de una operación de escritura</h2>
  <p>Las cuatro barreras que atraviesa cualquier cambio, en orden. Ninguna es opcional.</p>
  {bloque(1)}
  <div class="nota">Confirmar, cancelar y rechazar quedan <b>los tres</b> registrados en auditoría.
     Cancelar no es «no pasó nada»: es evidencia de que el control funcionó.</div>

  <h2>3 · Matriz de permisos</h2>
  <p>Los tres recuadros rojos son las <b>operaciones de escritura</b>, y cada una pertenece a un
     único perfil. Administración crea OF pero no actualiza etapas ni comenta; el operario comenta
     pero no actualiza; solo el Jefe de Producción cambia etapas.</p>
  {bloque(2)}

  <h2>4 · Modelo de datos</h2>
  <p>11 de las 28 tablas del modelo destino: exactamente las que T-09 lista en
     <i>«Datos e información necesaria»</i>.</p>
  {bloque(3)}
  <div class="nota"><b>Dos decisiones que se leen en el diagrama.</b>
     <code>ORDEN_FABRICACION</code> no tiene <code>cliente_id</code>: el cliente se alcanza por
     <code>PEDIDO</code>. Y <code>COMENTARIO_TALLER</code> y <code>SEGUIMIENTO_ETAPA</code> cuelgan
     de <code>OF_DETALLE</code>, no de la OF — los comentarios y los cambios de etapa son
     <b>por ítem</b>, y el estado de la OF es derivado.</div>

  <h3>Lo que el modelo todavía no cubre</h3>
  <div class="tabla-envoltorio"><table>
    <tr><th>Falta</th><th>Por qué hace falta</th></tr>
    <tr><td><code>AUDITORIA.resultado</code></td>
        <td>T-09 exige registrar «Usuario, Fecha, Acción, <b>Resultado</b>». Sin esa columna no hay
            dónde anotar un rechazo por permisos ni una cancelación.</td></tr>
    <tr><td><code>AUDITORIA.canal</code> / <code>origen</code></td>
        <td>Sin ellos no se puede medir la adopción del asistente frente a las pantallas del ERP —
            que es la hipótesis a validar.</td></tr>
    <tr><td>Transiciones entre etapas</td>
        <td><code>ETAPA_PRODUCCION</code> no las modela. Haría falta una <code>ETAPA_TRANSICION</code>.</td></tr>
    <tr><td><code>CONVERSACION</code> / <code>MENSAJE</code></td>
        <td>No existen. Las consultas de solo lectura no dejan rastro en ninguna tabla.</td></tr>
  </table></div>

  <h2>5 · Qué está construido y qué no</h2>
  {bloque(4)}

  <h3>Construido · el prototipo navegable</h3>
  <ul class="herramientas">
    {''.join(tarjeta(*t) for t in CONSTRUIDO)}
  </ul>

  <h3>Herramientas de soporte</h3>
  <ul class="herramientas">
    {''.join(tarjeta(*t) for t in SOPORTE)}
  </ul>

  <h3>Propuesto para producción · nada de esto está conectado</h3>
  <ul class="herramientas">
    {''.join(tarjeta(*t) for t in PROPUESTO)}
  </ul>

  <div class="nota alerta"><b>Los controles de permisos del prototipo corren en el navegador.</b>
     Representan el flujo; no son un control de seguridad. Un usuario con la consola abierta podría
     saltearlos. Por eso T-10 insiste en que la autorización debe vivir en el backend.</div>

  <h2>6 · El límite honesto del prototipo</h2>
  <p>T-09 descarta la automatización por reglas por rígida. El prototipo usa reglas —pero
     tolerantes— y documenta dónde se rompen.</p>
  {bloque(5)}
  <div class="nota">El caso de la derecha está cubierto por el test <code>LIM-01</code> y
     documentado como <b>CP-10</b> en T-10. El template advierte que «si el equipo no encontró
     ningún caso en el que la solución falle, probablemente no probó suficiente». Ese es el caso.</div>

  <footer>
    Demo académica — T-09 / T-10. Datos sintéticos; sin LLM ni ERP reales.<br>
    Logotipos de <a href="https://simpleicons.org" target="_blank" rel="noopener">Simple Icons</a>,
    licencia CC0 1.0 (dominio público). Las marcas pertenecen a sus titulares y se usan de forma
    nominativa para identificar las herramientas empleadas.
  </footer>
</div>
"""

io.open(SALIDA, "w", encoding="utf8", newline="\n").write(pagina)
print("generado:", os.path.basename(SALIDA), f"({len(pagina)} bytes)")
print("diagramas incrustados:", len(diagramas))
print("logos inline:", pagina.count("<svg"))
