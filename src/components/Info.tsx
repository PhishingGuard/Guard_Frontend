import type { ReactNode } from 'react'
import { SWAGGER_URL } from '../api/client'
import { HOTLINES } from '../lib/format'
import { Icon } from './Icon'

// 지표 (KOSIS 표기): 이름 / 값 / 단위 / "○○ 기준"
export interface IndicatorItem {
  name: string
  value: ReactNode
  unit?: string
  basis?: string
}

export function Indicators({ items }: { items: IndicatorItem[] }) {
  return (
    <dl className="indicators">
      {items.map((it) => (
        <div key={it.name} className="indicator">
          <dt className="indicator-name">{it.name}</dt>
          <dd className="indicator-value">
            <b>{it.value}</b>
            {it.unit && <span className="indicator-unit">{it.unit}</span>}
          </dd>
          {it.basis && <dd className="indicator-basis">{it.basis}</dd>}
        </div>
      ))}
    </dl>
  )
}

// 알림 배너 (GOV.UK notification banner). 한 화면에 하나만 쓴다
export type BannerTone = 'information' | 'success' | 'warning' | 'danger'

export function Banner({
  tone = 'information',
  title,
  heading,
  children,
}: {
  tone?: BannerTone
  title: string
  heading?: ReactNode
  children?: ReactNode
}) {
  return (
    <section
      className={`banner tone-${tone}`}
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'region'}
      aria-label={title}
    >
      <p className="banner-title">{title}</p>
      <div className="banner-body">
        {heading && <p className="banner-heading">{heading}</p>}
        {children}
      </div>
    </section>
  )
}

// 키-값 요약 목록 (GOV.UK summary list)
export interface SummaryRow {
  key: string
  value: ReactNode
  emphasis?: 'danger' | 'warning'
}

export function SummaryList({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="summary-list">
      {rows.map((r) => (
        <div key={r.key} className={`summary-row${r.emphasis ? ` is-${r.emphasis}` : ''}`}>
          <dt>{r.key}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// 신고·상담 전화 목록 (결과·설정 화면 공용)
export function HotlineList() {
  return (
    <ul className="list">
      {HOTLINES.map((h) => (
        <li key={h.number}>
          <a className="list-item" href={`tel:${h.number}`}>
            <b className="hotline-number">{h.number}</b>
            <span className="list-main">
              <span className="list-title">{h.label}</span>
              <span className="list-sub">{h.desc}</span>
            </span>
            <span className="call-btn" aria-hidden="true">
              <Icon name="phone" size={18} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

// 정부24식 푸터 구성. 공식 배너·운영기관 표시는 넣지 않는다 (KRDS: 공식 서비스만 사용)
export function Footer() {
  return (
    <footer className="site-footer">
      <p className="footer-name">피싱 가드</p>
      <p>스미싱·피싱 문자 판별 서비스</p>
      <p>데이터: 경찰청, 한국인터넷진흥원(KISA) 공개 데이터</p>
      <ul className="footer-links">
        <li>
          <a href="#/settings">설정</a>
        </li>
        <li>
          <a href="#/report">문자 신고</a>
        </li>
        <li>
          <a href={SWAGGER_URL} target="_blank" rel="noreferrer noopener">
            API 문서
          </a>
        </li>
      </ul>
      <p className="footer-note">
        이 서비스는 정부 공식 서비스가 아닙니다. 화면은 대한민국 정부 디자인 시스템(KRDS)의 규칙을 참고해 만들었습니다.
      </p>
    </footer>
  )
}
