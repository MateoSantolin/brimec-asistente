import { useNavigate } from 'react-router-dom'
import { ArrowRight, Ban, Check, HardHat, ShieldCheck, Briefcase, Factory } from 'lucide-react'
import { useApp } from '@/store/AppContext'
import { EMPLEADOS, PERFILES_DEMO } from '@/data/seed'
import { CAPACIDADES_POR_ROL, CAPACIDADES_VISIBLES, ETIQUETA_CAPACIDAD, ETIQUETA_ROL } from '@/lib/permisos'
import { AvisoDemo, Marca } from '@/components/ui/Primitivos'
import type { Rol } from '@/types'

const ICONO: Record<Rol, typeof HardHat> = {
  ADMINISTRACION: Briefcase,
  OPERARIO: HardHat,
  JEFE_PRODUCCION: Factory,
}

const RESUMEN: Record<Rol, string> = {
  ADMINISTRACION:
    'Consulta clientes, pedidos, OF, ítems y avances. Crea órdenes de fabricación. No actualiza etapas ni registra comentarios de taller.',
  OPERARIO:
    'Consulta la información operativa del taller y registra comentarios sobre los ítems. No crea OF ni actualiza etapas.',
  JEFE_PRODUCCION:
    'Consulta la información operativa, registra comentarios y es el único perfil que actualiza las etapas de los ítems.',
}

export default function SeleccionPerfil() {
  const { elegirPerfil } = useApp()
  const navegar = useNavigate()
  const perfiles = EMPLEADOS.filter((e) => PERFILES_DEMO.includes(e.empleado_id))

  function elegir(id: number) {
    elegirPerfil(id)
    navegar('/dashboard')
  }

  return (
    <div className="min-h-screen bg-brimec-surface">
      <header className="border-b border-brimec-border bg-white px-6 py-4">
        <Marca />
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="animate-fade-up">
          <h1 className="font-display text-2xl text-brimec-navy">Seleccioná un perfil de demostración</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
            Cada perfil habilita distintas operaciones. En la solución real, la identidad y el rol los provee el
            mecanismo de autenticación del ERP y los permisos se validan en el middleware, no en la interfaz.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {perfiles.map((emp, idx) => {
            const Icono = ICONO[emp.rol]
            const capacidades = CAPACIDADES_POR_ROL[emp.rol]
            return (
              <button
                key={emp.empleado_id}
                onClick={() => elegir(emp.empleado_id)}
                style={{ animationDelay: `${idx * 70}ms` }}
                className="card group animate-fade-up p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-brimec-primary/40 hover:shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-brimec-primary"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brimec-navy text-white transition-colors group-hover:bg-brimec-primary">
                    <Icono size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-base text-brimec-navy">{ETIQUETA_ROL[emp.rol]}</div>
                    <div className="truncate text-sm text-slate-600">{emp.nombre}</div>
                    <div className="truncate text-[11px] text-slate-400">{emp.sector}</div>
                  </div>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{RESUMEN[emp.rol]}</p>

                <ul className="mt-4 space-y-1.5 border-t border-brimec-border/70 pt-3">
                  {CAPACIDADES_VISIBLES.map((c) => {
                    const tiene = capacidades.includes(c)
                    return (
                      <li
                        key={c}
                        className={`flex items-center gap-2 text-[12px] ${tiene ? 'text-slate-700' : 'text-slate-300'}`}
                      >
                        {tiene ? (
                          <Check size={13} className="shrink-0 text-emerald-600" />
                        ) : (
                          <Ban size={13} className="shrink-0" />
                        )}
                        {ETIQUETA_CAPACIDAD[c]}
                      </li>
                    )
                  })}
                </ul>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brimec-primary">
                  Entrar como {ETIQUETA_ROL[emp.rol]}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <AvisoDemo />
          <div className="flex items-start gap-2 rounded-lg border border-brimec-border bg-white px-3 py-2 text-[12px] leading-snug text-slate-600">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brimec-primary" />
            <p>
              El perfil de <b>Mantenimiento</b> quedó fuera del alcance, igual que en T-09 y T-10.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
