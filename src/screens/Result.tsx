import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { CheckResponse, UrlOut } from '../api/types'
import { CitedText, SourceList } from '../components/Cited'
import { Icon } from '../components/Icon'
import { Banner, SummaryList, type SummaryRow } from '../components/Info'
import { EmptyState, ErrorBox, Section, Spinner, TopBar } from '../components/Layout'
import { ScoreMeter } from '../components/Verdict'
import { cacheResult, getCachedResult, LOCAL_ID } from '../lib/checkStore'
import { formatDomainAge, formatNumber, HOTLINES, VERDICT_META } from '../lib/format'
import { navigate } from '../lib/router'
import { scrollToSource } from '../lib/scroll'
import { useSlowFlag } from '../lib/useAsync'

const POLL_INTERVAL = 1500
const POLL_LIMIT = 8 // 약 12초. 서버 설명은 최대 약 8초

// 서버 timings 키 → 처리 단계 이름 (/v1/check 설명 순서)
const TIMING_LABELS: Record<string, string> = {
  mask: '개인정보 가리기',
  parallel: '문장 분류·링크 조사·차단목록 대조',
  score: '점수 합치기',
  rag: '참고 문서 검색',
  explain: '설명 작성',
  save: '저장',
}

export function Result({ id }: { id: string }) {
  const [data, setData] = useState<CheckResponse | undefined>(() => getCachedResult(id))
  const [error, setError] = useState<string>()
  const [tick, setTick] = useState(0)
  const [pollGaveUp, setPollGaveUp] = useState(false)
  const slow = useSlowFlag(!data && !error)

  // 캐시에 없으면(새로고침·기록에서 열기) 서버에서 다시 받는다
  useEffect(() => {
    if (data || id === LOCAL_ID) return
    const ctrl = new AbortController()
    api.getCheck(id, ctrl.signal).then(
      (res) => {
        cacheResult(res)
        setData(res)
      },
      (e: Error) => {
        if (e.name !== 'AbortError') setError(e.message)
      },
    )
    return () => ctrl.abort()
  }, [id, data, tick])

  // AI 설명을 쓰는 중이면 잠시 뒤 다시 받아 교체
  const pending = !!data?.explanation_pending && !!data.check_id
  useEffect(() => {
    if (!pending || !data?.check_id) return
    let count = 0
    let alive = true
    const checkId = data.check_id
    const timer = setInterval(async () => {
      count += 1
      try {
        const next = await api.getCheck(checkId)
        if (!alive) return
        if (!next.explanation_pending) {
          cacheResult(next)
          setData(next)
          clearInterval(timer)
          return
        }
      } catch {
        // 다음 차례에 다시
      }
      if (count >= POLL_LIMIT) {
        clearInterval(timer)
        if (alive) setPollGaveUp(true)
      }
    }, POLL_INTERVAL)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [pending, data?.check_id])

  if (!data) {
    return (
      <div className="screen">
        <TopBar title="판별 결과" back />
        {id === LOCAL_ID ? (
          <EmptyState title="결과가 저장되지 않았습니다">
            <p>저장에 실패한 결과는 다시 볼 수 없습니다. 문자를 다시 확인해 주세요.</p>
            <button type="button" className="primary-btn" onClick={() => navigate('/', { replace: true })}>
              처음으로
            </button>
          </EmptyState>
        ) : error ? (
          <div className="pad top-gap">
            <ErrorBox
              message={error}
              onRetry={() => {
                setError(undefined)
                setTick((t) => t + 1)
              }}
            />
          </div>
        ) : (
          <Spinner label={slow ? '서버를 깨우는 중입니다…' : '결과를 불러오는 중입니다'} />
        )}
      </div>
    )
  }

  const meta = VERDICT_META[data.verdict]
  const showPending = pending && !pollGaveUp
  const blocklisted = data.urls.filter((u) => u.blocklisted).length

  const summary: SummaryRow[] = [
    { key: '판정', value: meta.label, emphasis: data.verdict === 'danger' ? 'danger' : data.verdict === 'suspicious' ? 'warning' : undefined },
    { key: '위험도', value: `100점 만점에 ${data.score}점` },
    { key: '수법', value: data.category_label },
    { key: '링크', value: data.urls.length ? `${data.urls.length}개 조사` : '없음' },
  ]
  if (blocklisted) summary.push({ key: '차단목록 링크', value: `${blocklisted}개`, emphasis: 'danger' })
  summary.push(
    { key: '설명 작성', value: data.explanation_source === 'llm' ? 'AI 생성' : '고정 문장' },
    { key: '처리 시간', value: `${(data.elapsed_ms / 1000).toFixed(1)}초` },
  )

  return (
    <div className="screen has-bottom-bar">
      <TopBar title="판별 결과" back />

      <div className="pad top-gap">
        <Banner tone={meta.banner} title="판별 결과" heading={`${meta.label}: ${meta.headline}`}>
          <ScoreMeter score={data.score} verdict={data.verdict} />
        </Banner>
      </div>

      {data.actions.length > 0 && (
        <Section title="지금 할 일">
          <ol className="numbered">
            {data.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="판별 요약">
        <SummaryList rows={summary} />
      </Section>

      <Section title="판단 근거">
        {showPending ? (
          <div className="pending-text" role="status">
            <div className="shimmer" />
            <div className="shimmer short" />
            <span className="field-hint">설명을 작성하고 있습니다.</span>
          </div>
        ) : (
          <CitedText text={data.explanation} onCite={(n) => scrollToSource('src', n)} />
        )}
        {data.reasons.length > 0 && (
          <ul className="bullets">
            {data.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </Section>

      {data.urls.length > 0 && (
        <Section title="링크 조사">
          <p className="section-desc">
            차단목록은 한국인터넷진흥원(KISA)이 모으는 피싱 사이트 목록입니다.
          </p>
          <div className="stack-lg">
            {data.urls.map((u, i) => (
              <UrlSummary key={`${u.url}-${i}`} url={u} />
            ))}
          </div>
        </Section>
      )}

      {data.sources.length > 0 && (
        <Section title="출처">
          <SourceList sources={data.sources} idPrefix="src" />
        </Section>
      )}

      <Section title="더 보기">
        <details className="disclosure">
          <summary>서버에 저장된 문자</summary>
          <p className="masked">{data.masked_text}</p>
        </details>
        <details className="disclosure">
          <summary>처리 단계별 시간</summary>
          <TimingTable timings={data.timings} total={data.elapsed_ms} />
        </details>
      </Section>

      {data.verdict !== 'safe' && (
        <Section title="신고·상담 전화">
          <ul className="list">
            {HOTLINES.map((h) => (
              <li key={h.number}>
                <a className="list-item" href={`tel:${h.number}`}>
                  <b className="hotline-number">{h.number}</b>
                  <span className="list-main">
                    <span className="list-title">{h.label}</span>
                    <span className="list-sub">{h.desc}</span>
                  </span>
                  <Icon name="phone" size={18} />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="meta-line">
        {data.check_id ? `판별 번호 ${data.check_id.slice(0, 8)}` : '저장되지 않은 결과'}
      </p>

      <div className="bottom-bar">
        <button
          type="button"
          className="secondary-btn"
          disabled={!data.check_id}
          onClick={() => navigate(`/report/${data.check_id}`)}
        >
          결과 신고
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => navigate(data.check_id ? `/ask?check=${data.check_id}` : '/ask')}
        >
          이 문자에 대해 묻기
        </button>
      </div>
    </div>
  )
}

function UrlSummary({ url }: { url: UrlOut }) {
  const risk = Math.round(url.score * 100)
  const rows: SummaryRow[] = [{ key: '주소', value: <span className="mono-break">{url.url}</span> }]
  if (url.final_url && url.final_url !== url.url)
    rows.push({ key: '최종 주소', value: <span className="mono-break">{url.final_url}</span> })
  if (url.hops != null) rows.push({ key: '주소 이동', value: `${url.hops}번` })
  if (url.domain_age_days != null)
    rows.push({
      key: '도메인 나이',
      value: formatDomainAge(url.domain_age_days),
      emphasis: url.domain_age_days < 90 ? 'warning' : undefined,
    })
  if (url.country) rows.push({ key: '서버 국가', value: url.country })
  if (url.has_form != null)
    rows.push({ key: '개인정보 입력 칸', value: url.has_form ? '있음' : '없음', emphasis: url.has_form ? 'danger' : undefined })
  if (url.apk_link != null)
    rows.push({ key: '앱 설치 파일(APK)', value: url.apk_link ? '있음' : '없음', emphasis: url.apk_link ? 'danger' : undefined })
  rows.push(
    {
      key: '차단목록 등재',
      value: url.blocklisted ? '등재됨' : '없음',
      emphasis: url.blocklisted ? 'danger' : undefined,
    },
    {
      key: '링크 위험 점수',
      value: `${risk}점`,
      emphasis: risk >= 70 ? 'danger' : risk >= 40 ? 'warning' : undefined,
    },
    { key: '조사', value: url.probed ? '완료' : '시간 안에 끝내지 못해 주소만 확인' },
  )

  return (
    <div className="url-block">
      <h3 className="sub-heading">
        <Icon name="link" size={16} />
        {url.host ?? url.url}
      </h3>
      <SummaryList rows={rows} />
    </div>
  )
}

function TimingTable({ timings, total }: { timings: Record<string, number>; total: number }) {
  const entries = Object.entries(timings)
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">처리 단계별 시간</caption>
        <thead>
          <tr>
            <th scope="col">단계</th>
            <th scope="col" className="num">
              시간(ms)
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{TIMING_LABELS[k] ?? k}</th>
              <td className="num">{formatNumber(v)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">전체</th>
            <td className="num">{formatNumber(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
