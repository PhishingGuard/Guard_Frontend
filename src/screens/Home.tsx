import { useState } from 'react'
import { api } from '../api/client'
import type { Channel } from '../api/types'
import { Icon } from '../components/Icon'
import { Banner, Footer, Indicators } from '../components/Info'
import { Section } from '../components/Layout'
import { VerdictBadge } from '../components/Verdict'
import { setPendingRequest } from '../lib/checkStore'
import { CHANNELS, formatBasis, formatRelative } from '../lib/format'
import { navigate } from '../lib/router'
import { getHistory } from '../lib/storage'
import { useAsync } from '../lib/useAsync'

const MAX_LEN = 2000

const SAMPLES = [
  { label: '건강검진 안내', text: '[국민건강보험] 홍길동님 건강검진 결과 확인 http://bit.ly/abcd 문의 010-1234-5678' },
  { label: '택배 주소 수정', text: '[CJ대한통운] 고객님 택배가 주소 불일치로 보관 중입니다. 주소 수정: http://cj-delivery.top/kr' },
  { label: '가족 사칭', text: '엄마 나 폰 액정 깨져서 임시폰이야. 급하게 상품권 결제할 게 있는데 카톡으로 연락 줘' },
  { label: '병원 예약 안내', text: '[우리동네 치과] 내일 오후 3시 진료 예약 안내드립니다. 변경은 02-123-4567로 연락 주세요.' },
]

export function Home() {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState<Channel>('sms')
  const [pasteError, setPasteError] = useState<string>()
  const alerts = useAsync(async () => ({ list: await api.alerts(true, 100), at: new Date() }), [])
  const history = getHistory()

  const trimmed = text.trim()
  const canSubmit = trimmed.length > 0 && text.length <= MAX_LEN
  const topAlert = alerts.data?.list[0]
  const riskyCount = history.filter((h) => h.verdict !== 'safe').length

  const submit = () => {
    if (!canSubmit) return
    setPendingRequest({ text: trimmed, channel })
    navigate('/checking')
  }

  const paste = async () => {
    setPasteError(undefined)
    try {
      const clip = await navigator.clipboard.readText()
      if (clip) setText(clip.slice(0, MAX_LEN))
      else setPasteError('클립보드가 비어 있습니다.')
    } catch {
      setPasteError('붙여넣기 권한이 없습니다. 입력 칸을 길게 눌러 붙여 넣으세요.')
    }
  }

  return (
    <div className="screen">
      <header className="site-header">
        <span className="brand">
          <Icon name="shield" size={22} />
          피싱 가드
        </span>
        <a className="header-link" href="#/alerts">
          주의보
        </a>
      </header>

      <div className="page-head">
        <h1>받은 문자 확인</h1>
        <p>문자를 붙여 넣으면 사기 위험도와 지금 할 일을 알려 드립니다.</p>
      </div>

      {topAlert && (
        <div className="pad block-gap">
          <Banner tone="danger" title="주의보" heading={topAlert.title}>
            <p>
              {topAlert.topic} 수법 문자가 이번 주 {topAlert.count.toLocaleString()}건 확인되었습니다.{' '}
              <a href={`#/alerts/${topAlert.id}`}>자세히 보기</a>
            </p>
          </Banner>
        </div>
      )}

      <div className="pad block-gap">
        <Indicators
          items={[
            {
              name: '발령 중인 주의보',
              value: alerts.loading ? '…' : alerts.error ? '-' : (alerts.data?.list.length ?? 0).toLocaleString(),
              unit: '건',
              basis: alerts.data ? formatBasis(alerts.data.at) : alerts.error ? '불러오지 못함' : '불러오는 중',
            },
            { name: '이 기기에서 확인한 문자', value: history.length.toLocaleString(), unit: '건', basis: '최근 20건 기준' },
            { name: '그중 주의·위험', value: riskyCount.toLocaleString(), unit: '건', basis: '최근 20건 기준' },
          ]}
        />
      </div>

      <form
        className="pad form block-gap"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <fieldset className="field">
          <legend className="field-label">받은 곳</legend>
          <div className="choice-group">
            {CHANNELS.map((c) => (
              <label key={c.value} className={`choice${channel === c.value ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  name="channel"
                  value={c.value}
                  checked={channel === c.value}
                  onChange={() => setChannel(c.value)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field-label" htmlFor="message">
            받은 문자
          </label>
          <p className="field-hint" id="message-hint">
            전화번호, 계좌번호, 주민등록번호, 이름은 서버에서 가린 뒤 저장합니다.
          </p>
          <textarea
            id="message"
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={MAX_LEN}
            aria-describedby="message-hint message-count"
          />
          <div className="input-foot">
            <button type="button" className="tertiary-btn" onClick={paste}>
              <Icon name="clipboard" size={16} />
              붙여넣기
            </button>
            {text && (
              <button type="button" className="tertiary-btn" onClick={() => setText('')}>
                지우기
              </button>
            )}
            <span className="counter" id="message-count">
              {text.length.toLocaleString()}/{MAX_LEN.toLocaleString()}자
            </span>
          </div>
          {pasteError && <p className="field-error">{pasteError}</p>}
        </div>

        <button type="submit" className="primary-btn" disabled={!canSubmit}>
          확인하기
        </button>
      </form>

      <Section title="예시 문자로 해 보기">
        <ul className="link-list">
          {SAMPLES.map((s) => (
            <li key={s.label}>
              <button type="button" className="link-row" onClick={() => setText(s.text)}>
                {s.label}
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {history.length > 0 && (
        <Section
          title="최근 확인한 문자"
          action={
            <a className="link-btn" href="#/settings">
              기록 관리
            </a>
          }
        >
          <ul className="list">
            {history.slice(0, 5).map((h) => (
              <li key={h.checkId}>
                <a className="list-item" href={`#/result/${h.checkId}`}>
                  <span className="list-main">
                    <span className="list-title ellipsis">{h.preview}</span>
                    <span className="list-sub">
                      {h.categoryLabel} · {formatRelative(h.at)}
                    </span>
                  </span>
                  <VerdictBadge verdict={h.verdict} score={h.score} />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Footer />
    </div>
  )
}
