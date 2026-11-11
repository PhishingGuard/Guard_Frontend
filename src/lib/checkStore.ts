import { api } from '../api/client'
import type { CheckRequest, CheckResponse } from '../api/types'

// 화면 사이에 넘기는 메모리 저장소.
// 홈 → 판별 중: 보낼 요청 / 판별 중 → 결과: 받은 응답 (다시 GET 하지 않도록)

let pendingRequest: CheckRequest | null = null
const results = new Map<string, CheckResponse>()

// check_id가 null(서버 저장 실패)이어도 결과 화면은 보여 줘야 하므로 임시 키를 쓴다
export const LOCAL_ID = 'local'

export function setPendingRequest(req: CheckRequest) {
  pendingRequest = req
}

export function peekPendingRequest(): CheckRequest | null {
  return pendingRequest
}

// StrictMode의 이중 effect나 재렌더로 같은 문자를 두 번 판별하지 않도록 진행 중 요청을 공유
let inflight: { req: CheckRequest; promise: Promise<CheckResponse> } | null = null

export function runCheck(req: CheckRequest, retry = false): Promise<CheckResponse> {
  if (inflight && inflight.req === req && !retry) return inflight.promise
  const promise = api.check(req)
  inflight = { req, promise }
  promise.catch(() => {
    if (inflight?.promise === promise) inflight = null
  })
  return promise
}

export function finishCheck(req: CheckRequest) {
  if (pendingRequest === req) pendingRequest = null
  if (inflight?.req === req) inflight = null
}

export function cacheResult(res: CheckResponse): string {
  const id = res.check_id ?? LOCAL_ID
  results.set(id, res)
  return id
}

export function getCachedResult(id: string): CheckResponse | undefined {
  return results.get(id)
}
