import { useState } from 'react'
import { ApiError, api } from '../api/client'
import type { TrendName } from '../api/types'
import { BarList, DataTable, LineChart, type LinePoint } from '../components/Charts'
import { Indicators } from '../components/Info'
import { EmptyState, ErrorBox, PageHead, Spinner } from '../components/Layout'
import { RegionMap } from '../components/RegionMap'
import { formatBasis, formatNumber } from '../lib/format'
import { normalizeRegion } from '../lib/region'
import { useAsync, useSlowFlag } from '../lib/useAsync'

// GET /v1/trends/{name} — 대시보드 화면을 모바일 탭으로
const TABS: { name: TrendName; label: string; desc: string; source: string }[] = [
  {
    name: 'police',
    label: '유형 추세',
    desc: '연도별·유형별 발생 건수와 피해액입니다.',
    source: '경찰청 보이스피싱 현황',
  },
  {
    name: 'kisa',
    label: '피싱 주소 예보',
    desc: '피싱 사이트 주소의 일별 건수와 앞으로 4주 예측입니다.',
    source: '한국인터넷진흥원(KISA) 피싱 사이트 차단목록',
  },
  {
    name: 'regions',
    label: '지역',
    desc: '시도별 피해금액과 인구 10만 명당 피해입니다.',
    source: '경찰청 시도청별 피해금액, 시도별 인구',
  },
  {
    name: 'infra',
    label: '피싱 인프라',
    desc: '피싱 사이트와 정상 사이트의 도메인 나이, 국가, 인증서, 생존 기간을 비교합니다.',
    source: 'KISA 차단목록 주소와 이 서비스의 링크 조사 결과',
  },
  {
    name: 'topics',
    label: '수법',
    desc: '수법별 비중과 특징 단어, 주간 판별 건수입니다.',
    source: '이 서비스의 판별 기록, KorCCVi 데이터셋',
  },
]

export function Stats() {
  const [tab, setTab] = useState<TrendName>('police')
  const current = TABS.find((t) => t.name === tab)!

  return (
    <div className="screen">
      <PageHead title="통계" desc="공개 데이터와 이 서비스의 판별 기록을 분석한 결과입니다." />
      <div className="chip-tabs" role="tablist" aria-label="통계 종류">
        {TABS.map((t) => (
          <button
            key={t.name}
            type="button"
            role="tab"
            aria-selected={tab === t.name}
            className={tab === t.name ? 'is-on' : ''}
            onClick={() => setTab(t.name)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pad">
        <section className="card">
          <h2 className="section-title">{current.label}</h2>
          <p className="section-desc">{current.desc}</p>
          <TrendPanel key={tab} name={tab} source={current.source} />
        </section>
      </div>
    </div>
  )
}

function TrendPanel({ name, source }: { name: TrendName; source: string }) {
  const { data, error, loading, reload } = useAsync(() => api.trend(name), [name])
  const slow = useSlowFlag(loading)

  if (loading) return <Spinner label={slow ? '서버를 깨우는 중입니다…' : undefined} />
  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState icon="chart" title="분석 결과가 아직 없습니다">
          <p>데이터를 올리고 분석을 실행하면 이곳에 표시됩니다.</p>
        </EmptyState>
      )
    }
    return <ErrorBox message={error.message} onRetry={reload} />
  }
  if (!data) return null

  const basis = formatBasis(data.computed_at)
  return (
    <div className="stack-lg">
      <h3 className="sub-heading">{data.title}</h3>
      <PayloadView value={data.payload} depth={0} basis={basis} />
      {/* 출처와 완전성 경고는 화면 아래에 한 번만 (planning.data 방식) */}
      <div className="data-note">
        <p>출처: {source}</p>
        <p>{basis}. 데이터가 완전하지 않을 수 있습니다.</p>
      </div>
    </div>
  )
}

// ---- 구조를 모르는 분석 결과를 모양에 따라 그리기 ----

type Row = Record<string, unknown>

const KEY_LABELS: Record<string, string> = {
  year: '연도', date: '날짜', week: '주', week_start: '주 시작', month: '월', day: '날짜',
  count: '건수', cases: '발생 건수', amount: '금액', damage: '피해액', damage_amount: '피해액',
  per_case: '건당 피해액', region: '지역', level: '단계', population: '인구',
  per_100k: '10만 명당', category: '수법', topic: '토픽', share: '비중', ratio: '비율',
  forecast: '예측', yhat: '예측', lower: '하한', upper: '상한', ma7: '7일 평균',
  tld: '최상위 도메인(TLD)', country: '국가', domain_age_days: '도메인 나이', words: '특징 단어',
}

// 이름만으로 단위를 확신할 수 있는 것만
const KEY_UNITS: [RegExp, string][] = [
  [/(^|_)(count|cases|n)$/i, '건'],
  [/_days$|^days$/i, '일'],
]

const label = (key: string) => KEY_LABELS[key] ?? key.replace(/_/g, ' ')
const unitOf = (key: string) => KEY_UNITS.find(([re]) => re.test(key))?.[1]

const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isScalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v)

const TIME_KEY = /(^|_)(date|day|week|month|year|ds|time|period)(_|$)|날짜|연도|주$|월$/i
const TIME_VALUE = /^\d{4}(-\d{1,2}(-\d{1,2})?)?(T.*)?$/
const LOW_KEY = /(^|_)(lower|low|lo|min)(_|$)/i
const HIGH_KEY = /(^|_)(upper|high|hi|max)(_|$)/i
const LEVEL_KEY = /(^|_)level$/i

function scalarText(v: unknown) {
  if (isNum(v)) return formatNumber(v)
  if (typeof v === 'boolean') return v ? '예' : '아니요'
  if (v === null) return '-'
  return String(v)
}

function PayloadView({ value, depth, basis }: { value: unknown; depth: number; basis: string }) {
  if (Array.isArray(value)) return <ArrayView items={value} />
  if (!isObj(value)) return <p>{scalarText(value)}</p>

  const entries = Object.entries(value)
  // { 서울: 12, 부산: 8 } 같은 숫자 맵은 막대로
  if (entries.length >= 2 && entries.every(([, v]) => isNum(v)) && depth > 0) {
    return <BarList items={entries.map(([k, v]) => ({ label: k, value: v as number }))} />
  }

  const scalars = entries.filter(([, v]) => isScalar(v))
  const blocks = entries.filter(([, v]) => !isScalar(v))

  return (
    <div className="stack-lg">
      {scalars.length > 0 && (
        <Indicators
          items={scalars.map(([k, v]) => ({
            name: label(k),
            value: scalarText(v),
            unit: isNum(v) ? unitOf(k) : undefined,
            basis,
          }))}
        />
      )}
      {blocks.map(([k, v]) => (
        <section key={k} className={depth === 0 ? 'chart-block' : 'sub-block'}>
          <h3 className="sub-heading">{label(k)}</h3>
          {depth < 3 ? (
            <PayloadView value={v} depth={depth + 1} basis={basis} />
          ) : (
            <pre className="json">{JSON.stringify(v, null, 2)}</pre>
          )}
        </section>
      ))}
    </div>
  )
}

function ArrayView({ items }: { items: unknown[] }) {
  if (items.length === 0) return <p className="field-hint">데이터가 없습니다.</p>
  if (items.every(isNum)) {
    return <LineChart points={items.map((v, i) => ({ label: String(i + 1), value: v }))} />
  }
  if (items.every((v) => typeof v === 'string')) {
    return (
      <ul className="row-tags wrap">
        {items.map((s, i) => (
          <li key={i} className="tag">
            {s as string}
          </li>
        ))}
      </ul>
    )
  }
  if (items.every(isObj)) return <RowsView rows={items} />
  return <pre className="json">{JSON.stringify(items, null, 2)}</pre>
}

function RowsView({ rows }: { rows: Row[] }) {
  const columns = Array.from(new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r))))
  const numericKeys = columns.filter((c) => rows.every((r) => r[c] == null || isNum(r[c])) && rows.some((r) => isNum(r[c])))
  const labelKey =
    columns.find((c) => TIME_KEY.test(c)) ??
    columns.find((c) => !numericKeys.includes(c) && rows.every((r) => typeof r[c] === 'string')) ??
    null
  const timeLike =
    !!labelKey && (TIME_KEY.test(labelKey) || rows.every((r) => TIME_VALUE.test(String(r[labelKey] ?? ''))))
  const lowKey = numericKeys.find((k) => LOW_KEY.test(k))
  const highKey = numericKeys.find((k) => HIGH_KEY.test(k))
  const levelKey = numericKeys.find((k) => LEVEL_KEY.test(k))
  const measures = numericKeys.filter((k) => k !== labelKey && k !== lowKey && k !== highKey && k !== levelKey)

  // 행 이름이 시도라면 지도로 (17개 중 8개 이상 알아볼 때)
  const regionRows =
    labelKey && !timeLike ? rows.filter((r) => normalizeRegion(String(r[labelKey] ?? '')) !== null) : []
  const isRegional = regionRows.length >= 8

  const [measure, setMeasure] = useState(measures[0])
  const [asTable, setAsTable] = useState(measures.length === 0)

  const rowLabel = (r: Row, i: number) => (labelKey ? String(r[labelKey] ?? '') : String(i + 1))

  return (
    <div className="stack">
      {measures.length > 0 && (
        <div className="chart-tools">
          {measures.length > 1 && !asTable && (
            <div className="segmented scroll" role="radiogroup" aria-label="보여 줄 값">
              {measures.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={m === measure}
                  className={m === measure ? 'is-on' : ''}
                  onClick={() => setMeasure(m)}
                >
                  {label(m)}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="link-btn push-right" onClick={() => setAsTable((t) => !t)}>
            {asTable ? '그림으로 보기' : '표로 보기'}
          </button>
        </div>
      )}

      {asTable || !measure ? (
        <DataTable columns={columns} rows={rows} label={label} />
      ) : timeLike && rows.length >= 4 ? (
        <LineChart
          unit={unitOf(measure)}
          points={rows.map<LinePoint>((r, i) => ({
            label: rowLabel(r, i),
            value: isNum(r[measure]) ? (r[measure] as number) : null,
            low: lowKey && isNum(r[lowKey]) ? (r[lowKey] as number) : null,
            high: highKey && isNum(r[highKey]) ? (r[highKey] as number) : null,
          }))}
        />
      ) : isRegional && labelKey ? (
        <RegionMap
          measureLabel={label(measure)}
          items={regionRows.map((r) => ({
            name: String(r[labelKey]),
            value: isNum(r[measure]) ? (r[measure] as number) : 0,
            // 서버 단계(level)는 서버가 고른 기준 값에 대한 것이라, 첫 번째 값을 볼 때만 쓴다
            level: levelKey && measure === measures[0] && isNum(r[levelKey]) ? (r[levelKey] as number) : undefined,
          }))}
        />
      ) : (
        <BarList
          unit={unitOf(measure)}
          items={rows
            .map((r, i) => ({ label: rowLabel(r, i), value: isNum(r[measure]) ? (r[measure] as number) : 0 }))
            .sort((a, b) => (timeLike ? 0 : b.value - a.value))}
        />
      )}
    </div>
  )
}
