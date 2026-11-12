import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ClipboardList, LayoutDashboard, LogOut, Menu, MessageSquareText, RefreshCw, ScrollText, ShieldCheck, UserCog, X,
} from 'lucide-react'
import { useApp } from '@/store/AppContext'
import { ETIQUETA_ROL } from '@/lib/permisos'
import { Marca } from '@/components/ui/Primitivos'
import type { Capacidad } from '@/types'

interface Item {
  a: string
  label: string
  icono: ReactNode
  capacidad?: Capacidad
}

const ITEMS: Item[] = [
  { a: '/dashboard', label: 'Dashboard', icono: <LayoutDashboard size={17} /> },
  { a: '/chat', label: 'Asistente', icono: <MessageSquareText size={17} /> },
  { a: '/consultas', label: 'Consultas', icono: <ClipboardList size={17} /> },
  { a: '/auditoria', label: 'Auditoria', icono: <ScrollText size={17} />, capacidad: 'consultar_auditoria' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { empleado, rol, tieneCapacidad, salir, cambiarPerfil, reiniciarDemo } = useApp()
  const navegar = useNavigate()
  const [abierto, setAbierto] = useState(false)

  if (!empleado || !rol) return null

  const visibles = ITEMS.filter((i) => !i.capacidad || tieneCapacidad(i.capacidad))

  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {visibles.map((i) => (
        <NavLink
          key={i.a}
          to={i.a}
          onClick={() => setAbierto(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-brimec-primary text-white shadow-sm'
                : 'text-brimec-soft/90 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          {i.icono}
          {i.label}
        </NavLink>
      ))}
    </nav>
  )

  const barraLateral = (
    <div className="flex h-full w-64 shrink-0 flex-col bg-gradient-to-b from-brimec-navy to-brimec-navy-deep">
      <div className="px-4 py-5">
        <Marca invertida />
      </div>

      <div className="mx-3 mb-4 rounded-lg bg-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brimec-primary font-display text-sm text-white">
            {empleado.nombre
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{empleado.nombre}</div>
            <div className="truncate text-[11px] text-brimec-soft">{ETIQUETA_ROL[rol]}</div>
          </div>
        </div>
      </div>

      {nav}

      <div className="mt-auto flex flex-col gap-1 px-3 pb-4">
        <button
          onClick={reiniciarDemo}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-brimec-soft/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={15} /> Reiniciar datos de la demo
        </button>
        <button
          onClick={() => {
            cambiarPerfil()
            navegar('/perfil')
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-brimec-soft/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <UserCog size={15} /> Cambiar de perfil
        </button>
        <button
          onClick={() => {
            salir()
            navegar('/login')
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-brimec-soft/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={15} /> Salir
        </button>
        <p className="mt-2 px-3 text-[10px] leading-relaxed text-brimec-soft/50">
          Demo académica T-09 / T-10. Sin LLM ni ERP reales.
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-brimec-surface">
      <aside className="hidden lg:block">{barraLateral}</aside>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-brimec-navy/50 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="absolute left-0 top-0 h-full animate-slide-left">{barraLateral}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-brimec-border bg-white px-4">
          <button
            className="rounded-lg p-2 text-brimec-navy hover:bg-brimec-surface lg:hidden"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Menu"
          >
            {abierto ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="lg:hidden">
            <Marca compacta />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:inline-flex">
              <ShieldCheck size={12} /> MODO DEMO · datos sintéticos
            </span>
            <span className="rounded-full bg-brimec-soft/40 px-2.5 py-1 text-[11px] font-semibold text-brimec-navy">
              {ETIQUETA_ROL[rol]}
            </span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
