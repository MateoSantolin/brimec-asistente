# -*- coding: utf-8 -*-
"""Genera los datos transaccionales sinteticos del MVP BRIMEC, respetando el modelo de
datos destino (PEDIDO, PEDIDO_DETALLE, ORDEN_FABRICACION, OF_DETALLE, SEGUIMIENTO_ETAPA,
COMENTARIO_TALLER, AUDITORIA).

Todas las fechas se guardan como OFFSET EN DIAS respecto de "ahora" (0 = ahora,
negativo = pasado) para que la demo nunca quede desactualizada. Se resuelven en seed.ts.
"""
import json, random, io

random.seed(20261112)

OUT = "C:/Users/Mateo}/Desktop/Brimec/projecto_brimec/projecto_brimec/templates/ia/brimec-asistente/src/data/"

clientes = json.load(open(OUT + "clientes.json", encoding="utf8"))["clientes"]
articulos = json.load(open(OUT + "articulos.json", encoding="utf8"))["articulos"]
etapas = json.load(open(OUT + "catalogoEtapas.json", encoding="utf8"))["etapas"]

ART_BY_ID = {a["articulo_id"]: a for a in articulos}
ETAPA_NOMBRE = {e["etapa_id"]: e["nombre"] for e in etapas}
N_ETAPAS = len(etapas)

# articulos preferidos por sector del cliente, para que los pedidos sean verosimiles
PREF_TIPO = {
    1:  ["Brida", "Accesorio", "Piping"],        # Petrosur - Oil & Gas
    2:  ["Equipo minero", "Mecanizado", "Estructura"],
    3:  ["Piping", "Accesorio", "Brida"],
    4:  ["Siderurgia", "Mecanizado", "Estructura"],
    5:  ["Nuclear", "Brida"],
    6:  ["Piping", "Accesorio"],
    7:  ["Brida", "Piping", "Estructura"],
    8:  ["Mecanizado", "Estructura", "Accesorio"],
    9:  ["Mecanizado", "Estructura", "Brida"],
    10: ["Brida", "Accesorio", "Piping"],
}

def arts_para(cid, n):
    tipos = PREF_TIPO[cid]
    pool = [a["articulo_id"] for a in articulos if a["tipo"] in tipos]
    return random.sample(pool, min(n, len(pool)))

ESPECIFICACIONES = [
    "Certificado de colada EN 10204 3.1 obligatorio.",
    "Ensayo de liquidos penetrantes segun pliego del cliente.",
    "Acabado superficial Ra 3.2 um.",
    "Tolerancia dimensional segun plano rev. B.",
    "Identificacion por bajo relieve con numero de colada.",
    "Radiografiado 100% de costuras.",
    "Pintura epoxi segun esquema del cliente.",
    "",
    "",
]

# ------------------------------------------------------------------ pedidos y OF
# 20 pedidos; los 10 primeros llevan 2 OF, el resto 1 => 30 OF
CLIENTE_DE_PEDIDO = [1, 2, 1, 3, 4, 5, 2, 6, 7, 1, 8, 4, 9, 2, 10, 3, 7, 5, 10, 6]
assert len(CLIENTE_DE_PEDIDO) == 20

pedido_de_of = []
for i in range(10):
    pedido_de_of += [1001 + i, 1001 + i]
for i in range(10, 20):
    pedido_de_of.append(1001 + i)
assert len(pedido_de_of) == 30

# distribucion de etapas de las 30 OF (etapa = minimo de sus items)
DISTRIB = ([1] * 6 + [2] * 5 + [3] * 6 + [4] * 4 + [5] * 4 + [6] * 5)
assert len(DISTRIB) == 30
random.shuffle(DISTRIB)

# fechas estimadas de fin: 5 atrasadas, 7 proximas (0-7 dias), 18 futuras
PLAN_FIN = ([-random.randint(2, 18) for _ in range(5)] +
            [random.randint(0, 7) for _ in range(7)] +
            [random.randint(8, 80) for _ in range(18)])
random.shuffle(PLAN_FIN)

PRIORIDADES = ["Alta", "Media", "Media", "Media", "Baja"]

ordenes, of_detalles = [], []
of_detalle_id = 301

for k in range(30):
    of_id = 201 + k
    pedido_id = pedido_de_of[k]
    cliente_id = CLIENTE_DE_PEDIDO[pedido_id - 1001]
    etapa_min = DISTRIB[k]
    fin_est = PLAN_FIN[k]
    # una OF finalizada no puede figurar como atrasada
    if etapa_min == N_ETAPAS and fin_est > 0:
        fin_est = -random.randint(1, 28)
    emision = min(fin_est - random.randint(25, 75), -4)

    n_items = random.randint(2, 4)
    arts = arts_para(cliente_id, n_items)
    items_of = []
    for j, art_id in enumerate(arts):
        # los items avanzan alrededor de la etapa minima de la OF
        etapa = etapa_min if etapa_min == N_ETAPAS else min(etapa_min + random.choice([0, 0, 0, 1]), N_ETAPAS)
        items_of.append({
            "of_detalle_id": of_detalle_id,
            "of_id": of_id,
            "pedido_detalle_id": None,          # se resuelve mas abajo
            "articulo_id": art_id,
            "numero_item": f"{j + 1:03d}",
            "cantidad": random.choice([1, 2, 4, 6, 8, 12, 20, 24]),
            "partida": f"COL-{random.randint(10000, 99999)}",
            "estado": ETAPA_NOMBRE[etapa],
            "_etapa_id": etapa,
        })
        of_detalle_id += 1

    etapa_min_real = min(i["_etapa_id"] for i in items_of)
    ordenes.append({
        "of_id": of_id,
        "pedido_id": pedido_id,
        "numero": f"OF-{of_id}",
        "off_fecha_emision": emision,
        "off_fecha_estimada_fin": fin_est,
        "off_fecha_real_fin": None,
        "prioridad": random.choice(PRIORIDADES),
        "estado": ETAPA_NOMBRE[etapa_min_real],
        "_etapa_id": etapa_min_real,
        "_cliente_id": cliente_id,
    })
    of_detalles += items_of

# ------------------------------------------------------------------
# T-10 usa "el item 333" en CP-02, CP-03 y CP-06, y a Petrosur en CP-01.
# Se fuerza que of_detalle_id = 333 pertenezca a una OF de Petrosur y este en Mecanizado,
# para que los casos de prueba documentados se puedan reproducir literalmente.
it333 = next(i for i in of_detalles if i["of_detalle_id"] == 333)
of333 = next(o for o in ordenes if o["of_id"] == it333["of_id"])
ped333 = of333["pedido_id"]
CLIENTE_DE_PEDIDO[ped333 - 1001] = 1
for o in ordenes:
    if o["pedido_id"] == ped333:
        o["_cliente_id"] = 1
it333["estado"] = "Mecanizado"
it333["_etapa_id"] = 3
if of333["off_fecha_estimada_fin"] < 0:
    of333["off_fecha_estimada_fin"] = 11

# recalcular etapa de cada OF como minimo de sus items
for o in ordenes:
    sus = [i for i in of_detalles if i["of_id"] == o["of_id"]]
    m = min(i["_etapa_id"] for i in sus)
    o["_etapa_id"] = m
    o["estado"] = ETAPA_NOMBRE[m]
    o["off_fecha_real_fin"] = (o["off_fecha_estimada_fin"] + random.choice([-3, -1, 0, 1, 4])
                               if m == N_ETAPAS else None)

# ------------------------------------------------------------------ pedidos
pedidos, pedido_detalles = [], []
pedido_detalle_id = 5001

for p_idx in range(20):
    pedido_id = 1001 + p_idx
    cliente_id = CLIENTE_DE_PEDIDO[p_idx]
    sus_of = [o for o in ordenes if o["pedido_id"] == pedido_id]
    sus_items = [i for i in of_detalles if i["of_id"] in {o["of_id"] for o in sus_of}]

    confirmacion = min(o["off_fecha_emision"] for o in sus_of) - random.randint(4, 18)
    entrega_pactada = max(o["off_fecha_estimada_fin"] for o in sus_of) + random.randint(3, 14)

    # PEDIDO_DETALLE: una linea por articulo distinto fabricado en las OF del pedido
    por_articulo = {}
    for it in sus_items:
        por_articulo.setdefault(it["articulo_id"], []).append(it)
    for art_id, its in sorted(por_articulo.items()):
        art = ART_BY_ID[art_id]
        pd = {
            "pedido_detalle_id": pedido_detalle_id,
            "pedido_id": pedido_id,
            "articulo_id": art_id,
            "cantidad": sum(i["cantidad"] for i in its),
            "especificacion_tecnica": random.choice(ESPECIFICACIONES),
            "unidad_medida": art["unidad_medida"],
            "precio_unitario": random.randrange(48_000, 2_400_000, 1_000),
        }
        pedido_detalles.append(pd)
        for i in its:
            i["pedido_detalle_id"] = pedido_detalle_id
        pedido_detalle_id += 1

    etapas_of = [o["_etapa_id"] for o in sus_of]
    if all(e == N_ETAPAS for e in etapas_of):
        estado = "Entregado" if entrega_pactada < -7 else "Cerrado"
    elif any(e > 1 for e in etapas_of):
        estado = "En produccion"
    else:
        estado = "Abierto"

    pedidos.append({
        "pedido_id": pedido_id,
        "cliente_id": cliente_id,
        "cotizacion_id": None,
        "numero_orden_cliente": f"OC-{random.randint(20000, 99999)}",
        "off_fecha_confirmacion": confirmacion,
        "off_fecha_entrega_pactada": entrega_pactada,
        "estado": estado,
    })

# ------------------------------------------------------------------ seguimiento de etapas
# Empleado que tipicamente registra cada etapa
EMP_ETAPA = {1: 3, 2: 4, 3: 2, 4: 5, 5: 6, 6: 3}
OBS_ETAPA = {
    1: ["OF liberada a planta.", "Documentacion entregada al sector.", ""],
    2: ["Material cortado segun plano.", "Despunte dentro de tolerancia.", ""],
    3: ["Mecanizado en torno CNC 3.", "Primera pieza verificada.", "Cambio de herramienta por desgaste.", ""],
    4: ["Tratamiento termico completo.", "Granallado terminado.", ""],
    5: ["Inspeccion dimensional conforme.", "Ensayo PT sin indicaciones.", "Pendiente de firma del responsable.", ""],
    6: ["Pieza liberada para despacho.", "Certificado emitido.", ""],
}

seguimientos = []
seguimiento_id = 1
for it in of_detalles:
    of = next(o for o in ordenes if o["of_id"] == it["of_id"])
    actual = it["_etapa_id"]
    inicio_of = of["off_fecha_emision"]
    # reparte las etapas recorridas entre la emision de la OF y ahora
    span = max(abs(inicio_of) - 1, len(range(1, actual + 1)) * 1.5)
    paso = span / (actual + 0.6)
    for e in range(1, actual + 1):
        ini = round(inicio_of + paso * (e - 1) + random.uniform(0, paso * 0.3), 2)
        ultima = (e == actual)
        termino = (not ultima) or (actual == N_ETAPAS)
        fin = round(inicio_of + paso * e - random.uniform(0, paso * 0.2), 2) if termino else None
        if fin is not None and fin > -0.05:
            fin = -0.05
        seguimientos.append({
            "seguimiento_id": seguimiento_id,
            "of_detalle_id": it["of_detalle_id"],
            "etapa_id": e,
            "empleado_id": EMP_ETAPA[e],
            "off_inicio": ini,
            "off_fin": fin,
            "estado": "Finalizada" if termino else "En curso",
            "observaciones": random.choice(OBS_ETAPA[e]),
        })
        seguimiento_id += 1

# ------------------------------------------------------------------ comentarios de taller
TEXTOS = [
    ("Incidencia",  "Falta material para continuar, se frena hasta recibir la colada."),
    ("Observacion", "La rosca no entra con el calibre pasa-no pasa, revisar plano."),
    ("Avance",      "Terminado el desbaste, queda el acabado para manana."),
    ("Observacion", "Se detecto porosidad en la cara de sello, se rectifica."),
    ("Incidencia",  "Torno CNC 3 fuera de servicio, se reasigna a CNC 1."),
    ("Avance",      "Dos piezas listas, faltan cuatro del lote."),
    ("Observacion", "Cliente pidio marcar el numero de colada en bajo relieve."),
    ("Incidencia",  "Diferencia de espesor respecto del plano rev. B, consultar ingenieria."),
    ("Avance",      "Tratamiento termico completo, enfriando en horno."),
    ("Observacion", "Se cambio la herramienta de corte por desgaste prematuro."),
    ("Avance",      "Inspeccion dimensional conforme, pasa a certificacion."),
    ("Incidencia",  "Falta el certificado del proveedor para liberar el material."),
    ("Observacion", "Pieza identificada y embalada, lista para remito."),
    ("Avance",      "Arranque de corte demorado por espera de puente grua."),
    ("Observacion", "Se recomienda revisar la fijacion, hubo vibracion en el mecanizado."),
    ("Incidencia",  "Medida fuera de tolerancia en el diametro interior, se reprocesa."),
    ("Avance",      "Granallado terminado, se envia a pintura."),
    ("Observacion", "Cliente confirmo entrega parcial de la primera mitad del lote."),
]

comentarios = []
candidatos = [i for i in of_detalles if i["_etapa_id"] >= 2]
random.shuffle(candidatos)
for n, (tipo, texto) in enumerate(TEXTOS):
    it = candidatos[n % len(candidatos)]
    por_voz = random.random() < 0.45
    emp = random.choice([2, 4, 5, 6, 3])
    comentarios.append({
        "comentario_id": n + 1,
        "of_detalle_id": it["of_detalle_id"],
        "empleado_id": emp,
        "off_fecha_hora": round(-random.uniform(0.3, 26), 2),
        "tipo": tipo,
        "texto": texto,
        "archivo_audio": f"dictado-{n + 1:03d}.webm" if por_voz else None,
    })
comentarios.sort(key=lambda c: c["off_fecha_hora"])
for n, c in enumerate(comentarios):
    c["comentario_id"] = n + 1

# ------------------------------------------------------------------ auditoria inicial
auditorias = []
aud_id = 1

def aud(emp, off, entidad, reg, op, det, res="OK", canal="texto", origen="Pantalla ERP"):
    global aud_id
    auditorias.append({
        "auditoria_id": aud_id, "empleado_id": emp, "off_fecha_hora": off,
        "entidad": entidad, "registro_id": reg, "operacion": op, "detalle": det,
        "resultado": res, "canal": canal, "origen": origen,
    })
    aud_id += 1

# altas de OF hechas por Administracion
for o in sorted(ordenes, key=lambda x: x["off_fecha_emision"])[:8]:
    aud(random.choice([1, 7]), round(o["off_fecha_emision"] + random.uniform(0, .4), 2),
        "ORDEN_FABRICACION", o["of_id"], "CREAR",
        f"Alta de {o['numero']} sobre el pedido #{o['pedido_id']}.")

# cambios de etapa recientes hechos por el Jefe de Produccion
recientes = sorted([s for s in seguimientos if s["off_inicio"] > -12], key=lambda s: s["off_inicio"])[-9:]
for s in recientes:
    it = next(i for i in of_detalles if i["of_detalle_id"] == s["of_detalle_id"])
    of = next(o for o in ordenes if o["of_id"] == it["of_id"])
    por_voz = random.random() < 0.5
    aud(3, round(s["off_inicio"], 2), "OF_DETALLE", it["of_detalle_id"], "ACTUALIZAR_ESTADO",
        f"Item {it['of_detalle_id']} de {of['numero']} a etapa {ETAPA_NOMBRE[s['etapa_id']]}.",
        "OK", "voz" if por_voz else "texto", "Asistente")

# comentarios recientes
for c in comentarios[-6:]:
    it = next(i for i in of_detalles if i["of_detalle_id"] == c["of_detalle_id"])
    of = next(o for o in ordenes if o["of_id"] == it["of_id"])
    aud(c["empleado_id"], c["off_fecha_hora"], "COMENTARIO_TALLER", c["comentario_id"],
        "CREAR_COMENTARIO", f"Comentario sobre el item {it['of_detalle_id']} de {of['numero']}.",
        "OK", "voz" if c["archivo_audio"] else "texto", "Asistente")

# intentos rechazados por permisos: evidencian que el control existe (CP-08)
aud(2, -3.4, "OF_DETALLE", 333, "ACTUALIZAR_ESTADO",
    "Operario intento actualizar la etapa del item 333. El perfil OPERARIO no tiene la capacidad 'actualizar_estado'.",
    "RECHAZADA", "voz", "Asistente")
aud(1, -2.1, "COMENTARIO_TALLER", 0, "CREAR_COMENTARIO",
    "Administracion intento registrar un comentario de taller. El perfil ADMINISTRACION no tiene la capacidad 'agregar_comentario'.",
    "RECHAZADA", "texto", "Asistente")
aud(3, -1.2, "OF_DETALLE", 310, "ACTUALIZAR_ESTADO",
    "El usuario cancelo la confirmacion antes de ejecutar el cambio de etapa.",
    "CANCELADA", "voz", "Asistente")

auditorias.sort(key=lambda a: a["off_fecha_hora"])
for n, a in enumerate(auditorias):
    a["auditoria_id"] = n + 1

# ------------------------------------------------------------------ escritura
for o in ordenes:
    o.pop("_etapa_id"), o.pop("_cliente_id")
for i in of_detalles:
    i.pop("_etapa_id")

def dump(nombre, obj):
    with io.open(OUT + nombre, "w", encoding="utf8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")

NOTA_FECHAS = ("Los campos con prefijo 'off_' son OFFSETS EN DIAS respecto del momento de "
               "ejecucion (0 = ahora, negativo = pasado). Se convierten a fechas reales en "
               "src/data/seed.ts para que la demo no envejezca.")

dump("pedidos.json", {"_tabla": "PEDIDO + PEDIDO_DETALLE", "_nota": "Datos SINTETICOS. " + NOTA_FECHAS +
                      " cotizacion_id es null: COTIZACION esta fuera del alcance del MVP.",
                      "pedidos": pedidos, "pedido_detalle": pedido_detalles})
dump("ordenes.json", {"_tabla": "ORDEN_FABRICACION + OF_DETALLE", "_nota": "Datos SINTETICOS. " + NOTA_FECHAS +
                      " ORDEN_FABRICACION.estado es DERIVADO: es la etapa minima de sus OF_DETALLE.",
                      "ordenes": ordenes, "of_detalle": of_detalles})
dump("seguimiento.json", {"_tabla": "SEGUIMIENTO_ETAPA", "_nota": "Datos SINTETICOS. " + NOTA_FECHAS +
                          " La fila con fin = null y estado 'En curso' marca la etapa actual del item.",
                          "seguimiento_etapa": seguimientos})
dump("comentarios.json", {"_tabla": "COMENTARIO_TALLER", "_nota": "Datos SINTETICOS. " + NOTA_FECHAS +
                          " archivo_audio != null indica que el comentario fue dictado por voz.",
                          "comentarios": comentarios})
dump("auditoria.json", {"_tabla": "AUDITORIA", "_nota": "Datos SINTETICOS. " + NOTA_FECHAS +
                        " Los campos resultado, canal y origen son EXTENSIONES al ERD exigidas por T-09/T-10.",
                        "auditoria": auditorias})

from collections import Counter
print("clientes 10 | pedidos", len(pedidos), "| pedido_detalle", len(pedido_detalles),
      "| OF", len(ordenes), "| of_detalle", len(of_detalles),
      "| seguimiento", len(seguimientos), "| comentarios", len(comentarios), "| auditoria", len(auditorias))
print("etapas OF:", dict(Counter(o["estado"] for o in ordenes)))
print("atrasadas:", sum(1 for o in ordenes if o["off_fecha_estimada_fin"] < 0 and o["estado"] != "Finalizado"))
print("por vencer 0-7:", sum(1 for o in ordenes if 0 <= o["off_fecha_estimada_fin"] <= 7 and o["estado"] != "Finalizado"))
print("ITM 333 ->", it333["of_id"], "etapa", it333["estado"])
ofs_petrosur = [o["numero"] for o in ordenes if CLIENTE_DE_PEDIDO[o["pedido_id"] - 1001] == 1]
print("OF de Petrosur:", ofs_petrosur)
print("items de Petrosur:", sum(1 for i in of_detalles
      if CLIENTE_DE_PEDIDO[next(o for o in ordenes if o["of_id"] == i["of_id"])["pedido_id"] - 1001] == 1))
print("rango of_detalle_id:", of_detalles[0]["of_detalle_id"], "-", of_detalles[-1]["of_detalle_id"])
