import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertOctagon, Ban, Bot, CircleSlash, ClipboardPen, Mic, MicOff, Plus, Send, Sparkles, Trash2, User, Wrench,
} from 'lucide-react'
import { useApp } from '@/store/AppContext'
import { useDictado } from '@/hooks/useDictado'
import { analizar } from '@/lib/nlu'
import { responder } from '@/lib/agente'
import { avanzarFormularioOf, etiquetaPaso, iniciarFormularioOf, pareceOtraConsulta } from '@/lib/formularioOf'
import { ETIQUETA_ROL } from '@/lib/permisos'
import { hora, relativo } from '@/lib/formato'
import { AvisoDemo, Tarjeta } from '@/components/ui/Primitivos'
import { TablaDatos } from '@/components/ui/TablaDatos'
import { TarjetaConfirmacion } from '@/components/chat/TarjetaConfirmacion'
import type { Canal, Mensaje, Rol, TonoMensaje } from '@/types'

const SUGERENCIAS: Record<Rol, string[]> = {
  ADMINISTRACION: [
    'Listame los pedidos de Petrosur',
    'Mostrame las OF atrasadas',
    'Listame las OF próximas a vencer y ordenalas',
    '¿Qué OF siguen pendientes de iniciar?',
    'Crear una OF para el pedido 1004',
    'Pasá el ítem 333 a tratamiento',
  ],
  OPERARIO: [
    'Mostrame los ítems de la OF-211',
    '¿En qué estado está la OF-211?',
    'Agregá un comentario al ítem 333: falta material para continuar',
    'Mostrame los comentarios del ítem 333',
    'Actualizá el ítem 333 a tratamiento',
    'Listame los pedidos de Petrosur',
  ],
  JEFE_PRODUCCION: [
    'Mostrame las OF atrasadas',
    'Pasá el ítem 333 a tratamiento',
    'Agregá un comentario al ítem 333: observación sobre la rosca',
    'Actualizá el ítem 333 a finalizado',
    '¿Qué OF están en mecanizado?',
    'Mostrame la auditoría',
  ],
}

const ESTILO_TONO: Record<TonoMensaje, string> = {
  normal: 'bg-white border-brimec-border',
  aclaracion: 'bg-sky-50 border-sky-200',
  rechazo: 'bg-rose-50 border-rose-200',
  fuera_alcance: 'bg-slate-50 border-slate-200',
  exito: 'bg-emerald-50 border-emerald-200',
  error: 'bg-amber-50 border-amber-200',
}

const ICONO_TONO: Partial<Record<TonoMensaje, typeof Ban>> = {
  rechazo: Ban,
  fuera_alcance: CircleSlash,
  error: AlertOctagon,
}

const nuevoId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export default function Chat() {
  const {
    ds, rol, empleado, conversacion, conversaciones, nuevaConversacion, abrirConversacion,
    agregarMensaje, actualizarMensaje, borrarConversacion, ejecutar, registrarRechazo, registrarCancelacion,
    setFormulario,
  } = useApp()

  const [entrada, setEntrada] = useState('')
  const [pensando, setPensando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const mensajes = useMemo(() => conversacion?.mensajes ?? [], [conversacion])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes.length, pensando])

  const enviar = useCallback(
    (texto: string, canal: Canal) => {
      const limpio = texto.trim()
      if (!limpio || !rol || !empleado) return

      if (!conversacion) nuevaConversacion()

      const delUsuario: Mensaje = {
        id: nuevoId(),
        autor: 'usuario',
        texto: limpio,
        fecha: new Date().toISOString(),
        canal,
        tono: 'normal',
      }

      // el store crea la conversacion de forma asincrona: se encola el mensaje
      window.setTimeout(() => agregarMensaje(delUsuario), 0)
      setEntrada('')
      setPensando(true)

      const formActivo = conversacion?.formulario ?? null

      window.setTimeout(() => {
        const analisis = analizar(limpio)

        const publicar = (p: {
          texto: string
          tono: Mensaje['tono']
          herramienta?: string
          tabla?: Mensaje['tabla']
          propuesta?: Mensaje['propuesta']
          intencion?: string
        }) => {
          agregarMensaje({
            id: nuevoId(),
            autor: 'asistente',
            texto: p.texto,
            fecha: new Date().toISOString(),
            canal,
            tono: p.tono,
            intencion: p.intencion,
            herramienta: p.herramienta,
            tabla: p.tabla,
            propuesta: p.propuesta,
            estadoPropuesta: p.propuesta ? 'pendiente' : undefined,
          })
          setPensando(false)
        }

        // Si hay un formulario abierto, la respuesta es para el campo que se pidio,
        // salvo que claramente sea otra consulta: en ese caso el formulario se cancela.
        if (formActivo) {
          if (!pareceOtraConsulta(limpio)) {
            const paso = avanzarFormularioOf(ds, formActivo, limpio, analisis.slots.clientes)
            setFormulario(paso.formulario)
            publicar({ ...paso, intencion: 'crear_of' })
            return
          }
          setFormulario(null)
          agregarMensaje({
            id: nuevoId(),
            autor: 'sistema',
            texto: 'Cancelé la creación de la OF para responder tu consulta. No se creó ningún registro.',
            fecha: new Date().toISOString(),
            canal,
            tono: 'normal',
          })
        }

        const r = responder({ ds, rol, canal, analisis })

        if (r.rechazo) {
          registrarRechazo(r.rechazo.entidad, r.rechazo.registroId, r.rechazo.operacion, r.rechazo.capacidad, canal)
        }

        if (r.iniciarFormulario === 'CREAR_OF') {
          const paso = iniciarFormularioOf(ds, analisis.slots)
          setFormulario(paso.formulario)
          publicar({ ...paso, intencion: 'crear_of' })
          return
        }

        publicar({ ...r, intencion: analisis.intencion })
      }, 520)
    },
    [agregarMensaje, conversacion, ds, empleado, nuevaConversacion, registrarRechazo, rol, setFormulario],
  )

  const dictado = useDictado((texto) => enviar(texto, 'voz'))

  // Atajo desde el dashboard: /chat con { state: { prompt } } manda la consulta al entrar.
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const atajoUsado = useRef(false)
  useEffect(() => {
    const prompt = (ubicacion.state as { prompt?: string } | null)?.prompt
    if (!prompt || atajoUsado.current) return
    atajoUsado.current = true
    navegar('/chat', { replace: true, state: null })
    enviar(prompt, 'texto')
  }, [enviar, navegar, ubicacion.state])

  function confirmar(m: Mensaje) {
    if (!m.propuesta) return
    const res = ejecutar(m.propuesta, m.canal)
    actualizarMensaje(m.id, { estadoPropuesta: res.ok ? 'confirmada' : 'pendiente' })
    agregarMensaje({
      id: nuevoId(),
      autor: 'sistema',
      texto: res.ok
        ? `${res.mensaje} La operación quedó registrada en auditoría.`
        : `No se pudo ejecutar: ${res.mensaje}`,
      fecha: new Date().toISOString(),
      canal: m.canal,
      tono: res.ok ? 'exito' : 'rechazo',
    })
  }

  function cancelar(m: Mensaje) {
    if (!m.propuesta) return
    registrarCancelacion(m.propuesta, m.canal)
    actualizarMensaje(m.id, { estadoPropuesta: 'cancelada' })
    agregarMensaje({
      id: nuevoId(),
      autor: 'sistema',
      texto: 'Operación cancelada. No se modificó ningún registro; la cancelación quedó registrada en auditoría.',
      fecha: new Date().toISOString(),
      canal: m.canal,
      tono: 'normal',
    })
  }

  if (!rol || !empleado) return null

  return (
    <div className="mx-auto flex h-full max-w-[1400px] gap-5 px-4 py-5 sm:px-6">
      {/* historial */}
      <aside className="hidden w-64 shrink-0 flex-col lg:flex">
        <button onClick={() => nuevaConversacion()} className="btn-primary w-full">
          <Plus size={15} /> Nueva conversación
        </button>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <p className="label-ui px-1 pb-1.5">Historial</p>
          {conversaciones.length === 0 ? (
            <p className="px-1 text-[12px] text-slate-400">Todavía no hay conversaciones guardadas.</p>
          ) : (
            <ul className="space-y-1">
              {conversaciones.map((c) => (
                <li key={c.id}>
                  <div
                    className={`group flex items-start gap-1.5 rounded-lg px-2.5 py-2 transition-colors ${
                      c.id === conversacion?.id ? 'bg-brimec-soft/40' : 'hover:bg-white'
                    }`}
                  >
                    <button onClick={() => abrirConversacion(c.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[12.5px] font-medium text-brimec-navy">{c.titulo}</span>
                      <span className="block text-[11px] text-slate-400">
                        {c.mensajes.length} mensajes · {relativo(c.fechaUltima)}
                      </span>
                    </button>
                    <button
                      onClick={() => borrarConversacion(c.id)}
                      className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                      aria-label="Borrar conversación"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-3 rounded-lg bg-white px-2.5 py-2 text-[10.5px] leading-relaxed text-slate-500 ring-1 ring-brimec-border">
          El historial se guarda en LocalStorage. El modelo de datos no tiene tablas de conversación: si hiciera
          falta auditarlas, habría que agregarlas.
        </p>
      </aside>

      {/* panel de conversacion */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <h1 className="font-display text-xl text-brimec-navy">Asistente de taller</h1>
            <p className="text-[12.5px] text-slate-500">
              {ETIQUETA_ROL[rol]} · {empleado.nombre} · canal {dictado.escuchando ? 'voz (escuchando)' : 'texto o voz'}
            </p>
          </div>
          <button onClick={() => nuevaConversacion()} className="btn-ghost lg:hidden">
            <Plus size={15} /> Nueva
          </button>
        </div>

        <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* mensajes */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            {mensajes.length === 0 && !pensando && (
              <Bienvenida rol={rol} onElegir={(t) => enviar(t, 'texto')} />
            )}

            {mensajes.map((m) => (
              <Burbuja
                key={m.id}
                m={m}
                onConfirmar={() => confirmar(m)}
                onCancelar={() => cancelar(m)}
              />
            ))}

            {pensando && (
              <div className="flex items-start gap-2.5 animate-fade-in">
                <AvatarAsistente />
                <div className="rounded-xl rounded-tl-sm border border-brimec-border bg-white px-4 py-3">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-brimec-primary animate-bounce-dot"
                        style={{ animationDelay: `${i * 0.16}s` }}
                      />
                    ))}
                    <span className="ml-2 text-[11.5px] text-slate-400">interpretando la solicitud…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* entrada */}
          <div className="border-t border-brimec-border/70 bg-white px-4 py-3 sm:px-5">
            {conversacion?.formulario && (
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-brimec-primary/30 bg-brimec-soft/20 px-3 py-1.5">
                <ClipboardPen size={13} className="shrink-0 text-brimec-primary" />
                <span className="text-[12px] font-semibold text-brimec-navy">
                  {etiquetaPaso(conversacion.formulario)}
                </span>
                <button
                  onClick={() => {
                    setFormulario(null)
                    agregarMensaje({
                      id: nuevoId(),
                      autor: 'sistema',
                      texto: 'Cancelaste la creación de la OF. No se creó ningún registro.',
                      fecha: new Date().toISOString(),
                      canal: 'texto',
                      tono: 'normal',
                    })
                  }}
                  className="ml-auto text-[11.5px] font-semibold text-slate-500 hover:text-rose-600"
                >
                  Cancelar
                </button>
              </div>
            )}

            {dictado.parcial && (
              <p className="mb-2 rounded-lg bg-brimec-soft/30 px-3 py-1.5 text-[12.5px] italic text-brimec-navy">
                «{dictado.parcial}»
              </p>
            )}
            {dictado.error && (
              <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-900">
                {dictado.error}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                enviar(entrada, 'texto')
              }}
              className="flex items-end gap-2"
            >
              <button
                type="button"
                onClick={dictado.alternar}
                title={dictado.soportado ? 'Dictar por voz' : 'Este navegador no soporta dictado'}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition-all ${
                  dictado.escuchando
                    ? 'border-brimec-primary bg-brimec-primary text-white animate-pulse-ring'
                    : dictado.soportado
                      ? 'border-brimec-border bg-white text-brimec-navy hover:border-brimec-primary hover:text-brimec-primary'
                      : 'border-brimec-border bg-slate-50 text-slate-300'
                }`}
              >
                {dictado.soportado ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    enviar(entrada, 'texto')
                  }
                }}
                placeholder={`Escribí o dictá tu consulta… (ej: "${SUGERENCIAS[rol][0]}")`}
                className="input max-h-32 min-h-[44px] flex-1 resize-none py-3"
              />

              <button type="submit" className="btn-primary h-11 w-11 shrink-0 !px-0" disabled={!entrada.trim()}>
                <Send size={17} />
              </button>
            </form>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Probá:</span>
              {SUGERENCIAS[rol].slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s, 'texto')}
                  className="rounded-full border border-brimec-border bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-brimec-primary hover:text-brimec-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

function AvatarAsistente() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brimec-navy text-white">
      <Bot size={16} />
    </span>
  )
}

function Burbuja({
  m,
  onConfirmar,
  onCancelar,
}: {
  m: Mensaje
  onConfirmar: () => void
  onCancelar: () => void
}) {
  if (m.autor === 'usuario') {
    return (
      <div className="flex animate-fade-up items-start justify-end gap-2.5">
        <div className="max-w-[78%]">
          <div className="rounded-xl rounded-tr-sm bg-brimec-primary px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-sm">
            {m.texto}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10.5px] text-slate-400">
            {m.canal === 'voz' && (
              <span className="inline-flex items-center gap-0.5">
                <Mic size={10} /> dictado
              </span>
            )}
            {hora(m.fecha)}
          </div>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brimec-steel/30 text-brimec-navy">
          <User size={16} />
        </span>
      </div>
    )
  }

  if (m.autor === 'sistema') {
    return (
      <div className="flex animate-fade-up justify-center">
        <p
          className={`max-w-[85%] rounded-lg border px-3 py-2 text-center text-[12.5px] leading-snug ${
            m.tono === 'exito'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : m.tono === 'rechazo'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-brimec-border bg-white text-slate-600'
          }`}
        >
          {m.texto}
        </p>
      </div>
    )
  }

  const Icono = ICONO_TONO[m.tono]

  return (
    <div className="flex animate-fade-up items-start gap-2.5">
      <AvatarAsistente />
      <div className="min-w-0 max-w-[92%] flex-1">
        <div className={`rounded-xl rounded-tl-sm border px-4 py-3 ${ESTILO_TONO[m.tono]}`}>
          <div className="flex items-start gap-2">
            {Icono && (
              <Icono
                size={15}
                className={`mt-0.5 shrink-0 ${
                  m.tono === 'rechazo' ? 'text-rose-500' : m.tono === 'error' ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
            )}
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-700">{m.texto}</p>
          </div>

          {m.herramienta && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-brimec-surface px-2 py-1 text-[10.5px] font-medium text-slate-500 ring-1 ring-brimec-border">
              <Wrench size={10} />
              herramienta invocada: <code className="font-mono text-brimec-navy">{m.herramienta}()</code>
            </div>
          )}
        </div>

        {m.tabla && (
          <div className="mt-2">
            <TablaDatos tabla={m.tabla} compacta />
          </div>
        )}

        {m.propuesta && (
          <TarjetaConfirmacion
            propuesta={m.propuesta}
            estado={m.estadoPropuesta ?? 'pendiente'}
            onConfirmar={onConfirmar}
            onCancelar={onCancelar}
          />
        )}

        <div className="mt-1 flex items-center gap-2 text-[10.5px] text-slate-400">
          {hora(m.fecha)}
          {m.intencion && <span className="font-mono">intención: {m.intencion}</span>}
        </div>
      </div>
    </div>
  )
}

function Bienvenida({ rol, onElegir }: { rol: Rol; onElegir: (t: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up py-6">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brimec-navy text-white">
          <Sparkles size={24} />
        </span>
        <h2 className="mt-4 font-display text-xl text-brimec-navy">¿Qué necesitás consultar?</h2>
        <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-slate-500">
          Preguntá en lenguaje natural sobre clientes, pedidos, órdenes de fabricación, ítems, etapas y
          comentarios de taller. Podés escribir o dictar con el micrófono.
        </p>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {SUGERENCIAS[rol].map((s) => (
          <button
            key={s}
            onClick={() => onElegir(s)}
            className="rounded-lg border border-brimec-border bg-white px-3.5 py-2.5 text-left text-[13px] text-slate-600 transition-all hover:-translate-y-0.5 hover:border-brimec-primary/50 hover:text-brimec-navy hover:shadow-card"
          >
            {s}
          </button>
        ))}
      </div>

      <Tarjeta className="mt-6" titulo="Cómo leer esta demo">
        <AvisoDemo />
        <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-slate-600">
          <li>· Toda operación de escritura muestra <b>estado actual, cambio propuesto y confirmación</b>.</li>
          <li>· Si falta un dato, el asistente <b>repregunta</b> en vez de inventar el identificador.</li>
          <li>· Si tu perfil no tiene el permiso, la operación se <b>rechaza y queda auditada</b>.</li>
          <li>· Las etapas válidas salen del <b>catálogo del ERP</b>, no de una lista fija en el código.</li>
        </ul>
      </Tarjeta>
    </div>
  )
}
