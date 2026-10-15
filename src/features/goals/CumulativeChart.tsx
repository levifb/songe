import { useId } from 'react'
import { motion } from 'framer-motion'
import { formatCentsCompact } from '@/lib/money'
import type { MonthPoint } from '@/domain/projection'
import type { User } from '@/domain/types'

interface CumulativeChartProps {
  points: MonthPoint[]
  members: User[]
  targetCents: number
}

const W = 320
const H = 150
const PAD_TOP = 14
const PAD_BOTTOM = 22

// Inicial sozinha não serve em português: J, M e A se repetem.
const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * A encosta que vocês estão subindo: área acumulada, empilhada por pessoa.
 * Desenhada à mão em SVG — uma biblioteca de gráficos inteira para um único
 * gráfico seria peso morto, e nenhuma delas desenharia exatamente isto.
 */
export function CumulativeChart({ points, members, targetCents }: CumulativeChartProps) {
  const gradientMine = useId()
  const gradientHers = useId()

  if (points.length < 2) return null

  const [first, second] = members
  const maxValue = Math.max(targetCents, points.at(-1)?.cumulativeTotal ?? 0) || 1
  const stepX = W / (points.length - 1)
  const plotHeight = H - PAD_TOP - PAD_BOTTOM

  const toY = (cents: number) => PAD_TOP + plotHeight - (cents / maxValue) * plotHeight
  const toX = (index: number) => index * stepX

  const lowerSeries = points.map((p, i) => [toX(i), toY(p.cumulativeByUser[first?.id ?? ''] ?? 0)] as const)
  const upperSeries = points.map((p, i) => [toX(i), toY(p.cumulativeTotal)] as const)

  const areaPath = (series: readonly (readonly [number, number])[], baseline: readonly (readonly [number, number])[] | null) => {
    const top = smoothPath(series)
    if (!baseline) return `${top} L ${W} ${toY(0)} L 0 ${toY(0)} Z`
    const bottom = smoothPath([...baseline].reverse())
    return `${top} L ${bottom.slice(2)} Z`
  }

  const targetY = toY(targetCents)
  const showTargetLine = targetCents <= maxValue && targetCents > 0

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução acumulada da meta">
        <defs>
          <linearGradient id={gradientMine} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mine)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--mine)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id={gradientHers} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hers)" stopOpacity="0.42" />
            <stop offset="100%" stopColor="var(--hers)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {showTargetLine && (
          <>
            <line
              x1="0"
              y1={targetY}
              x2={W}
              y2={targetY}
              stroke="var(--line)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <text x={W - 2} y={targetY - 5} textAnchor="end" className="fill-[var(--ink-3)] text-[8px]">
              objetivo
            </text>
          </>
        )}

        {second && (
          <motion.path
            d={areaPath(upperSeries, lowerSeries)}
            fill={`url(#${gradientHers})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          />
        )}
        <motion.path
          d={areaPath(lowerSeries, null)}
          fill={`url(#${gradientMine})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        />

        <motion.path
          d={smoothPath(upperSeries)}
          fill="none"
          stroke="var(--hers)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d={smoothPath(lowerSeries)}
          fill="none"
          stroke="var(--mine)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Ponto final: onde vocês estão agora. */}
        <motion.circle
          cx={W}
          cy={upperSeries.at(-1)?.[1] ?? 0}
          r="3.5"
          fill="var(--surface)"
          stroke="var(--hers)"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.05, type: 'spring', stiffness: 300, damping: 18 }}
        />

        {points.map((point, index) => {
          const isEdge = index === 0 || index === points.length - 1
          const isMiddle = points.length > 4 && index === Math.floor((points.length - 1) / 2)
          if (!isEdge && !isMiddle) return null
          return (
            <text
              key={point.key}
              x={Math.min(Math.max(toX(index), 8), W - 8)}
              y={H - 5}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              className="fill-[var(--ink-3)] text-[9px]"
            >
              {MONTH_SHORT[point.date.getMonth()]}
              {point.date.getMonth() === 0 || index === 0
                ? ` ${String(point.date.getFullYear()).slice(2)}`
                : ''}
            </text>
          )
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.75rem] text-ink-3">
        <span>
          {points.length} {points.length === 1 ? 'mês' : 'meses'} desde o primeiro registro
        </span>
        <span className="numeric">
          {formatCentsCompact(points.at(-1)?.cumulativeTotal ?? 0)} acumulados
        </span>
      </div>
    </div>
  )
}

/** Catmull-Rom convertido em Bézier: curva suave sem oscilar entre os pontos. */
function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return ''
  if (points.length < 3) return `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')}`

  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2

    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return path
}
