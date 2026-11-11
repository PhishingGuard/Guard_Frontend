import { useSyncExternalStore } from 'react'

// 해시 라우터: #/result/abc?x=1 → { path: ['result', 'abc'], query: { x: '1' } }
// 정적 호스팅에서도 새로고침·뒤로 가기가 그대로 동작한다.

export interface Route {
  path: string[]
  query: URLSearchParams
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const getHash = () => window.location.hash

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [pathPart, queryPart = ''] = raw.split('?')
  return {
    path: pathPart.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(queryPart),
  }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  return parseHash(hash)
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = '#' + (to.startsWith('/') ? to : '/' + to)
  if (opts.replace) {
    window.location.replace(hash)
  } else {
    window.location.hash = hash
  }
  window.scrollTo(0, 0)
}

export function goBack(fallback = '/') {
  // 바로 들어온 경우(히스토리가 없음)에는 홈으로
  if (window.history.length > 1) window.history.back()
  else navigate(fallback, { replace: true })
}
