/**
 * Estado de la aplicacion + persistencia en LocalStorage.
 *
 * `ejecutar()` cumple el papel del MIDDLEWARE de la arquitectura de T-10: es el unico
 * punto por el que pasa una escritura. Valida la capacidad del rol, valida la regla de
 * negocio (transicion de etapa permitida), aplica el cambio y escribe el registro de
 * AUDITORIA. Ni el chat ni las pantallas modifican el dataset por su cuenta.
 *
 * Recordatorio: esto corre en el navegador. NO es un control de seguridad; en produccion
 * la validacion debe ocurrir del lado del servidor (T-10, Seguridad y privacidad).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Auditoria, Canal, Capacidad, ComentarioTaller, Conversacion, Empleado, FormularioOf, Mensaje,
  OfDetalle, OrdenFabricacion, OrigenOperacion, PropuestaOperacion, ResultadoAuditoria, Rol, SeguimientoEtapa,
} from '@/types'
import { EMPLEADOS, ETAPAS, semilla } from '@/data/seed'
import { etapaPorId, etapaPorNombre, itemPorId, itemsDeOf, ofPorId, ordenEtapa, transicionPermitida, type Dataset } from '@/lib/consultas'
import { motivoRechazo, puede } from '@/lib/permisos'

const CLAVE = 'brimec.asistente.v1'

interface Persistido {
  version: number
  autenticado: boolean
  empleadoId: number | null
  ds: Dataset
  conversaciones: Conversacion[]
  conversacionId: string | null
}

const VERSION = 1

function estadoInicial(): Persistido {
  return {
    version: VERSION,
    autenticado: false,
    empleadoId: null,
    ds: semilla(),
    conversaciones: [],
    conversacionId: null,
  }
}

function cargar(): Persistido {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return estadoInicial()
    const dato = JSON.parse(crudo) as Persistido
    if (dato.version !== VERSION) return estadoInicial()
    return dato
  } catch {
    return estadoInicial()
  }
}

export interface ResultadoEjecucion {
  ok: boolean
  resultado: ResultadoAuditoria
  mensaje: string
  registroId: number
}

interface ValorContexto {
  autenticado: boolean
  empleado: Empleado | null
  rol: Rol | null
  ds: Dataset
  conversaciones: Conversacion[]
  conversacionId: string | null
  conversacion: Conversacion | null

  ingresar: () => void
  elegirPerfil: (empleadoId: number) => void
  salir: () => void
  cambiarPerfil: () => void
  reiniciarDemo: () => void

  tieneCapacidad: (c: Capacidad) => boolean
  ejecutar: (p: PropuestaOperacion, canal: Canal, origen?: OrigenOperacion) => ResultadoEjecucion
  registrarRechazo: (entidad: string, registroId: number, operacion: string, capacidad: Capacidad, canal: Canal) => void
  registrarCancelacion: (p: PropuestaOperacion, canal: Canal) => void

  nuevaConversacion: () => string
  abrirConversacion: (id: string) => void
  agregarMensaje: (m: Mensaje) => void
  actualizarMensaje: (id: string, cambios: Partial<Mensaje>) => void
  borrarConversacion: (id: string) => void
  /** formulario multi-turno en curso (creacion de OF) */
  setFormulario: (f: FormularioOf | null) => void
}

const Contexto = createContext<ValorContexto | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Persistido>(cargar)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado))
    } catch {
      /* cuota llena: la demo sigue funcionando en memoria */
    }
  }, [estado])

  const empleado = useMemo(
    () => EMPLEADOS.find((e) => e.empleado_id === estado.empleadoId) ?? null,
    [estado.empleadoId],
  )
  const rol = empleado?.rol ?? null

  const tieneCapacidad = useCallback((c: Capacidad) => (rol ? puede(rol, c) : false), [rol])

  /* ----------------------------------------------------------- sesion */

  const ingresar = useCallback(() => setEstado((s) => ({ ...s, autenticado: true })), [])

  const elegirPerfil = useCallback((empleadoId: number) => {
    setEstado((s) => ({ ...s, empleadoId, conversacionId: null }))
  }, [])

  const salir = useCallback(() => {
    setEstado((s) => ({ ...s, autenticado: false, empleadoId: null, conversacionId: null }))
  }, [])

  const cambiarPerfil = useCallback(() => {
    setEstado((s) => ({ ...s, empleadoId: null, conversacionId: null }))
  }, [])

  const reiniciarDemo = useCallback(() => {
    setEstado((s) => ({ ...estadoInicial(), autenticado: s.autenticado, empleadoId: s.empleadoId }))
  }, [])

  /* ----------------------------------------------------------- auditoria */

  const auditar = useCallback(
    (ds: Dataset, parcial: Omit<Auditoria, 'auditoria_id' | 'fecha_hora' | 'empleado_id'>): Auditoria[] => {
      const id = ds.auditoria.reduce((m, a) => Math.max(m, a.auditoria_id), 0) + 1
      return [
        ...ds.auditoria,
        {
          auditoria_id: id,
          empleado_id: estado.empleadoId ?? 0,
          fecha_hora: new Date().toISOString(),
          ...parcial,
        },
      ]
    },
    [estado.empleadoId],
  )

  const registrarRechazo = useCallback(
    (entidad: string, registroId: number, operacion: string, capacidad: Capacidad, canal: Canal) => {
      if (!rol) return
      setEstado((s) => ({
        ...s,
        ds: {
          ...s.ds,
          auditoria: auditar(s.ds, {
            entidad,
            registro_id: registroId,
            operacion,
            detalle: motivoRechazo(rol, capacidad),
            resultado: 'RECHAZADA',
            canal,
            origen: 'Asistente',
          }),
        },
      }))
    },
    [auditar, rol],
  )

  const registrarCancelacion = useCallback(
    (p: PropuestaOperacion, canal: Canal) => {
      setEstado((s) => ({
        ...s,
        ds: {
          ...s.ds,
          auditoria: auditar(s.ds, {
            entidad: p.entidad,
            registro_id: p.registro_id,
            operacion: p.tipo,
            detalle: `El usuario cancelo la operacion antes de confirmarla: ${p.cambioPropuesto}`,
            resultado: 'CANCELADA',
            canal,
            origen: 'Asistente',
          }),
        },
      }))
    },
    [auditar],
  )

  /* ----------------------------------------------------------- middleware simulado */

  const ejecutar = useCallback(
    (p: PropuestaOperacion, canal: Canal, origen: OrigenOperacion = 'Asistente'): ResultadoEjecucion => {
      if (!rol || !empleado) {
        return { ok: false, resultado: 'RECHAZADA', mensaje: 'No hay un perfil activo.', registroId: 0 }
      }

      const capacidadRequerida: Record<PropuestaOperacion['tipo'], Capacidad> = {
        ACTUALIZAR_ESTADO_ITEM: 'actualizar_estado',
        AGREGAR_COMENTARIO: 'agregar_comentario',
        CREAR_OF: 'crear_of',
      }
      const cap = capacidadRequerida[p.tipo]

      // 1) Autorizacion
      if (!puede(rol, cap)) {
        registrarRechazo(p.entidad, p.registro_id, p.tipo, cap, canal)
        return { ok: false, resultado: 'RECHAZADA', mensaje: motivoRechazo(rol, cap), registroId: p.registro_id }
      }

      let salida: ResultadoEjecucion = { ok: true, resultado: 'OK', mensaje: '', registroId: p.registro_id }

      setEstado((s) => {
        const ds = s.ds
        const ahora = new Date().toISOString()

        /* ---------------- actualizar estado de un item ---------------- */
        if (p.tipo === 'ACTUALIZAR_ESTADO_ITEM') {
          const itemId = p.payload.of_detalle_id as number
          const etapaDestinoId = p.payload.etapa_id as number
          const item = itemPorId(ds, itemId)
          const destino = etapaPorId(etapaDestinoId)
          if (!item || !destino) {
            salida = { ok: false, resultado: 'RECHAZADA', mensaje: 'El registro ya no existe.', registroId: itemId }
            return s
          }
          // 2) Regla de negocio: transicion permitida por el catalogo del ERP
          if (!transicionPermitida(item.estado, destino.nombre)) {
            const detalle = `Transicion no permitida: de ${item.estado} a ${destino.nombre}.`
            salida = { ok: false, resultado: 'RECHAZADA', mensaje: detalle, registroId: itemId }
            return {
              ...s,
              ds: {
                ...ds,
                auditoria: auditar(ds, {
                  entidad: 'OF_DETALLE', registro_id: itemId, operacion: 'ACTUALIZAR_ESTADO',
                  detalle, resultado: 'RECHAZADA', canal, origen,
                }),
              },
            }
          }

          const anterior = item.estado
          const ofDetalle: OfDetalle[] = ds.ofDetalle.map((i) =>
            i.of_detalle_id === itemId ? { ...i, estado: destino.nombre } : i,
          )

          const nuevoSegId = ds.seguimiento.reduce((m, x) => Math.max(m, x.seguimiento_id), 0) + 1
          const seguimiento: SeguimientoEtapa[] = [
            ...ds.seguimiento.map((x) =>
              x.of_detalle_id === itemId && x.fin === null
                ? { ...x, fin: ahora, estado: 'Finalizada' as const }
                : x,
            ),
            {
              seguimiento_id: nuevoSegId,
              of_detalle_id: itemId,
              etapa_id: destino.etapa_id,
              empleado_id: empleado.empleado_id,
              inicio: ahora,
              fin: null,
              estado: 'En curso',
              observaciones: `Registrado desde el asistente (${canal}).`,
            },
          ]

          // ORDEN_FABRICACION.estado es derivado: minimo de los estados de sus items
          const dsTmp: Dataset = { ...ds, ofDetalle }
          const hermanos = itemsDeOf(dsTmp, item.of_id)
          const minOrden = Math.min(...hermanos.map((i) => ordenEtapa(i.estado)))
          const etapaOf = ETAPAS.find((e) => e.orden === minOrden)
          const ordenes: OrdenFabricacion[] = ds.ordenes.map((o) =>
            o.of_id === item.of_id
              ? {
                  ...o,
                  estado: etapaOf?.nombre ?? o.estado,
                  fecha_real_fin: minOrden >= ETAPAS.length ? ahora : null,
                }
              : o,
          )

          const of = ofPorId(ds, item.of_id)
          salida = {
            ok: true,
            resultado: 'OK',
            mensaje: `Item ${itemId} de ${of?.numero} actualizado de ${anterior} a ${destino.nombre}.`,
            registroId: itemId,
          }

          return {
            ...s,
            ds: {
              ...ds,
              ofDetalle,
              seguimiento,
              ordenes,
              auditoria: auditar(ds, {
                entidad: 'OF_DETALLE', registro_id: itemId, operacion: 'ACTUALIZAR_ESTADO',
                detalle: `Item ${itemId} de ${of?.numero}: ${anterior} -> ${destino.nombre}.`,
                resultado: 'OK', canal, origen,
              }),
            },
          }
        }

        /* ---------------- agregar comentario de taller ---------------- */
        if (p.tipo === 'AGREGAR_COMENTARIO') {
          const itemId = p.payload.of_detalle_id as number
          const texto = p.payload.texto as string
          const tipo = p.payload.tipo as ComentarioTaller['tipo']
          const item = itemPorId(ds, itemId)
          if (!item) {
            salida = { ok: false, resultado: 'RECHAZADA', mensaje: 'El item ya no existe.', registroId: itemId }
            return s
          }
          const nuevoId = ds.comentarios.reduce((m, c) => Math.max(m, c.comentario_id), 0) + 1
          const comentario: ComentarioTaller = {
            comentario_id: nuevoId,
            of_detalle_id: itemId,
            empleado_id: empleado.empleado_id,
            fecha_hora: ahora,
            tipo,
            texto,
            archivo_audio: canal === 'voz' ? `dictado-${String(nuevoId).padStart(3, '0')}.webm` : null,
          }
          const of = ofPorId(ds, item.of_id)
          salida = {
            ok: true,
            resultado: 'OK',
            mensaje: `Comentario registrado sobre el item ${itemId} de ${of?.numero}.`,
            registroId: nuevoId,
          }
          return {
            ...s,
            ds: {
              ...ds,
              comentarios: [...ds.comentarios, comentario],
              auditoria: auditar(ds, {
                entidad: 'COMENTARIO_TALLER', registro_id: nuevoId, operacion: 'CREAR_COMENTARIO',
                detalle: `Comentario (${tipo}) sobre el item ${itemId} de ${of?.numero}.`,
                resultado: 'OK', canal, origen,
              }),
            },
          }
        }

        /* ---------------- crear orden de fabricacion ---------------- */
        const pedidoId = p.payload.pedido_id as number
        const prioridad = p.payload.prioridad as string
        const fechaFin = p.payload.fecha_estimada_fin as string
        const lineas = p.payload.items as Array<{ articulo_id: number; cantidad: number; pedido_detalle_id: number | null }>

        const nuevoOfId = ds.ordenes.reduce((m, o) => Math.max(m, o.of_id), 0) + 1
        let nuevoItemId = ds.ofDetalle.reduce((m, i) => Math.max(m, i.of_detalle_id), 0)
        let nuevoSeg = ds.seguimiento.reduce((m, x) => Math.max(m, x.seguimiento_id), 0)
        const etapaInicial = ETAPAS[0]

        const nuevosItems: OfDetalle[] = []
        const nuevosSeg: SeguimientoEtapa[] = []
        lineas.forEach((l, idx) => {
          nuevoItemId += 1
          nuevoSeg += 1
          nuevosItems.push({
            of_detalle_id: nuevoItemId,
            of_id: nuevoOfId,
            pedido_detalle_id: l.pedido_detalle_id,
            articulo_id: l.articulo_id,
            numero_item: String(idx + 1).padStart(3, '0'),
            cantidad: l.cantidad,
            partida: '',
            estado: etapaInicial.nombre,
          })
          nuevosSeg.push({
            seguimiento_id: nuevoSeg,
            of_detalle_id: nuevoItemId,
            etapa_id: etapaInicial.etapa_id,
            empleado_id: empleado.empleado_id,
            inicio: ahora,
            fin: null,
            estado: 'En curso',
            observaciones: `OF creada desde el asistente (${canal}).`,
          })
        })

        const nuevaOf: OrdenFabricacion = {
          of_id: nuevoOfId,
          pedido_id: pedidoId,
          numero: `OF-${nuevoOfId}`,
          fecha_emision: ahora,
          fecha_estimada_fin: fechaFin,
          fecha_real_fin: null,
          prioridad,
          estado: etapaInicial.nombre,
        }

        salida = {
          ok: true,
          resultado: 'OK',
          mensaje: `${nuevaOf.numero} creada con ${nuevosItems.length} item(s) sobre el pedido #${pedidoId}.`,
          registroId: nuevoOfId,
        }

        return {
          ...s,
          ds: {
            ...ds,
            ordenes: [...ds.ordenes, nuevaOf],
            ofDetalle: [...ds.ofDetalle, ...nuevosItems],
            seguimiento: [...ds.seguimiento, ...nuevosSeg],
            pedidos: ds.pedidos.map((pd) =>
              pd.pedido_id === pedidoId && pd.estado === 'Abierto' ? { ...pd, estado: 'En produccion' } : pd,
            ),
            auditoria: auditar(ds, {
              entidad: 'ORDEN_FABRICACION', registro_id: nuevoOfId, operacion: 'CREAR',
              detalle: `Alta de ${nuevaOf.numero} sobre el pedido #${pedidoId} con ${nuevosItems.length} item(s).`,
              resultado: 'OK', canal, origen,
            }),
          },
        }
      })

      return salida
    },
    [auditar, empleado, registrarRechazo, rol],
  )

  /* ----------------------------------------------------------- conversaciones */

  const nuevaConversacion = useCallback((): string => {
    const id = `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    setEstado((s) => {
      if (!s.empleadoId || !empleado) return s
      const cv: Conversacion = {
        id,
        titulo: 'Nueva conversacion',
        empleado_id: s.empleadoId,
        rol: empleado.rol,
        fechaInicio: new Date().toISOString(),
        fechaUltima: new Date().toISOString(),
        mensajes: [],
      }
      return { ...s, conversaciones: [cv, ...s.conversaciones], conversacionId: id }
    })
    return id
  }, [empleado])

  const abrirConversacion = useCallback((id: string) => {
    setEstado((s) => ({ ...s, conversacionId: id }))
  }, [])

  const agregarMensaje = useCallback((m: Mensaje) => {
    setEstado((s) => {
      if (!s.conversacionId) return s
      return {
        ...s,
        conversaciones: s.conversaciones.map((c) => {
          if (c.id !== s.conversacionId) return c
          const esPrimeroDelUsuario = m.autor === 'usuario' && !c.mensajes.some((x) => x.autor === 'usuario')
          return {
            ...c,
            titulo: esPrimeroDelUsuario ? m.texto.slice(0, 52) : c.titulo,
            fechaUltima: m.fecha,
            mensajes: [...c.mensajes, m],
          }
        }),
      }
    })
  }, [])

  const actualizarMensaje = useCallback((id: string, cambios: Partial<Mensaje>) => {
    setEstado((s) => ({
      ...s,
      conversaciones: s.conversaciones.map((c) =>
        c.id !== s.conversacionId
          ? c
          : { ...c, mensajes: c.mensajes.map((m) => (m.id === id ? { ...m, ...cambios } : m)) },
      ),
    }))
  }, [])

  const setFormulario = useCallback((f: FormularioOf | null) => {
    setEstado((s) => ({
      ...s,
      conversaciones: s.conversaciones.map((c) => (c.id === s.conversacionId ? { ...c, formulario: f } : c)),
    }))
  }, [])

  const borrarConversacion = useCallback((id: string) => {
    setEstado((s) => ({
      ...s,
      conversaciones: s.conversaciones.filter((c) => c.id !== id),
      conversacionId: s.conversacionId === id ? null : s.conversacionId,
    }))
  }, [])

  const conversacion = useMemo(
    () => estado.conversaciones.find((c) => c.id === estado.conversacionId) ?? null,
    [estado.conversaciones, estado.conversacionId],
  )

  const valor: ValorContexto = {
    autenticado: estado.autenticado,
    empleado,
    rol,
    ds: estado.ds,
    conversaciones: estado.conversaciones.filter((c) => c.empleado_id === estado.empleadoId),
    conversacionId: estado.conversacionId,
    conversacion,
    ingresar,
    elegirPerfil,
    salir,
    cambiarPerfil,
    reiniciarDemo,
    tieneCapacidad,
    ejecutar,
    registrarRechazo,
    registrarCancelacion,
    nuevaConversacion,
    abrirConversacion,
    agregarMensaje,
    actualizarMensaje,
    borrarConversacion,
    setFormulario,
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useApp(): ValorContexto {
  const v = useContext(Contexto)
  if (!v) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return v
}

/** Re-export util para pantallas que necesiten resolver una etapa por nombre. */
export { etapaPorNombre }
