import type { CheckResponse, Verdict } from '../api/types'

// 사생활 모드 등에서 저장소 접근이 막혀도 앱은 동작해야 하므로 모두 try/catch

function read<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(store: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null || value === undefined) store?.removeItem(key)
    else store?.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 실패는 무시
  }
}

const local = typeof window !== 'undefined' ? window.localStorage : undefined
const session = typeof window !== 'undefined' ? window.sessionStorage : undefined

// 최근 판별 기록 (원문 대신 가려진 문자만 보관)
export interface HistoryItem {
  checkId: string
  verdict: Verdict
  score: number
  categoryLabel: string
  preview: string
  at: string
}

const HISTORY_KEY = 'pg.history'
const HISTORY_MAX = 20

export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(local, HISTORY_KEY, [])
}

export function addHistory(res: CheckResponse) {
  if (!res.check_id) return
  const item: HistoryItem = {
    checkId: res.check_id,
    verdict: res.verdict,
    score: res.score,
    categoryLabel: res.category_label,
    preview: res.masked_text.slice(0, 80),
    at: new Date().toISOString(),
  }
  const rest = getHistory().filter((h) => h.checkId !== item.checkId)
  write(local, HISTORY_KEY, [item, ...rest].slice(0, HISTORY_MAX))
}

export function clearHistory() {
  write(local, HISTORY_KEY, null)
}

// 알림 지역 (시·도)
const REGION_KEY = 'pg.region'
export const getRegion = () => read<string | null>(local, REGION_KEY, null)
export const setRegion = (region: string | null) => write(local, REGION_KEY, region)

// 관리자 토큰은 탭을 닫으면 사라지도록 sessionStorage
const ADMIN_KEY = 'pg.adminToken'
export const getAdminToken = () => read<string | null>(session, ADMIN_KEY, null)
export const setAdminToken = (token: string | null) => write(session, ADMIN_KEY, token)
