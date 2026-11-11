import type { ReactNode } from 'react'
import { goBack, navigate } from '../lib/router'
import { Icon, type IconName } from './Icon'

export function TopBar({ title, back, right }: { title: ReactNode; back?: boolean | string; right?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <button
          type="button"
          className="icon-btn"
          aria-label="뒤로"
          onClick={() => goBack(typeof back === 'string' ? back : '/')}
        >
          <Icon name="back" size={24} />
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <span className="topbar-right">{right}</span>
    </header>
  )
}

const TABS: { key: string; path: string; label: string; icon: IconName }[] = [
  { key: '', path: '/', label: '홈', icon: 'home' },
  { key: 'alerts', path: '/alerts', label: '주의보', icon: 'bell' },
  { key: 'stats', path: '/stats', label: '통계', icon: 'chart' },
  { key: 'ask', path: '/ask', label: '물어보기', icon: 'chat' },
  { key: 'settings', path: '/settings', label: '설정', icon: 'settings' },
]

export function TabBar({ active }: { active: string }) {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`tab${active === t.key ? ' is-active' : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
          onClick={() => navigate(t.path)}
        >
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

// 탭 첫 화면의 큰 제목 (가운데 제목 줄 대신)
export function PageHead({ title, desc, right }: { title: ReactNode; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-head is-large">
      <div className="page-head-row">
        <h1>{title}</h1>
        {right}
      </div>
      {desc && <p>{desc}</p>}
    </div>
  )
}

// 흰 카드 구역. plain이면 카드 없이 회색 바탕에 제목만 둔다 (가로 스크롤 목록 등)
export function Section({
  title,
  action,
  plain,
  children,
}: {
  title?: ReactNode
  action?: ReactNode
  plain?: boolean
  children: ReactNode
}) {
  return (
    <section className={plain ? 'section is-plain' : 'section'}>
      {(title || action) && (
        <div className="section-head">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      {label && <span>{label}</span>}
    </div>
  )
}

export function EmptyState({ icon = 'shield', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="link-btn" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}
