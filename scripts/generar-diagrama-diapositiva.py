# -*- coding: utf-8 -*-
"""Genera el diagrama de arquitectura para la diapositiva, en SVG 16:9 (1600x900).

TOPOLOGIA: el middleware es un HUB, no un eslabon de una cadena lineal.
El widget le habla al middleware; el middleware consulta al modelo y llama al ERP.
Un diagrama lineal con el modelo "delante" del middleware sugiere que el modelo recibe
al usuario y decide que pasarle al backend, que es lo contrario de lo que se propone.

Los numeros indican el ORDEN DE LLAMADA; la posicion indica la TOPOLOGIA.

El texto se ajusta solo al ancho de cada caja y la altura se calcula a partir de las
lineas resultantes: asi no hay forma de que un texto largo se desborde.
"""
import io
from xml.sax.saxutils import escape

SALIDA = ("C:/Users/Mateo}/Desktop/Brimec/projecto_brimec/projecto_brimec/templates/ia/"
          "brimec-asistente/docs/diagrama-arquitectura-diapositiva.svg")

W, H = 1600, 900
XS, WS = 90, 740          # columna principal: el camino de la operacion
XL, WL = 930, 614         # columna lateral: servicios que el hub consulta
SANGRIA, PAD = 84, 24     # sangria del texto dentro de la caja / margen derecho
RAIL = 46

NAVY, AZUL, TINTA, TENUE = "#243673", "#0084D6", "#1D2433", "#5A6478"
FS, FSL, ALTO_LINEA = 20, 19, 27

ESTADOS = {
    "ok":   ("#D1FAE5", "#059669", "funciona hoy"),
    "sim":  ("#FEF3C7", "#B45309", "simulado"),
    "prop": ("#E8EDF5", "#64748B", "no implementado"),
}

CHIPS = ["Identidad", "Permisos por rol", "Reglas", "Confirmación", "Auditoría"]

COLUMNA = [
    (1, "USUARIOS", "Administración, operarios y jefe de producción.", "ok", False),
    (2, "WIDGET CONVERSACIONAL", "Dentro del ERP. Captura la consulta y muestra la respuesta.",
        "ok", False),
    (4, "MIDDLEWARE · FastAPI", "RECIBE Y DECIDE. Es el único que le habla al modelo y el único "
        "que escribe en el ERP.", "sim", True),
    (6, "CONECTOR REST", "Traduce la herramienta en una llamada a la API del ERP.", "prop", False),
    (7, "ERP SaaS · Odoo", "EJECUTA y persiste. Dueño de los datos y de sus reglas.",
        "prop", False),
]

LATERALES = [
    (3, "SPEECH-TO-TEXT", "Convierte el audio en texto. Si el ruido de planta lo impide, queda la "
        "alternativa escrita.", "sim", 1),
    (5, "MODELO DE IA GENERATIVA", "El middleware lo consulta dos veces: ① para entender qué se "
        "pidió, ② para redactar la respuesta. No accede a la base ni ejecuta SQL.", "sim", 2),
]

TIPO = "Segoe UI, Inter, Helvetica Neue, Arial, sans-serif"


def envolver(texto, ancho_px, fs):
    """Ajuste de lineas con ancho estimado. Factor medido para esta familia de fuentes."""
    max_car = int(ancho_px / (fs * 0.515))
    lineas, actual = [], ""
    for palabra in texto.split():
        prueba = f"{actual} {palabra}".strip()
        if len(prueba) <= max_car:
            actual = prueba
        else:
            if actual:
                lineas.append(actual)
            actual = palabra
    if actual:
        lineas.append(actual)
    return lineas


def alto_de(lineas, con_chips=False):
    return 70 + len(lineas) * ALTO_LINEA + (54 if con_chips else 0) + 16


p = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
    f'font-family="{TIPO}">',
    f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
    '<defs>',
    f'  <marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" '
    f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{AZUL}"/></marker>',
    '  <marker id="fg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" '
    '  orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94A3B8"/></marker>',
    '  <filter id="s" x="-20%" y="-20%" width="140%" height="170%">',
    '    <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#243673" flood-opacity="0.13"/>',
    '  </filter>',
    '</defs>',
]


def dibujar(x, w, y, alto, n, nombre, lineas, estado, fs, destacado=False):
    relleno, borde, etiqueta = ESTADOS[estado]
    p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{alto}" rx="16" fill="{relleno}" '
             f'stroke="{AZUL if destacado else borde}" stroke-width="{4 if destacado else 2}" '
             f'filter="url(#s)"/>')
    cy = y + 46
    p.append(f'<circle cx="{x + 44}" cy="{cy}" r="22" fill="{NAVY if destacado else borde}"/>')
    p.append(f'<text x="{x + 44}" y="{cy + 8}" text-anchor="middle" font-size="24" '
             f'font-weight="700" fill="#FFFFFF">{n}</text>')
    p.append(f'<text x="{x + SANGRIA}" y="{y + 40}" font-size="{28 if destacado else 25}" '
             f'font-weight="700" fill="{NAVY}" letter-spacing="0.4">{escape(nombre)}</text>')
    p.append(f'<text x="{x + w - PAD}" y="{y + 30}" text-anchor="end" font-size="16" '
             f'font-weight="700" fill="{borde}" letter-spacing="1.1">'
             f'{escape(etiqueta.upper())}</text>')
    ly = y + 70
    for linea in lineas:
        p.append(f'<text x="{x + SANGRIA}" y="{ly}" font-size="{fs}" fill="{TINTA}">'
                 f'{escape(linea)}</text>')
        ly += ALTO_LINEA
    return ly


# ------------------------------------------------------------ medir y ubicar
ancho_txt = WS - SANGRIA - PAD
items = [(n, nom, envolver(txt, ancho_txt, FS), est, chips) for n, nom, txt, est, chips in COLUMNA]
altos = [alto_de(l, c) for _, _, l, _, c in items]

GAP = 24
FRANJA_PIE = 70
total = sum(altos) + GAP * (len(altos) - 1)
y0 = max(26, (H - FRANJA_PIE - total) / 2)
assert y0 + total <= H - FRANJA_PIE, f'el contenido invade el pie por {y0 + total - (H - FRANJA_PIE):.0f}px'

y, centros, cajas = y0, [], []
for (n, nombre, lineas, estado, con_chips), alto in zip(items, altos):
    destacado = n == 4
    ly = dibujar(XS, WS, y, alto, n, nombre, lineas, estado, FS, destacado)
    if con_chips:
        disponible = WS - SANGRIA - PAD
        fs_chip, sep = 18, 11
        while True:
            anchos = [20 + len(c) * fs_chip * 0.52 for c in CHIPS]
            if sum(anchos) + sep * (len(CHIPS) - 1) <= disponible or fs_chip <= 13:
                break
            fs_chip -= 1
        cx = XS + SANGRIA
        for c, aw in zip(CHIPS, anchos):
            p.append(f'<rect x="{cx:.0f}" y="{ly - 18}" width="{aw:.0f}" height="42" rx="21" '
                     f'fill="#FFFFFF" stroke="{AZUL}" stroke-width="1.6"/>')
            p.append(f'<text x="{cx + aw / 2:.0f}" y="{ly + 9}" text-anchor="middle" '
                     f'font-size="{fs_chip}" font-weight="600" fill="{NAVY}">{escape(c)}</text>')
            cx += aw + sep
        print(f"  chips: fuente {fs_chip}px, ancho {sum(anchos) + sep * 4:.0f}/{disponible}px")
    centros.append(y + alto / 2)
    cajas.append((y, alto))
    y += alto + GAP

# flechas de la columna
for i in range(len(items) - 1):
    yi, hi = cajas[i]
    p.append(f'<path d="M{XS + WS / 2},{yi + hi + 2} L{XS + WS / 2},{yi + hi + GAP - 2}" '
             f'stroke="#94A3B8" stroke-width="3" marker-end="url(#fa)"/>')

# ------------------------------------------------------------ servicios laterales
for n, nombre, texto, estado, idx in LATERALES:
    lineas = envolver(texto, WL - SANGRIA - PAD, FSL)
    alto = alto_de(lineas)
    yc = cajas[idx][0] + (cajas[idx][1] - alto) / 2
    dibujar(XL, WL, yc, alto, n, nombre, lineas, estado, FSL)
    ejey = centros[idx]
    p.append(f'<path d="M{XS + WS + 8},{ejey} L{XL - 8},{ejey}" stroke="{AZUL}" '
             f'stroke-width="3" marker-start="url(#fa)" marker-end="url(#fa)"/>')

# ------------------------------------------------------------ carril ida / vuelta
arr, aba = centros[0], centros[-1]
p.append(f'<path d="M{RAIL},{arr} L{RAIL},{aba}" stroke="{AZUL}" stroke-width="4" '
         f'marker-end="url(#fa)"/>')
p.append(f'<path d="M{RAIL - 26},{aba} L{RAIL - 26},{arr}" stroke="#94A3B8" stroke-width="4" '
         f'stroke-dasharray="9 7" marker-end="url(#fg)"/>')
p.append(f'<text x="{RAIL + 18}" y="{(arr + aba) / 2}" text-anchor="middle" font-size="19" '
         f'font-weight="700" fill="{AZUL}" letter-spacing="2.5" '
         f'transform="rotate(-90 {RAIL + 18} {(arr + aba) / 2})">IDA</text>')
p.append(f'<text x="{RAIL - 44}" y="{(arr + aba) / 2}" text-anchor="middle" font-size="19" '
         f'font-weight="700" fill="#64748B" letter-spacing="2.5" '
         f'transform="rotate(90 {RAIL - 44} {(arr + aba) / 2})">VUELTA</text>')

# ------------------------------------------------------------ pie
p.append(f'<text x="{XS}" y="{H - 24}" font-size="19" fill="{TENUE}">'
         f'Los números indican el orden de llamada; la posición, la topología: '
         f'<tspan font-weight="700" fill="{NAVY}">el middleware es el centro, no un eslabón.'
         f'</tspan></text>')

p.append('</svg>')
svg = '\n'.join(p)
io.open(SALIDA, 'w', encoding='utf8', newline='\n').write(svg)
print(f"SVG generado · {W}x{H} · alto usado: {y - GAP - y0 + y0:.0f}px")
for (n, nom, lineas, _, _) in items:
    print(f"  {n} {nom:26} {len(lineas)} línea(s)")
