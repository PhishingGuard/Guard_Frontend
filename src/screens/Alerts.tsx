import { useState } from 'react'
import { api } from '../api/client'
import type { AlertOut } from '../api/types'
import { Icon } from '../components/Icon'
import { SummaryList } from '../components/Info'
import { EmptyState, ErrorBox, PageHead, Spinner, TopBar } from '../components/Layout'
import { formatBasis, formatDate, formatDateTime } from '../lib/format'
import { useAsync, useSlowFlag } from '../lib/useAsync'

type Filter = 'active' | 'all'

export function Alerts() {
  // 한 번에 받아 화면에서 나눈다. 필터 옆 건수(서울 열린데이터광장식)를 함께 보여 주기 위해서
  const { data, error, loading, reload } = useAsync(async () => ({ list: await api.alerts(false, 100), at: new Date() }), [])
  const [filter, setFilter] = useState<Filter>('active')
  const slow = useSlowFlag(loading)

  const all = data?.list ?? []
  const active = all.filter((a) => a.active)
  const shown = filter === 'active' ? active : all

  return (
    <div className="screen">
      <PageHead title="주의보" desc="이번 주 판별 기록에서 평소보다 크게 늘어난 수법을 알립니다." />
      <div className="pad">
        <div className="pill-tabs" role="tablist" aria-label="주의보 범위">
          {(
            [
              ['active', '발령 중', active.length],
              ['all', '전체', all.length],
            ] as const
          ).map(([key, text, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? 'is-on' : ''}
              onClick={() => setFilter(key)}
            >
              {text}
              {data && `(${count.toLocaleString()})`}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <Spinner label={slow ? '서버를 깨우는 중입니다…' : undefined} />
          ) : error ? (
            <ErrorBox message={error.message} onRetry={reload} />
          ) : shown.length === 0 ? (
            <EmptyState icon="bell" title={filter === 'active' ? '발령 중인 주의보가 없습니다' : '주의보 기록이 없습니다'}>
              <p>특정 수법이 갑자기 늘면 이곳에 알립니다.</p>
            </EmptyState>
          ) : (
            <ul className="list">
              {shown.map((a) => (
                <li key={a.id}>
                  <AlertRow alert={a} />
                </li>
              ))}
            </ul>
          )}
        </div>
        {data && <p className="basis-line">{formatBasis(data.at)}</p>}
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: AlertOut }) {
  return (
    <a className="list-item alert-row" href={`#/alerts/${alert.id}`}>
      <span className={`icon-tile ${alert.active ? 'tone-red' : 'tone-gray'}`}>
        <Icon name="bell" size={20} />
      </span>
      <span className="list-main">
        <span className="row-tags">
          <span className={`tag ${alert.active ? 'tone-danger' : ''}`}>{alert.active ? '발령 중' : '종료'}</span>
          <span className="tag">{alert.topic}</span>
        </span>
        <span className="list-title">{alert.title}</span>
        <span className="list-sub">
          {formatDate(alert.week_start)} 주 · {alert.count.toLocaleString()}건 확인
        </span>
      </span>
      <Icon name="chevron" size={18} />
    </a>
  )
}

// 이번 주 건수와 주의보 기준(예측 상한)을 같은 축에 놓는다
function CountBar({ count, threshold }: { count: number; threshold: number }) {
  const max = Math.max(count, threshold) * 1.15 || 1
  return (
    <div className="countbar" aria-hidden="true">
      <div className="countbar-track">
        <div className="countbar-fill" style={{ width: `${(count / max) * 100}%` }} />
        <span className="countbar-mark" style={{ left: `${(threshold / max) * 100}%` }} />
      </div>
      <div className="countbar-legend">
        <span>이번 주 {count.toLocaleString()}건</span>
        <span>발령 기준 {Math.round(threshold).toLocaleString()}건</span>
      </div>
    </div>
  )
}

export function AlertDetail({ id }: { id: number }) {
  // 단건 조회 API가 없어 목록에서 찾는다
  const { data, error, loading, reload } = useAsync(() => api.alerts(false, 100), [])
  const alert = data?.find((a) => a.id === id)

  return (
    <div className="screen">
      <TopBar title="주의보" back="/alerts" />
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="pad top-gap">
          <ErrorBox message={error.message} onRetry={reload} />
        </div>
      ) : !alert ? (
        <EmptyState icon="bell" title="주의보를 찾을 수 없습니다" />
      ) : (
        <article>
          <div className="page-head">
            <span className={`tag ${alert.active ? 'tone-danger' : ''}`}>{alert.active ? '발령 중' : '종료'}</span>
            <h1>{alert.title}</h1>
          </div>
          <div className="pad stack">
            <div className="card">
              <SummaryList
              rows={[
                { key: '수법', value: alert.topic },
                { key: '기준 주', value: `${formatDate(alert.week_start)} 주` },
                { key: '이번 주 건수', value: `${alert.count.toLocaleString()}건`, emphasis: 'danger' },
                { key: '발령 기준', value: `${Math.round(alert.threshold).toLocaleString()}건 (예측 상한)` },
                { key: '발령 일시', value: formatDateTime(alert.created_at) },
              ]}
              />
              <CountBar count={alert.count} threshold={alert.threshold} />
            </div>
            <div className="card body-text">{alert.body}</div>
            <a className="primary-btn" href="#/">
              받은 문자 확인하기
            </a>
          </div>
        </article>
      )}
    </div>
  )
}
