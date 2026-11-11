import { useState } from 'react'
import { adminApi, api } from '../api/client'
import type {
  Category,
  DatasetKind,
  DocumentCreate,
  JobName,
  ReportOut,
  ReportStatus,
} from '../api/types'
import { Icon } from '../components/Icon'
import { DataTable } from '../components/Charts'
import { Banner, Indicators, SummaryList, type SummaryRow } from '../components/Info'
import { EmptyState, ErrorBox, Spinner, TopBar } from '../components/Layout'
import { CATEGORY_LABELS, formatBasis, formatDateTime } from '../lib/format'
import { getAdminToken, setAdminToken } from '../lib/storage'
import { useAsync } from '../lib/useAsync'

type Tab = 'reports' | 'documents' | 'data'

// 관리자 API는 로그인 대신 X-Admin-Token 헤더로 인증한다
export function Admin() {
  const [token, setToken] = useState(getAdminToken)
  const [tab, setTab] = useState<Tab>('reports')

  if (!token) {
    return (
      <div className="screen">
        <TopBar title="관리자" back="/settings" />
        <TokenForm
          onSave={(t) => {
            setAdminToken(t)
            setToken(t)
          }}
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar
        title="관리자"
        back="/settings"
        right={
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setAdminToken(null)
              setToken(null)
            }}
          >
            로그아웃
          </button>
        }
      />
      <div className="tab-list" role="tablist" aria-label="관리 메뉴">
        {(
          [
            ['reports', '신고 검수'],
            ['documents', '문서 등록'],
            ['data', '데이터·작업'],
          ] as const
        ).map(([key, text]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>
            {text}
          </button>
        ))}
      </div>
      <div className="pad top-gap">
        {tab === 'reports' && <ReportsPanel token={token} />}
        {tab === 'documents' && <DocumentPanel token={token} />}
        {tab === 'data' && <DataPanel token={token} />}
      </div>
    </div>
  )
}

function TokenForm({ onSave }: { onSave: (token: string) => void }) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    const t = value.trim()
    if (!t) return
    setChecking(true)
    setError(undefined)
    try {
      await adminApi.reports(t, 'pending', 1)
      onSave(t)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>관리자 확인</h1>
        <p>관리자 토큰은 이 탭을 닫으면 지워집니다.</p>
      </div>
      <form
        className="pad form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="admin-token">
            관리자 토큰
          </label>
          <input
            id="admin-token"
            className="input"
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {error && <ErrorBox message={error} />}
        <button type="submit" className="primary-btn" disabled={!value.trim() || checking}>
          {checking ? '확인 중…' : '확인'}
        </button>
      </form>
    </>
  )
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as Category[]

const STATUS_TABS: [ReportStatus, string][] = [
  ['pending', '대기'],
  ['approved', '승인'],
  ['rejected', '반려'],
]

// 신고 처리 흐름: 접수 → 검수 → 정답 라벨 확정
const FLOW = ['신고 접수', '검수', '정답 라벨 확정']

const LIST_LIMIT = 200

function ReportsPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<ReportStatus>('pending')
  // 필터 옆 건수를 보여 주려고 세 상태를 함께 받는다
  const lists = useAsync(async () => {
    const [pending, approved, rejected] = await Promise.all(
      STATUS_TABS.map(([s]) => adminApi.reports(token, s, LIST_LIMIT)),
    )
    return { lists: { pending, approved, rejected } as Record<ReportStatus, ReportOut[]>, at: new Date() }
  }, [token])
  const categories = useAsync(() => api.categories(), [])
  const labels: Record<string, string> = categories.data
    ? Object.fromEntries(categories.data.map((c) => [c.key, c.label]))
    : CATEGORY_LABELS

  const count = (s: ReportStatus) => {
    const n = lists.data?.lists[s].length ?? 0
    return n >= LIST_LIMIT ? `${LIST_LIMIT.toLocaleString()}+` : n.toLocaleString()
  }
  const approved = lists.data?.lists.approved.length ?? 0
  const reviewed = approved + (lists.data?.lists.rejected.length ?? 0)
  const approvalRate = reviewed ? Math.round((approved / reviewed) * 100) : null
  const shown = lists.data?.lists[status] ?? []

  return (
    <div className="stack-lg">
      <ol className="flow" aria-label="신고 처리 흐름">
        {FLOW.map((f, i) => (
          <li key={f}>
            <span className="flow-n">{i + 1}</span>
            {f}
          </li>
        ))}
      </ol>

      {lists.data && (
        <Indicators
          items={[
            { name: '검수 대기', value: count('pending'), unit: '건', basis: formatBasis(lists.data.at) },
            {
              name: '승인 비율',
              value: approvalRate === null ? '-' : approvalRate.toLocaleString(),
              unit: approvalRate === null ? undefined : '%',
              basis: `검수 ${reviewed.toLocaleString()}건 기준`,
            },
          ]}
        />
      )}

      <div className="chart-tools">
        <div className="tab-list inline" role="tablist" aria-label="신고 상태">
          {STATUS_TABS.map(([key, text]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={status === key}
              className={status === key ? 'is-on' : ''}
              onClick={() => setStatus(key)}
            >
              {text}
              {lists.data && `(${count(key)})`}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn push-right" aria-label="새로고침" onClick={lists.reload}>
          <Icon name="refresh" size={18} />
        </button>
      </div>

      {lists.loading ? (
        <Spinner />
      ) : lists.error ? (
        <ErrorBox message={lists.error.message} onRetry={lists.reload} />
      ) : shown.length === 0 ? (
        <EmptyState icon="flag" title="신고가 없습니다" />
      ) : (
        <ul className="stack-lg">
          {shown.map((r) => (
            <li key={r.id}>
              <ReportCard report={r} token={token} labels={labels} onDone={lists.reload} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReportCard({
  report,
  token,
  labels,
  onDone,
}: {
  report: ReportOut
  token: string
  labels: Record<string, string>
  onDone: () => void
}) {
  const [category, setCategory] = useState<Category | ''>((report.category as Category) ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const review = async (decision: 'approved' | 'rejected') => {
    setBusy(true)
    setError(undefined)
    try {
      await adminApi.review(token, report.id, { status: decision, category: category || null, note: note.trim() || null })
      onDone()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const rows: SummaryRow[] = [
    { key: '신고 번호', value: `${report.id}` },
    {
      key: '신고 내용',
      value: report.label === 'phishing' ? '놓친 사기 문자' : '정상 문자를 위험으로 판정',
      emphasis: report.label === 'phishing' ? 'danger' : undefined,
    },
    { key: '접수 일시', value: formatDateTime(report.created_at) },
  ]
  if (report.category) rows.push({ key: '수법', value: labels[report.category] ?? report.category })
  if (report.masked_text) rows.push({ key: '문자', value: report.masked_text })
  if (report.url) rows.push({ key: '링크', value: <span className="mono-break">{report.url}</span> })
  if (report.memo) rows.push({ key: '메모', value: report.memo })
  if (report.status !== 'pending') {
    rows.push({ key: '검수 결과', value: report.status === 'approved' ? '승인' : '반려' })
    if (report.reviewed_at) rows.push({ key: '검수 일시', value: formatDateTime(report.reviewed_at) })
    if (report.review_note) rows.push({ key: '검수 메모', value: report.review_note })
  }

  return (
    <article className="review-card">
      <SummaryList rows={rows} />
      {report.status === 'pending' && (
        <div className="form top-gap">
          <div className="field">
            <label className="field-label" htmlFor={`cat-${report.id}`}>
              확정할 수법 <span className="optional">선택</span>
            </label>
            <select
              id={`cat-${report.id}`}
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | '')}
            >
              <option value="">정하지 않음</option>
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {labels[k] ?? k}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`note-${report.id}`}>
              검수 메모 <span className="optional">선택</span>
            </label>
            <input id={`note-${report.id}`} className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <ErrorBox message={error} />}
          <div className="row">
            <button type="button" className="secondary-btn" disabled={busy} onClick={() => review('rejected')}>
              반려
            </button>
            <button type="button" className="primary-btn" disabled={busy} onClick={() => review('approved')}>
              승인
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

const EMPTY_DOC: DocumentCreate = { title: '', content: '', url: '', doc_type: 'manual', category: null, publisher: '' }

const queuedText = (res: { queued: boolean; detail: string }) =>
  res.detail || (res.queued ? '작업 대기열에 넣었습니다.' : '바로 처리했습니다.')

function DocumentPanel({ token }: { token: string }) {
  const [doc, setDoc] = useState<DocumentCreate>(EMPTY_DOC)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const set = (patch: Partial<DocumentCreate>) => setDoc((d) => ({ ...d, ...patch }))
  const valid = doc.title.trim().length > 0 && doc.content.trim().length >= 20

  const submit = async () => {
    setBusy(true)
    setError(undefined)
    setResult(undefined)
    try {
      const res = await adminApi.createDocument(token, {
        ...doc,
        title: doc.title.trim(),
        content: doc.content.trim(),
        url: doc.url?.trim() || null,
        publisher: doc.publisher?.trim() || null,
      })
      setResult(queuedText(res))
      setDoc(EMPTY_DOC)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) void submit()
      }}
    >
      <p className="section-desc">
        검색 증강 생성(RAG)에 쓰는 지식베이스에 대응 가이드와 사례 문서를 넣습니다. 판별 설명과 질문 답변이 이 문서를 근거로 씁니다.
      </p>
      {result && (
        <Banner tone="success" title="등록 완료">
          <p>{result}</p>
        </Banner>
      )}
      <div className="field">
        <label className="field-label" htmlFor="doc-title">
          제목
        </label>
        <input
          id="doc-title"
          className="input"
          maxLength={300}
          value={doc.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="택배 사칭 스미싱 대응 가이드"
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="doc-content">
          본문
        </label>
        <p className="field-hint">20자 이상 입력하세요.</p>
        <textarea
          id="doc-content"
          className="textarea"
          rows={8}
          maxLength={50000}
          value={doc.content}
          onChange={(e) => set({ content: e.target.value })}
        />
      </div>
      <div className="row">
        <div className="field">
          <label className="field-label" htmlFor="doc-type">
            종류
          </label>
          <select
            id="doc-type"
            className="input"
            value={doc.doc_type}
            onChange={(e) => set({ doc_type: e.target.value as DocumentCreate['doc_type'] })}
          >
            <option value="manual">매뉴얼</option>
            <option value="guide">가이드</option>
            <option value="press">보도자료</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="doc-category">
            수법
          </label>
          <select
            id="doc-category"
            className="input"
            value={doc.category ?? ''}
            onChange={(e) => set({ category: (e.target.value || null) as Category | null })}
          >
            <option value="">없음</option>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="doc-url">
          출처 주소 <span className="optional">선택</span>
        </label>
        <input
          id="doc-url"
          className="input"
          type="url"
          maxLength={2048}
          value={doc.url ?? ''}
          onChange={(e) => set({ url: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="doc-publisher">
          발행처 <span className="optional">선택</span>
        </label>
        <input
          id="doc-publisher"
          className="input"
          maxLength={64}
          value={doc.publisher ?? ''}
          onChange={(e) => set({ publisher: e.target.value })}
          placeholder="KISA"
        />
      </div>
      {error && <ErrorBox message={error} />}
      <button type="submit" className="primary-btn" disabled={!valid || busy}>
        {busy ? '등록 중…' : '문서 등록'}
      </button>
    </form>
  )
}

const DATASETS: { kind: DatasetKind; label: string }[] = [
  { kind: 'police_status', label: '경찰청 보이스피싱 현황' },
  { kind: 'police_region', label: '경찰청 시도청별 피해금액' },
  { kind: 'population', label: '시도별 인구' },
  { kind: 'kisa', label: '한국인터넷진흥원(KISA) 피싱 사이트 주소' },
  { kind: 'korccvi', label: 'KorCCVi 데이터셋' },
]

const JOBS: { job: JobName; label: string }[] = [
  { job: 'run_analysis', label: '분석 다시 계산(통계 화면)' },
  { job: 'issue_alerts', label: '주의보 발령 검사' },
  { job: 'refresh_kisa_list', label: 'KISA 차단목록 갱신' },
  { job: 'reprobe_urls', label: '링크 다시 조사' },
  { job: 'crawl_press', label: '보도자료 수집' },
  { job: 'embed_documents', label: '문서 임베딩' },
  { job: 'seed_knowledge', label: '기본 지식 넣기' },
  { job: 'monthly_report', label: '월간 보고서' },
]

function DataPanel({ token }: { token: string }) {
  const datasets = useAsync(() => adminApi.datasets(token), [token])
  const [kind, setKind] = useState<DatasetKind>('police_status')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()

  const run = async (key: string, fn: () => Promise<{ queued: boolean; detail: string }>) => {
    setBusy(key)
    setMessage(undefined)
    try {
      setMessage({ ok: true, text: queuedText(await fn()) })
      datasets.reload()
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="stack-lg">
      {message &&
        (message.ok ? (
          <Banner tone="success" title="요청 완료">
            <p>{message.text}</p>
          </Banner>
        ) : (
          <ErrorBox message={message.text} />
        ))}

      <section className="form">
        <h2 className="section-title">CSV 올리기</h2>
        <div className="field">
          <label className="field-label" htmlFor="dataset-kind">
            데이터 종류
          </label>
          <select id="dataset-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as DatasetKind)}>
            {DATASETS.map((d) => (
              <option key={d.kind} value={d.kind}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="dataset-file">
            파일
          </label>
          <input
            id="dataset-file"
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          type="button"
          className="primary-btn"
          disabled={!file || busy !== null}
          onClick={() => file && run('upload', () => adminApi.uploadDataset(token, kind, file))}
        >
          {busy === 'upload' ? '올리는 중…' : '올리기'}
        </button>
      </section>

      <section>
        <h2 className="section-title">작업 실행</h2>
        <ul className="list top-gap">
          {JOBS.map((j) => (
            <li key={j.job}>
              <button
                type="button"
                className="list-item"
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm(`'${j.label}' 작업을 실행하시겠습니까?`)) void run(j.job, () => adminApi.runJob(token, j.job))
                }}
              >
                <span className="list-main">
                  <span className="list-title">{j.label}</span>
                  <span className="list-sub mono">{j.job}</span>
                </span>
                {busy === j.job ? <span className="spinner small" /> : <Icon name="chevron" size={18} />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="section-title">올린 데이터</h2>
        {datasets.loading ? (
          <Spinner />
        ) : datasets.error ? (
          <ErrorBox message={datasets.error.message} onRetry={datasets.reload} />
        ) : !datasets.data || datasets.data.length === 0 ? (
          <p className="section-desc top-gap">아직 올린 데이터가 없습니다.</p>
        ) : (
          <DataTable
            columns={['종류', '파일', '행', '상태', '올린 일시']}
            rows={datasets.data.map((d) => ({
              종류: DATASETS.find((x) => x.kind === d.kind)?.label ?? d.kind,
              파일: d.filename,
              행: d.rows,
              상태: d.error ? `${d.status}: ${d.error}` : d.status,
              '올린 일시': formatDateTime(d.imported_at),
            }))}
          />
        )}
      </section>
    </div>
  )
}
