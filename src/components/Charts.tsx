import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { formatNumber } from '../lib/format'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function niceMax(v: number) {
  if (v <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp
}

function compact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e8) return `${formatNumber(n / 1e8)}억`
  if (abs >= 1e4) return `${formatNumber(n / 1e4)}만`
  return formatNumber(n)
}

export interface LinePoint {
  label: string
  value: number | null
  low?: number | null
  high?: number | null
}

// 단일 계열 꺾은선. low/high가 있으면 구간(예측 범위)을 옅게 깐다. 손가락으로 훑으면 값이 뜬다
export function LineChart({ points, unit }: { points: LinePoint[]; unit?: string }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 190
  const pad = { l: 44, r: 12, t: 12, b: 26 }
  const innerW = Math.max(10, width - pad.l - pad.r)
  const innerH = H - pad.t - pad.b

  const { yMin, yMax } = useMemo(() => {
    const vals = points.flatMap((p) => [p.value, p.low, p.high]).filter((v): v is number => typeof v === 'number')
    const min = Math.min(0, ...vals)
    return { yMin: min, yMax: niceMax(Math.max(...vals, 0) - min) + min }
  }, [points])

  const x = (i: number) => pad.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => pad.t + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH

  const path = (get: (p: LinePoint) => number | null | undefined) => {
    let d = ''
    let pen = false
    points.forEach((p, i) => {
      const v = get(p)
      if (typeof v !== 'number') {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    return d
  }

  const hasBand = points.some((p) => typeof p.low === 'number' && typeof p.high === 'number')
  const band = hasBand
    ? (() => {
        const idx = points.map((p, i) => (typeof p.low === 'number' && typeof p.high === 'number' ? i : -1)).filter((i) => i >= 0)
        const top = idx.map((i) => `${x(i).toFixed(1)},${y(points[i].high as number).toFixed(1)}`)
        const bottom = idx.reverse().map((i) => `${x(i).toFixed(1)},${y(points[i].low as number).toFixed(1)}`)
        return `M${top.join('L')}L${bottom.join('L')}Z`
      })()
    : ''

  const ticks = [0, 0.5, 1].map((f) => yMin + (yMax - yMin) * f)
  const xLabels = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i)

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left - pad.l
    const i = Math.round((px / innerW) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  const hp = hover !== null ? points[hover] : null

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`꺾은선 차트, ${points.length}개 값`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {compact(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} className="axis" x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
            {points[i].label}
          </text>
        ))}
        {band && <path className="band" d={band} />}
        <path className="line" d={path((p) => p.value)} />
        {hp && hover !== null && (
          <g>
            <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} />
            {typeof hp.value === 'number' && <circle className="dot" cx={x(hover)} cy={y(hp.value)} r={4.5} />}
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <div
          className="tooltip"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: 0 }}
        >
          <span className="muted">{hp.label}</span>
          <b>
            {typeof hp.value === 'number' ? formatNumber(hp.value) : '-'}
            {unit}
          </b>
          {typeof hp.low === 'number' && typeof hp.high === 'number' && (
            <span className="muted">
              범위 {formatNumber(hp.low)}~{formatNumber(hp.high)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export interface BarItem {
  label: string
  value: number
}

// 항목별 크기 비교용 가로 막대. 이름이 길어도 잘 읽히고 좁은 화면에 맞다
export function BarList({ items, unit, limit = 10 }: { items: BarItem[]; unit?: string; limit?: number }) {
  const [all, setAll] = useState(false)
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 0) || 1
  const shown = all ? items : items.slice(0, limit)
  return (
    <div className="barlist">
      {shown.map((it, i) => (
        <div key={`${it.label}-${i}`} className="bar-row" title={`${it.label}: ${formatNumber(it.value)}${unit ?? ''}`}>
          <span className="bar-label">{it.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(Math.abs(it.value) / max) * 100}%` }} />
          </span>
          <span className="bar-value">
            {compact(it.value)}
            {unit}
          </span>
        </div>
      ))}
      {items.length > limit && (
        <button type="button" className="link-btn" onClick={() => setAll((a) => !a)}>
          {all ? '접기' : `${items.length - limit}개 더 보기`}
        </button>
      )}
    </div>
  )
}

// 표: 숫자 열은 오른쪽 정렬 (GOV.UK 표 규칙)
export function DataTable({
  columns,
  rows,
  label = (c) => c,
}: {
  columns: string[]
  rows: Record<string, unknown>[]
  label?: (column: string) => string
}) {
  const numeric = new Set(columns.filter((c) => rows.some((r) => typeof r[c] === 'number') && rows.every((r) => r[c] == null || typeof r[c] === 'number')))
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className={numeric.has(c) ? 'num' : undefined}>
                {label(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const v = r[c]
                return (
                  <td key={c} className={numeric.has(c) ? 'num' : undefined}>
                    {typeof v === 'number' ? formatNumber(v) : v == null ? '' : String(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
