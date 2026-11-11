import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

// 화면 진입 시 한 번 불러오는 GET 요청용. deps가 바뀌거나 reload()하면 다시 부른다
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: Error }>({ key: '' })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  const key = JSON.stringify(deps) + '#' + tick

  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    let alive = true
    fnRef.current().then(
      (data) => alive && setState({ key, data }),
      (error: Error) => alive && setState({ key, error }),
    )
    return () => {
      alive = false
    }
  }, [key])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  // 새 요청의 응답이 오기 전까지는 로딩으로 본다
  const loading = state.key !== key
  return { data: loading ? undefined : state.data, error: loading ? undefined : state.error, loading, reload }
}

// Render 무료 서버는 잠들었다 깨는 데 최대 1분 걸린다. 오래 걸리면 안내를 띄우기 위한 플래그
export function useSlowFlag(active: boolean, ms = 6000) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setSlow(true), ms)
    return () => {
      clearTimeout(t)
      setSlow(false)
    }
  }, [active, ms])
  return active && slow
}
