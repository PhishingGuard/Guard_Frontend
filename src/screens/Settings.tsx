import { useState } from 'react'
import { API_BASE, SWAGGER_URL, api } from '../api/client'
import { Icon } from '../components/Icon'
import { Footer, HotlineList, SummaryList } from '../components/Info'
import { PageHead, Section } from '../components/Layout'
import { REGIONS, formatBasis } from '../lib/format'
import { clearHistory, getHistory, getRegion, setRegion } from '../lib/storage'
import { useAsync } from '../lib/useAsync'

export function Settings() {
  const [region, setRegionState] = useState(getRegion() ?? '')
  const [historyCount, setHistoryCount] = useState(getHistory().length)
  const health = useAsync(async () => ({ body: await api.health(), at: new Date() }), [])

  const llm = health.data?.body.llm
  const serverStatus = health.loading ? '확인 중' : health.error ? '연결 안 됨' : '정상'

  return (
    <div className="screen">
      <PageHead title="설정" />

      <Section title="알림">
        <div className="field">
          <label className="field-label with-icon" htmlFor="region">
            <span className="icon-tile tone-blue small">
              <Icon name="pin" size={16} />
            </span>
            알림 받을 지역
          </label>
          <select
            id="region"
            className="input"
            value={region}
            onChange={(e) => {
              setRegionState(e.target.value)
              setRegion(e.target.value || null)
            }}
          >
            <option value="">선택 안 함</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className="field-hint">푸시 알림은 앱에서만 받을 수 있습니다. 웹에서는 주의보 화면에서 확인하세요.</p>
        </div>
      </Section>

      <Section title="신고·상담">
        <ul className="list">
          <li>
            <a className="list-item" href="#/report">
              <span className="icon-tile tone-red">
                <Icon name="flag" size={20} />
              </span>
              <span className="list-main">
                <span className="list-title">받은 문자 신고</span>
                <span className="list-sub">판별하지 않은 문자도 익명으로 신고할 수 있습니다.</span>
              </span>
              <Icon name="chevron" size={18} />
            </a>
          </li>
        </ul>
        <HotlineList />
      </Section>

      <Section title="내 기록">
        <div className="record-row">
          <span className="icon-tile tone-gray">
            <Icon name="clock" size={20} />
          </span>
          <span className="list-main">
            <span className="list-title">최근 판별 {historyCount.toLocaleString()}건</span>
            <span className="list-sub">이 기기에만 있습니다. 개인정보를 가린 문자만 보관합니다.</span>
          </span>
          <button
            type="button"
            className="chip-btn danger"
            disabled={historyCount === 0}
            onClick={() => {
              if (window.confirm('이 기기에 저장된 최근 판별 기록을 지우시겠습니까?')) {
                clearHistory()
                setHistoryCount(0)
              }
            }}
          >
            지우기
          </button>
        </div>
      </Section>

      <Section title="서비스 상태">
        <SummaryList
          rows={[
            {
              key: '서버',
              value: (
                <span className="status">
                  <span className={`status-dot is-${health.loading ? 'loading' : health.error ? 'down' : 'up'}`} aria-hidden="true" />
                  {serverStatus}
                </span>
              ),
              emphasis: health.error ? 'danger' : undefined,
            },
            {
              key: 'AI 설명',
              value: llm === undefined ? '-' : llm ? '사용 가능' : '고정 문장으로 대체 중',
              emphasis: llm === false ? 'warning' : undefined,
            },
            { key: '주소', value: <span className="mono-break">{API_BASE}</span> },
            { key: '확인 시점', value: health.data ? formatBasis(health.data.at) : '-' },
          ]}
        />
      </Section>

      <Section title="개발·운영">
        <ul className="list">
          <li>
            <a className="list-item" href={SWAGGER_URL} target="_blank" rel="noreferrer noopener">
              <span className="icon-tile tone-gray">
                <Icon name="doc" size={20} />
              </span>
              <span className="list-main">
                <span className="list-title">API 문서(Swagger)</span>
                <span className="list-sub">새 창에서 열립니다.</span>
              </span>
              <Icon name="external" size={18} />
            </a>
          </li>
          <li>
            <a className="list-item" href="#/admin">
              <span className="icon-tile tone-gray">
                <Icon name="lock" size={20} />
              </span>
              <span className="list-main">
                <span className="list-title">관리자</span>
                <span className="list-sub">신고 검수, 문서 등록, 데이터 관리</span>
              </span>
              <Icon name="chevron" size={18} />
            </a>
          </li>
        </ul>
      </Section>

      <Footer />
    </div>
  )
}
