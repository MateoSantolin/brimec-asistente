# -*- coding: utf-8 -*-
"""Genera el diagrama de arquitectura para la diapositiva, en SVG 16:9 (1600x900).

A diferencia del Mermaid de docs/, este esta pensado para proyectarse: tipografia
grande, una oracion por componente y el estado de cada pieza a la vista.
"""
import io
from xml.sax.saxutils import escape

SALIDA = ("C:/Users/Mateo}/Desktop/Brimec/projecto_brimec/projecto_brimec/templates/ia/"
          "brimec-asistente/docs/diagrama-arquitectura-diapositiva.svg")

W, H = 1600, 900
X, ANCHO = 150, 1230          # caja
X_FLECHA = X + ANCHO + 58     # carril de ida / vuelta

NAVY = "#243673"
AZUL = "#0084D6"
TINTA = "#1D2433"
TENUE = "#5A6478"

ESTADOS = {
    "ok":   ("#D1FAE5", "#059669", "funciona hoy"),
    "sim":  ("#FEF3C7", "#B45309", "simulado"),
    "prop": ("#E8EDF5", "#64748B", "no implementado"),
}

# (n, nombre, oracion, estado, alto, chips)
PASOS = [
    (1, "USUARIOS", "Administración, operarios y jefe de producción. Piden lo que necesitan "
        "en su propio idioma, hablando o escribiendo.", "ok", 96, None),
    (2, "WIDGET CONVERSACIONAL", "Vive dentro del ERP. Captura la consulta, muestra la "
        "confirmación y devuelve la respuesta.", "ok", 96, None),
    (3, "SPEECH-TO-TEXT", "Convierte el audio en texto. Si el ruido de planta lo impide, "
        "queda la alternativa escrita.", "sim", 96, None),
    (4, "MODELO DE IA GENERATIVA", "Entiende qué se pidió y elige la herramienta. "
        "No accede a la base ni ejecuta SQL.", "sim", 96, None),
    (5, "MIDDLEWARE · FastAPI", "DECIDE. Es la única vía de escritura: nada se guarda sin pasar "
        "por acá.", "sim", 180,
        ["Identidad", "Permisos por rol", "Reglas de negocio", "Confirmación", "Auditoría"]),
    (6, "CONECTOR REST", "Traduce la herramienta elegida en una llamada a la API del ERP.",
        "prop", 96, None),
    (7, "ERP SaaS · Odoo", "EJECUTA y persiste. Dueño de los datos, de sus reglas y del catálogo "
        "de etapas.", "prop", 96, None),
]

TIPO = "Segoe UI, Inter, Helvetica Neue, Arial, sans-serif"

p = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
    f'font-family="{TIPO}">',
    f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
    '<defs>',
    f'  <marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
    f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{AZUL}"/></marker>',
    f'  <marker id="flg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
    f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94A3B8"/></marker>',
    '  <filter id="sombra" x="-20%" y="-20%" width="140%" height="160%">',
    '    <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#243673" flood-opacity="0.13"/>',
    '  </filter>',
    '</defs>',
]

y = 24
GAP = 16
centros = []

for n, nombre, oracion, estado, alto, chips in PASOS:
    relleno, borde, etiqueta = ESTADOS[estado]
    destacado = n == 5
    centros.append(y + alto / 2)

    p.append(
        f'<rect x="{X}" y="{y}" width="{ANCHO}" height="{alto}" rx="16" fill="{relleno}" '
        f'stroke="{AZUL if destacado else borde}" stroke-width="{4 if destacado else 2}" '
        f'filter="url(#sombra)"/>'
    )

    # numero de paso
    cy = y + 46
    p.append(f'<circle cx="{X + 46}" cy="{cy}" r="23" fill="{NAVY if destacado else borde}"/>')
    p.append(
        f'<text x="{X + 46}" y="{cy + 9}" text-anchor="middle" font-size="25" font-weight="700" '
        f'fill="#FFFFFF">{n}</text>'
    )

    tx = X + 88
    p.append(
        f'<text x="{tx}" y="{y + 40}" font-size="{30 if destacado else 27}" font-weight="700" '
        f'fill="{NAVY}" letter-spacing="0.4">{escape(nombre)}</text>'
    )
    p.append(
        f'<text x="{tx}" y="{y + 74}" font-size="21" fill="{TINTA}">{escape(oracion)}</text>'
    )

    # chips de control del middleware
    if chips:
        cx = tx
        for c in chips:
            ancho = 20 + len(c) * 11.2
            p.append(
                f'<rect x="{cx:.0f}" y="{y + 104}" width="{ancho:.0f}" height="44" rx="22" '
                f'fill="#FFFFFF" stroke="{AZUL}" stroke-width="1.6"/>'
            )
            p.append(
                f'<text x="{cx + ancho / 2:.0f}" y="{y + 133}" text-anchor="middle" font-size="19" '
                f'font-weight="600" fill="{NAVY}">{escape(c)}</text>'
            )
            cx += ancho + 12

    # estado, alineado a la derecha
    ex = X + ANCHO - 20
    p.append(
        f'<text x="{ex}" y="{y + 32}" text-anchor="end" font-size="17" font-weight="700" '
        f'fill="{borde}" letter-spacing="1.1">{escape(etiqueta.upper())}</text>'
    )

    # flecha hacia el siguiente
    if n < len(PASOS):
        p.append(
            f'<path d="M{X + ANCHO / 2},{y + alto + 2} L{X + ANCHO / 2},{y + alto + GAP - 2}" '
            f'stroke="#94A3B8" stroke-width="3" marker-end="url(#fl)"/>'
        )

    y += alto + GAP

# carril ida / vuelta
arriba, abajo = centros[0], centros[-1]
p.append(
    f'<path d="M{X_FLECHA},{arriba} L{X_FLECHA},{abajo}" stroke="{AZUL}" stroke-width="4" '
    f'marker-end="url(#fl)"/>'
)
p.append(
    f'<path d="M{X_FLECHA + 46},{abajo} L{X_FLECHA + 46},{arriba}" stroke="#94A3B8" '
    f'stroke-width="4" stroke-dasharray="9 7" marker-end="url(#flg)"/>'
)
p.append(
    f'<text x="{X_FLECHA - 12}" y="{(arriba + abajo) / 2}" text-anchor="middle" font-size="20" '
    f'font-weight="700" fill="{AZUL}" letter-spacing="2.5" '
    f'transform="rotate(-90 {X_FLECHA - 12} {(arriba + abajo) / 2})">IDA</text>'
)
p.append(
    f'<text x="{X_FLECHA + 70}" y="{(arriba + abajo) / 2}" text-anchor="middle" font-size="20" '
    f'font-weight="700" fill="#64748B" letter-spacing="2.5" '
    f'transform="rotate(90 {X_FLECHA + 70} {(arriba + abajo) / 2})">VUELTA</text>'
)

# El lema, atado a su componente: cada verbo al lado de la pieza que lo cumple.
# Se centra en el alto de su caja, para que no se pisen entre si.
for idx, verbo in ((3, "ENTIENDE"), (4, "DECIDE"), (6, "EJECUTA")):
    cy = centros[idx]
    p.append(
        f'<text x="76" y="{cy}" text-anchor="middle" font-size="27" font-weight="700" '
        f'fill="{AZUL}" letter-spacing="2" transform="rotate(-90 76 {cy})">{verbo}</text>'
    )
    p.append(
        f'<path d="M106,{cy - 42} L106,{cy + 42}" stroke="{AZUL}" stroke-width="3" '
        f'stroke-linecap="round" opacity="0.35"/>'
    )

p.append('</svg>')

svg = '\n'.join(p)
io.open(SALIDA, 'w', encoding='utf8', newline='\n').write(svg)
print(f"SVG generado: {len(svg)} bytes · {W}x{H} (16:9)")
