import type { Verdict } from '../api/types'
import { VERDICT_META } from '../lib/format'
import { Icon } from './Icon'

export function VerdictBadge({ verdict, score, compact }: { verdict: Verdict; score?: number; compact?: boolean }) {
  const meta = VERDICT_META[verdict]
  return (
    <span className={`verdict-badge tone-${meta.tone}${compact ? ' is-compact' : ''}`}>
      <Icon name={meta.icon} size={compact ? 14 : 16} />
      {meta.label}
      {score !== undefined && !compact && <b>{score}</b>}
    </span>
  )
}

// 0~100 위험도 막대. 40(주의)·70(위험) 기준선을 함께 그린다
export function ScoreMeter({ score, verdict }: { score: number; verdict: Verdict }) {
  const tone = VERDICT_META[verdict].tone
  const clamped = Math.max(0, Math.min(100, score))
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label="위험도">
      <div className="meter-track">
        <div className={`meter-fill tone-${tone}`} style={{ width: `${clamped}%` }} />
        <span className="meter-tick" style={{ left: '40%' }} />
        <span className="meter-tick" style={{ left: '70%' }} />
      </div>
      <div className="meter-scale" aria-hidden="true">
        <span style={{ left: 0 }}>0</span>
        <span style={{ left: '40%' }}>주의 40</span>
        <span style={{ left: '70%' }}>위험 70</span>
        <span style={{ right: 0 }}>100</span>
      </div>
    </div>
  )
}
