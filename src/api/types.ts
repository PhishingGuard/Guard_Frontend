// Swagger(https://phishguard-api-n50n.onrender.com/docs)의 스키마를 그대로 옮긴 타입

export type Verdict = 'safe' | 'suspicious' | 'danger'

export type Category =
  | 'gov_impersonation'
  | 'delivery'
  | 'family'
  | 'loan'
  | 'investment'
  | 'payment'
  | 'subsidy'
  | 'invitation'
  | 'other'

export type Channel = 'sms' | 'kakao' | 'email' | 'messenger' | 'other'

export type ExplanationSource = 'llm' | 'template'

export interface CheckRequest {
  text: string
  urls?: string[]
  channel?: Channel
  device_token?: string | null
}

export interface SourceOut {
  n: number
  title: string
  url?: string | null
  used: boolean
}

export interface UrlOut {
  url: string
  final_url?: string | null
  hops?: number | null
  host?: string | null
  domain_age_days?: number | null
  country?: string | null
  has_form?: boolean | null
  apk_link?: boolean | null
  probed: boolean
  score: number
  blocklisted: boolean
}

export interface CheckResponse {
  check_id: string | null
  verdict: Verdict
  score: number
  category: Category
  category_label: string
  reasons: string[]
  explanation: string
  explanation_source: ExplanationSource
  explanation_pending?: boolean
  actions: string[]
  sources: SourceOut[]
  urls: UrlOut[]
  masked_text: string
  timings: Record<string, number>
  elapsed_ms: number
}

export interface AskRequest {
  question: string
  check_id?: string | null
}

export interface AskResponse {
  answer: string
  actions: string[]
  sources: SourceOut[]
  explanation_source: ExplanationSource
  elapsed_ms: number
}

export type ReportLabel = 'phishing' | 'safe'
export type ReportStatus = 'pending' | 'approved' | 'rejected'

export interface ReportCreate {
  check_id?: string | null
  text?: string | null
  url?: string | null
  label: ReportLabel
  memo?: string | null
}

export interface ReportOut {
  id: number
  created_at: string
  masked_text: string | null
  url: string | null
  label: string
  category: string | null
  memo: string | null
  status: string
  reviewed_at: string | null
  review_note: string | null
}

export interface ReportReview {
  status: 'approved' | 'rejected'
  category?: Category | null
  note?: string | null
}

export interface DeviceRegister {
  token: string
  platform: 'android' | 'ios'
  push_service?: 'fcm' | 'apns'
  region?: string | null
  push_enabled?: boolean
}

export interface DeviceOut {
  id: number
  platform: string
  push_service: string
  region: string | null
  push_enabled: boolean
  created_at: string
}

export type TrendName = 'police' | 'regions' | 'kisa' | 'infra' | 'topics'

export interface TrendSummary {
  name: string
  title: string
  computed_at: string
}

export interface TrendOut extends TrendSummary {
  payload: Record<string, unknown>
}

export interface AlertOut {
  id: number
  created_at: string
  week_start: string
  topic: string
  title: string
  body: string
  count: number
  threshold: number
  active: boolean
}

export interface CategoryOut {
  key: Category
  label: string
}

export interface DocumentCreate {
  title: string
  content: string
  url?: string | null
  doc_type?: 'guide' | 'press' | 'manual'
  category?: Category | null
  publisher?: string | null
}

export type DatasetKind = 'police_status' | 'police_region' | 'population' | 'kisa' | 'korccvi'

export type JobName =
  | 'reprobe_urls'
  | 'refresh_kisa_list'
  | 'crawl_press'
  | 'embed_documents'
  | 'run_analysis'
  | 'issue_alerts'
  | 'monthly_report'
  | 'seed_knowledge'

export interface DatasetOut {
  id: number
  kind: string
  filename: string
  imported_at: string
  status: string
  rows: number
  error: string | null
}

// Swagger에는 스키마가 없어 실제 응답에서 옮겼다: {"status":"ok","service":"api","queue":false,"llm":true}
export interface HealthOut {
  status: string
  service?: string
  queue?: boolean
  llm?: boolean
}

export interface QueuedOut {
  queued: boolean
  detail: string
}
