import { useState } from 'react'
import { formatNumber } from '../lib/format'
import { normalizeRegion, TILES } from '../lib/region'

// KRDS primary 단계로 만든 5단계 순차 색 (낮음 → 높음)
const STEPS = ['var(--primary-10)', 'var(--primary-20)', 'var(--primary-40)', 'var(--primary-60)', 'var(--primary-80)']

export interface RegionValue {
  name: string // 원래 이름 (경기남부 등)
  value: number
  level?: number // 1~5. 서버가 준 지도 색 단계가 있으면 그대로 쓴다
}

export function RegionMap({ items, measureLabel }: { items: RegionValue[]; measureLabel: string }) {
  const [selected, setSelected] = useState<RegionValue | null>(null)

  // 서버 단계가 없으면 값 순서로 5등분
  const sorted = [...items].sort((a, b) => a.value - b.value)
  const levelOf = (it: RegionValue) => {
    if (it.level && it.level >= 1 && it.level <= 5) return Math.round(it.level)
    const rank = sorted.indexOf(it)
    return Math.min(5, Math.floor((rank / Math.max(1, sorted.length)) * 5) + 1)
  }

  // 한 시도에 여러 행(경기남부·경기북부)이 있으면 타일을 나눠 각각 칠한다
  const byTile = new Map<string, RegionValue[]>()
  for (const it of items) {
    const key = normalizeRegion(it.name)
    if (!key) continue
    byTile.set(key, [...(byTile.get(key) ?? []), it])
  }

  return (
    <div className="region-map">
      <div className="tile-grid" role="group" aria-label={`시도별 ${measureLabel} 지도`}>
        {Object.entries(TILES).map(([region, [col, row]]) => {
          const parts = byTile.get(region) ?? []
          return (
            <div key={region} className="tile" style={{ gridColumn: col + 1, gridRow: row + 1 }}>
              {parts.length === 0 ? (
                <span className="tile-part is-empty" title={`${region}: 자료 없음`}>
                  <span className="tile-name">{region}</span>
                </span>
              ) : (
                parts.map((p) => {
                  const level = levelOf(p)
                  return (
                    <button
                      key={p.name}
                      type="button"
                      className={`tile-part${level >= 3 ? ' is-dark' : ''}${selected === p ? ' is-selected' : ''}`}
                      style={{ background: STEPS[level - 1] }}
                      aria-label={`${p.name} ${formatNumber(p.value)}, ${level}단계`}
                      onClick={() => setSelected(selected === p ? null : p)}
                    >
                      <span className="tile-name">
                        {parts.length > 1 ? p.name.replace(region, '').replace(/청$/, '') || region : region}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      <div className="map-legend" aria-hidden="true">
        <span>낮음</span>
        {STEPS.map((c, i) => (
          <span key={c} className="legend-swatch" style={{ background: c }} title={`${i + 1}단계`} />
        ))}
        <span>높음</span>
      </div>

      <p className="map-readout" aria-live="polite">
        {selected ? (
          <>
            <b>{selected.name}</b> {measureLabel} {formatNumber(selected.value)}
          </>
        ) : (
          '지역을 누르면 값을 보여 줍니다.'
        )}
      </p>
    </div>
  )
}
