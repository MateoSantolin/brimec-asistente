# -*- coding: utf-8 -*-
"""Reconstruye la diapositiva de arquitectura como FORMAS NATIVAS de PowerPoint.

Toma la plantilla del equipo, hereda su tema y sus iconos, y agrega una diapositiva
nueva al final. No toca las existentes: la original queda intacta para comparar.

Por que formas y no una imagen: usa Montserrat de verdad, escala sin pixelarse y se
puede editar en PowerPoint.

Lo que se ordena respecto de la version anterior:
  - una sola grilla: dos columnas, anchos y altos constantes
  - escala tipografica de 4 pasos (28 / 13 / 10 / 8 pt) en vez de 14/12/12.48/10.7
  - el camino de la operacion va en vertical; los servicios que el middleware consulta,
    al costado, con flecha de doble punta
  - numero de orden de llamada, porque la posicion sola no alcanza para contar que el
    modelo se invoca DESPUES del middleware
"""
import copy
import glob
import io as _io
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

BASE = "C:/Users/Mateo}/Desktop/Brimec/projecto_brimec/projecto_brimec/templates/ia/"
SALIDA = BASE + "brimec-asistente/docs/diapositiva-arquitectura.pptx"

# ---------------------------------------------------------------- paleta del tema
TINTA      = RGBColor(0x0B, 0x0B, 0x50)   # dk1
TINTA_2    = RGBColor(0x45, 0x45, 0x7A)   # dk2
GRIS       = RGBColor(0x6B, 0x6B, 0x80)
GRIS_CLARO = RGBColor(0x9A, 0x9A, 0xAE)
LIMA       = RGBColor(0x84, 0xD6, 0x2B)   # accent1
VERDE      = RGBColor(0x3F, 0x7D, 0x0A)   # accent2
LAVANDA    = RGBColor(0xA9, 0xA9, 0xD6)   # accent3
BLANCO     = RGBColor(0xFF, 0xFF, 0xFF)

ESTADOS = {
    "ok":   (RGBColor(0xEA, 0xF4, 0xDC), VERDE,      "FUNCIONA HOY"),
    "sim":  (RGBColor(0xE8, 0xE8, 0xF4), TINTA_2,    "SIMULADO"),
    "prop": (RGBColor(0xF3, 0xF3, 0xF8), GRIS_CLARO, "NO IMPLEMENTADO"),
}

FUENTE = "Montserrat"

# ---------------------------------------------------------------- grilla (pulgadas)
MARGEN   = 0.89
COL_A_X, COL_A_W = MARGEN, 6.20
COL_B_X, COL_B_W = 7.69, 4.75
ALTO, ALTO_HUB, ALTO_LAT = 0.72, 1.14, 0.90
SEP = 0.19
Y0 = 1.86

CHIPS = ["Identidad", "Permisos por rol", "Reglas", "Confirmación", "Auditoría"]

# (icono, numero, titulo, bajada, estado, destacado)
COLUMNA = [
    ("usuarios",   1, "Usuarios", "Administración, operarios y jefe de Producción.", "ok", False),
    ("widget",     2, "Widget del ERP", "Captura la consulta por texto o voz y muestra la respuesta.", "ok", False),
    ("middleware", 4, "Middleware · API agente (FastAPI)",
     "RECIBE Y DECIDE. Es el único que le habla al modelo y el único que escribe en el ERP.", "sim", True),
    ("conector",   6, "Conector ERP", "Traduce la herramienta en una llamada a la API REST.", "prop", False),
    ("erp",        7, "ERP SaaS · Odoo", "EJECUTA y persiste. Dueño de los datos y de sus reglas.", "prop", False),
]

# (icono, numero, titulo, bajada, estado, indice de la tarjeta con la que se alinea)
LATERALES = [
    ("stt",    3, "Speech-to-Text", "Transcribe lo que se dicta. Si hay ruido, queda la alternativa escrita.", "sim", 1),
    ("modelo", 5, "Modelo de IA",
     "El middleware lo consulta dos veces: para entender qué se pidió y para redactar la respuesta. "
     "No accede a la base ni ejecuta SQL.", "sim", 2),
]

# ---------------------------------------------------------------- plantilla
plantilla = glob.glob(BASE + "*.pptx")[0]
pr = Presentation(plantilla)
origen = pr.slides[0]

# Los iconos ya estan en la plantilla: se reutilizan por su posicion en la diapositiva 1.
POR_POSICION = {
    "usuarios": (0.58, 2.49), "widget": (4.71, 2.38), "stt": (8.75, 2.58),
    "middleware": (4.37, 3.78), "modelo": (8.68, 4.14), "conector": (1.01, 6.04),
    "erp": (4.79, 6.10), "erp_bd": (8.96, 6.04),
}
iconos = {}
for sh in origen.shapes:
    if sh.shape_type == 13 and sh.width < Inches(0.5):
        pos = (round(sh.left / 914400, 2), round(sh.top / 914400, 2))
        for nombre, p in POR_POSICION.items():
            if abs(pos[0] - p[0]) < 0.02 and abs(pos[1] - p[1]) < 0.02:
                iconos[nombre] = sh.image.blob
print("iconos recuperados:", ", ".join(sorted(iconos)))

slide = pr.slides.add_slide(origen.slide_layout)
for ph in list(slide.placeholders):
    ph._element.getparent().remove(ph._element)


# ---------------------------------------------------------------- utilidades
def texto(x, y, w, h, contenido, tam, color, negrita=False, alineacion=PP_ALIGN.LEFT,
          espaciado=0, mayusculas=False, ajustar=True):
    caja = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = caja.text_frame
    tf.word_wrap = ajustar
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.alignment = alineacion
    r = p.add_run()
    r.text = contenido.upper() if mayusculas else contenido
    r.font.size = Pt(tam)
    r.font.bold = negrita
    r.font.name = FUENTE
    r.font.color.rgb = color
    if espaciado:
        r.font._rPr.set('spc', str(int(espaciado * 100)))
    return caja


def tarjeta(x, y, w, h, icono, numero, titulo, bajada, estado, destacado=False):
    relleno, borde, etiqueta = ESTADOS[estado]
    caja = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y),
                                  Inches(w), Inches(h))
    caja.adjustments[0] = 0.09
    caja.fill.solid()
    caja.fill.fore_color.rgb = BLANCO if destacado else relleno
    caja.line.color.rgb = LIMA if destacado else borde
    caja.line.width = Pt(2.5 if destacado else 1)
    caja.shadow.inherit = False
    caja.text_frame.text = ""

    # numero de orden de llamada
    d = 0.26
    bolita = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.16), Inches(y + 0.10),
                                    Inches(d), Inches(d))
    bolita.fill.solid()
    bolita.fill.fore_color.rgb = LIMA if destacado else borde
    bolita.line.fill.background()
    bolita.shadow.inherit = False
    tf = bolita.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = str(numero)
    r.font.size = Pt(9)
    r.font.bold = True
    r.font.name = FUENTE
    r.font.color.rgb = TINTA if destacado else BLANCO

    tx = x + 0.52
    if icono in iconos:
        slide.shapes.add_picture(_io.BytesIO(iconos[icono]), Inches(tx), Inches(y + 0.13),
                                 Inches(0.20), Inches(0.20))
        tx += 0.30

    texto(tx, y + 0.11, w - (tx - x) - 1.75, 0.24, titulo, 13, TINTA, negrita=True)
    texto(x + 0.52, y + 0.38, w - 0.72, h - 0.46, bajada, 10, TINTA_2)
    texto(x + w - 1.68, y + 0.13, 1.52, 0.18, etiqueta, 7.5, borde, negrita=True,
          alineacion=PP_ALIGN.RIGHT, espaciado=0.6, ajustar=False)
    return caja


def flecha_abajo(cx, y, alto):
    f = slide.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(cx - 0.07), Inches(y + 0.02),
                               Inches(0.14), Inches(alto - 0.04))
    f.fill.solid()
    f.fill.fore_color.rgb = GRIS_CLARO
    f.line.fill.background()
    f.shadow.inherit = False


def flecha_doble(x, cy, ancho):
    f = slide.shapes.add_shape(MSO_SHAPE.LEFT_RIGHT_ARROW, Inches(x), Inches(cy - 0.075),
                               Inches(ancho), Inches(0.15))
    f.fill.solid()
    f.fill.fore_color.rgb = LIMA
    f.line.fill.background()
    f.shadow.inherit = False


# ---------------------------------------------------------------- encabezado
texto(MARGEN, 0.67, 11.9, 0.26, "Selección de la solución con IA Generativa", 12, GRIS,
      negrita=True, espaciado=1.2, mayusculas=True)
texto(MARGEN, 0.94, 11.9, 0.46, "Arquitectura del asistente de taller", 28, TINTA, negrita=True)
texto(MARGEN, 1.45, 11.9, 0.26, "El modelo entiende  ·  El middleware decide  ·  El ERP ejecuta",
      11.5, VERDE, negrita=True)

# ---------------------------------------------------------------- columna principal
y = Y0
centros, cajas = [], []
for icono, n, titulo, bajada, estado, destacado in COLUMNA:
    h = ALTO_HUB if destacado else ALTO
    c = tarjeta(COL_A_X, y, COL_A_W, h, icono, n, titulo, bajada, estado, destacado)

    if destacado:  # chips de control
        cx = COL_A_X + 0.52
        for etiqueta in CHIPS:
            aw = 0.26 + len(etiqueta) * 0.063
            chip = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx),
                                          Inches(y + h - 0.38), Inches(aw), Inches(0.24))
            chip.adjustments[0] = 0.5
            chip.fill.solid()
            chip.fill.fore_color.rgb = BLANCO
            chip.line.color.rgb = LAVANDA
            chip.line.width = Pt(0.75)
            chip.shadow.inherit = False
            tf = chip.text_frame
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            r = p.add_run()
            r.text = etiqueta
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.name = FUENTE
            r.font.color.rgb = TINTA
            cx += aw + 0.07

    centros.append(y + h / 2)
    cajas.append((y, h))
    y += h + SEP

for i in range(len(COLUMNA) - 1):
    yi, hi = cajas[i]
    flecha_abajo(COL_A_X + COL_A_W / 2, yi + hi, SEP)

# ---------------------------------------------------------------- servicios laterales
for icono, n, titulo, bajada, estado, idx in LATERALES:
    h = ALTO_LAT if idx == 2 else ALTO
    yc = cajas[idx][0] + (cajas[idx][1] - h) / 2
    tarjeta(COL_B_X, yc, COL_B_W, h, icono, n, titulo, bajada, estado)
    flecha_doble(COL_A_X + COL_A_W + 0.04, centros[idx], COL_B_X - (COL_A_X + COL_A_W) - 0.08)

# ---------------------------------------------------------------- pie
texto(MARGEN, 6.82, 5.72, 0.26, "BRIMEC · Presentación Final", 11, GRIS_CLARO)
texto(8.15, 6.82, 4.29, 0.26, "Cognitech · Equipo 5", 11, GRIS_CLARO, alineacion=PP_ALIGN.RIGHT)

# ---------------------------------------------------------------- guardar
pr.save(SALIDA)
print(f"\ndiapositiva agregada al final · {len(pr.slides.__iter__.__self__._sldIdLst)} diapositivas")
print("archivo:", SALIDA.split('/')[-1])
print(f"alto usado: {y - SEP:.2f}in (el pie arranca en 6.82in)")
assert y - SEP <= 6.75, "el diagrama invade el pie"
