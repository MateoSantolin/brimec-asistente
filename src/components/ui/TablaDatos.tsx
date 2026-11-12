import { Link } from 'react-router-dom'
import { Filter } from 'lucide-react'
import type { TablaResultado } from '@/types'
import { BadgeEtapa, Chip } from './Primitivos'

const COLUMNAS_ETAPA = new Set(['Etapa', 'Estado'])
const COLUMNAS_ENLACE = new Set(['OF'])

export function TablaDatos({ tabla, compacta = false }: { tabla: TablaResultado; compacta?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-brimec-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brimec-border/70 bg-brimec-surface/60 px-3 py-2">
        <span className="font-display text-[12px] uppercase tracking-[.1em] text-brimec-navy">{tabla.titulo}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <Filter size={11} />
          {tabla.criterio}
        </span>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
            <tr className="border-b border-brimec-border/70">
              {tabla.columnas.map((c) => (
                <th key={c} className="th">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brimec-border/60">
            {tabla.filas.map((fila, i) => (
              <tr key={i} className="row-hover animate-fade-in" style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}>
                {tabla.columnas.map((c) => {
                  const valor = fila[c] ?? '—'
                  const enlace = tabla.enlaces?.[i]

                  if (COLUMNAS_ETAPA.has(c) && valor !== '—') {
                    return (
                      <td key={c} className="td">
                        <BadgeEtapa etapa={valor} tam="sm" />
                      </td>
                    )
                  }

                  if (COLUMNAS_ENLACE.has(c) && enlace && valor === enlace) {
                    return (
                      <td key={c} className="td whitespace-nowrap">
                        <Link to={`/of/${enlace}`} className="font-semibold text-brimec-primary hover:underline">
                          {valor}
                        </Link>
                      </td>
                    )
                  }

                  if (c === 'Resultado') {
                    return (
                      <td key={c} className="td">
                        <Chip tono={valor === 'OK' ? 'ok' : valor === 'RECHAZADA' ? 'peligro' : 'neutro'}>{valor}</Chip>
                      </td>
                    )
                  }

                  if (c === 'Tipo' && ['Incidencia', 'Avance', 'Observacion'].includes(valor)) {
                    return (
                      <td key={c} className="td">
                        <Chip tono={valor === 'Incidencia' ? 'peligro' : valor === 'Avance' ? 'ok' : 'info'}>{valor}</Chip>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={c}
                      className={`td ${compacta ? 'max-w-[220px] truncate' : 'max-w-[340px]'} ${
                        c === 'Plazo' || c === 'Cant.' ? 'whitespace-nowrap' : ''
                      }`}
                      title={valor}
                    >
                      {valor}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-brimec-border/70 bg-brimec-surface/40 px-3 py-1.5 text-[11px] text-slate-500">
        {tabla.filas.length} registro{tabla.filas.length === 1 ? '' : 's'}
      </div>
    </div>
  )
}
