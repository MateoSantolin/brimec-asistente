import { ChevronDown, Database, Fingerprint, Lock, MessageSquareText, Mic, ScrollText, Server, Share2, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'

type Estado = 'demo' | 'simulado' | 'propuesto'

const ETIQUETA_ESTADO: Record<Estado, { texto: string; clase: string }> = {
  demo: { texto: 'funciona en la demo', clase: 'bg-emerald-100 text-emerald-700' },
  simulado: { texto: 'simulado', clase: 'bg-amber-100 text-amber-800' },
  propuesto: { texto: 'no implementado', clase: 'bg-slate-200 text-slate-600' },
}

function Capa({
  icono,
  titulo,
  detalle,
  estado,
  destacada = false,
  children,
}: {
  icono: ReactNode
  titulo: string
  detalle: string
  estado: Estado
  destacada?: boolean
  children?: ReactNode
}) {
  const e = ETIQUETA_ESTADO[estado]
  return (
    <div
      className={`w-full rounded-xl border px-4 py-3 transition-shadow ${
        destacada
          ? 'border-brimec-primary/40 bg-brimec-soft/20 shadow-card'
          : 'border-brimec-border bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            destacada ? 'bg-brimec-primary text-white' : 'bg-brimec-navy/90 text-white'
          }`}
        >
          {icono}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm tracking-wide text-brimec-navy">{titulo}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.clase}`}>{e.texto}</span>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{detalle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

function Flecha() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <ChevronDown size={18} className="text-brimec-steel" />
    </div>
  )
}

const CONTROLES = [
  { icono: <Fingerprint size={12} />, t: 'Autenticación' },
  { icono: <Lock size={12} />, t: 'Autorización (RBAC)' },
  { icono: <Workflow size={12} />, t: 'Reglas de negocio' },
  { icono: <ShieldCheck size={12} />, t: 'Confirmación' },
  { icono: <ScrollText size={12} />, t: 'Auditoría' },
]

export function DiagramaArquitectura() {
  return (
    <div className="space-y-0">
      <Capa
        icono={<Users size={17} />}
        titulo="Usuarios"
        detalle="Administración · Operarios · Jefe de Producción"
        estado="demo"
      />
      <Flecha />
      <Capa
        icono={<MessageSquareText size={17} />}
        titulo="Widget conversacional del ERP"
        detalle="Texto y voz, embebido en las pantallas del ERP"
        estado="demo"
        destacada
      />
      <Flecha />
      <Capa
        icono={<Mic size={17} />}
        titulo="Speech-to-Text"
        detalle="Transcripción del dictado. En la demo usa la Web Speech API del navegador; el servicio definitivo está pendiente de evaluación."
        estado="simulado"
      />
      <Flecha />
      <Capa
        icono={<Sparkles size={17} />}
        titulo="Modelo de IA generativa"
        detalle="Interpreta la intención y selecciona la herramienta a invocar. En la demo está reemplazado por un analizador por reglas."
        estado="simulado"
      />
      <Flecha />
      <Capa
        icono={<Server size={17} />}
        titulo="API agente / Middleware (FastAPI)"
        detalle="Única vía de escritura. El modelo nunca accede a los datos ni ejecuta SQL."
        estado="simulado"
        destacada
      >
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {CONTROLES.map((c) => (
            <li
              key={c.t}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-brimec-navy ring-1 ring-brimec-border"
            >
              {c.icono}
              {c.t}
            </li>
          ))}
        </ul>
      </Capa>
      <Flecha />
      <Capa
        icono={<Share2 size={17} />}
        titulo="Conector ERP (API REST)"
        detalle="Expone las operaciones autorizadas del ERP como herramientas controladas."
        estado="propuesto"
      />
      <Flecha />
      <Capa
        icono={<Database size={17} />}
        titulo="ERP SaaS (Odoo) + base de datos"
        detalle="Sistema transaccional: datos maestros, catálogo de etapas, reglas y registro de auditoría."
        estado="propuesto"
      />

      <p className="mt-4 rounded-lg bg-brimec-surface px-3 py-2 text-[11.5px] leading-relaxed text-slate-600">
        Arquitectura <b>desacoplada</b>: el modelo generativo se usa solo para comprender lenguaje natural y
        redactar respuestas. La autorización, la ejecución de transacciones y el acceso a los datos quedan bajo
        control del middleware y del ERP. Esta separación es la que limita el riesgo de modificaciones indebidas.
      </p>
    </div>
  )
}
