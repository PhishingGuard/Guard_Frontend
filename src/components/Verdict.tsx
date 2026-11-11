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

// 결과 화면 맨 위 판정 카드. 화면에서 가장 눈에 띄는 요소는 이것 하나만 둔다
export function VerdictHero({ verdict, score, category }: { verdict: Verdict; score: number; category: string }) {
  const meta = VERDICT_META[verdict]
  return (
    <section className={`verdict-hero tone-${meta.tone}`} role={verdict === 'safe' ? 'region' : 'alert'} aria-label="판별 결과">
      <div className="verdict-hero-top">
        <span className="verdict-hero-icon">
          <Icon name={meta.icon} size={26} />
        </span>
        <div className="verdict-hero-text">
          <p className="verdict-hero-label">
            {meta.label}
            <span className="verdict-hero-cat">{category}</span>
          </p>
          <h2>{meta.headline}</h2>
        </div>
      </div>
      <div className="verdict-hero-score">
        <span>위험도</span>
        <b>{score}</b>
        <span>/ 100점</span>
      </div>
      <ScoreMeter score={score} verdict={verdict} />
    </section>
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
