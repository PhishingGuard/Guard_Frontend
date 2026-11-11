import type {
  AlertOut,
  AskRequest,
  AskResponse,
  CategoryOut,
  CheckRequest,
  CheckResponse,
  DatasetKind,
  DatasetOut,
  DeviceOut,
  DeviceRegister,
  DocumentCreate,
  HealthOut,
  JobName,
  QueuedOut,
  ReportCreate,
  ReportOut,
  ReportReview,
  ReportStatus,
  TrendName,
  TrendOut,
  TrendSummary,
} from './types'

const DEFAULT_BASE = 'https://phishguard-api-n50n.onrender.com'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '')
export const SWAGGER_URL = `${API_BASE}/docs`

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  body?: unknown
  form?: FormData
  query?: Record<string, string | number | boolean | undefined>
  adminToken?: string
  signal?: AbortSignal
}

const STATUS_MESSAGES: Record<number, string> = {
  400: '입력한 내용을 확인해 주세요. 빈 문자이거나 너무 깁니다.',
  401: '관리자 토큰이 올바르지 않습니다.',
  403: '관리자 토큰이 올바르지 않습니다.',
  404: '찾을 수 없습니다.',
  422: '입력 형식이 맞지 않습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
}

// 422 응답의 loc 마지막 값 → 화면에서 쓰는 이름
const FIELD_NAMES: Record<string, string> = {
  text: '문자',
  question: '질문',
  url: '링크',
  urls: '링크',
  memo: '메모',
  title: '제목',
  content: '본문',
  token: '토큰',
  note: '검수 메모',
}

function detailMessage(status: number, data: unknown): string {
  // 서버는 틀린 토큰에도 "토큰이 필요합니다"라고 답해, 토큰을 넣은 화면에서는 헷갈린다
  if (status === 401 || status === 403) return STATUS_MESSAGES[status]
  const detail = (data as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { type?: string; loc?: unknown[] }
    const key = String(first.loc?.[first.loc.length - 1] ?? '')
    const field = FIELD_NAMES[key]
    if (field && first.type === 'string_too_short') return `${field}을(를) 입력해 주세요.`
    if (field && first.type === 'string_too_long') return `${field}이(가) 너무 깁니다.`
    return field ? `${field}의 형식이 맞지 않습니다.` : STATUS_MESSAGES[422]
  }
  return STATUS_MESSAGES[status] ?? `서버 오류가 발생했습니다(${status}).`
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined
  if (opts.form) {
    body = opts.form
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  if (opts.adminToken) headers['X-Admin-Token'] = opts.adminToken

  let res: Response
  try {
    res = await fetch(url, { method, headers, body, signal: opts.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, '서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.')
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) throw new ApiError(res.status, detailMessage(res.status, data))
  return data as T
}

// 공개 API
export const api = {
  health: (signal?: AbortSignal) => request<HealthOut>('GET', '/health', { signal }),
  categories: () => request<CategoryOut[]>('GET', '/v1/categories'),

  check: (body: CheckRequest, signal?: AbortSignal) =>
    request<CheckResponse>('POST', '/v1/check', { body, signal }),
  getCheck: (checkId: string, signal?: AbortSignal) =>
    request<CheckResponse>('GET', `/v1/checks/${encodeURIComponent(checkId)}`, { signal }),

  ask: (body: AskRequest) => request<AskResponse>('POST', '/v1/ask', { body }),
  report: (body: ReportCreate) => request<ReportOut>('POST', '/v1/reports', { body }),

  alerts: (activeOnly = true, limit = 20) =>
    request<AlertOut[]>('GET', '/v1/alerts', { query: { active_only: activeOnly, limit } }),

  trends: () => request<TrendSummary[]>('GET', '/v1/trends'),
  trend: (name: TrendName) => request<TrendOut>('GET', `/v1/trends/${name}`),

  // 웹에는 FCM/APNs 토큰이 없어 화면에서는 부르지 않는다. 앱 래핑 시 사용.
  registerDevice: (body: DeviceRegister) => request<DeviceOut>('POST', '/v1/devices', { body }),
  unregisterDevice: (token: string) =>
    request<void>('DELETE', `/v1/devices/${encodeURIComponent(token)}`),
}

// 관리자 API (X-Admin-Token 헤더)
export const adminApi = {
  reports: (token: string, status: ReportStatus = 'pending', limit = 50) =>
    request<ReportOut[]>('GET', '/v1/admin/reports', { adminToken: token, query: { status, limit } }),
  review: (token: string, id: number, body: ReportReview) =>
    request<ReportOut>('PATCH', `/v1/admin/reports/${id}`, { adminToken: token, body }),
  createDocument: (token: string, body: DocumentCreate) =>
    request<QueuedOut>('POST', '/v1/admin/documents', { adminToken: token, body }),
  uploadDataset: (token: string, kind: DatasetKind, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<QueuedOut>('POST', `/v1/admin/datasets/${kind}`, { adminToken: token, form })
  },
  datasets: (token: string) =>
    request<DatasetOut[]>('GET', '/v1/admin/datasets', { adminToken: token }),
  runJob: (token: string, job: JobName) =>
    request<QueuedOut>('POST', `/v1/admin/jobs/${job}`, { adminToken: token }),
}
