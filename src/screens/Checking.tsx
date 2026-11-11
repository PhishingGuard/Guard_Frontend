import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { ErrorBox, TopBar } from '../components/Layout'
import { cacheResult, finishCheck, peekPendingRequest, runCheck } from '../lib/checkStore'
import { navigate } from '../lib/router'
import { addHistory } from '../lib/storage'
import { useSlowFlag } from '../lib/useAsync'

// 서버의 실제 처리 순서(/v1/check 설명)를 그대로 보여 준다
const STEPS = ['개인정보 가리기', '문장·링크·차단목록 조사', '위험 점수 계산', '설명 작성']

export function Checking() {
  const [req] = useState(peekPendingRequest)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const slow = useSlowFlag(!error)

  useEffect(() => {
    if (!req) {
      navigate('/', { replace: true })
      return
    }
    let alive = true
    runCheck(req, attempt > 0).then(
      (res) => {
        finishCheck(req)
        addHistory(res)
        const id = cacheResult(res)
        if (alive) navigate(`/result/${id}`, { replace: true })
      },
      (e: Error) => {
        if (alive) setError(e.message)
      },
    )
    return () => {
      alive = false
    }
  }, [req, attempt])

  const retry = () => {
    setError(undefined)
    setStep(0)
    setAttempt((a) => a + 1)
  }

  useEffect(() => {
    if (error) return
    const timers = STEPS.slice(1).map((_, i) => setTimeout(() => setStep(i + 1), 450 * (i + 1)))
    return () => timers.forEach(clearTimeout)
  }, [error, attempt])

  if (!req) return null

  return (
    <div className="screen">
      <TopBar title="판별 중" back />
      <div className="page-head">
        <h1>{error ? '판별하지 못했습니다' : '문자를 확인하고 있습니다'}</h1>
        {!error && <p>보통 3초 안에 끝납니다.</p>}
      </div>

      <div className="pad stack">
        {error ? (
          <ErrorBox message={error} onRetry={retry} />
        ) : (
          <>
            <ol className="card steps" aria-live="polite">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>
                  <span className="step-mark" aria-hidden="true">
                    {i < step ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  <span>
                    {s}
                    <span className="sr-only">{i < step ? ' 완료' : i === step ? ' 진행 중' : ' 대기'}</span>
                  </span>
                  {i === step && <span className="spinner small" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            {slow && (
              <p className="inline-note">서버를 깨우는 중입니다. 처음 한 번은 1분 정도 걸릴 수 있습니다.</p>
            )}
          </>
        )}

        <div className="card field">
          <span className="field-label">확인 중인 문자</span>
          <blockquote className="quote-preview">{req.text}</blockquote>
        </div>
      </div>
    </div>
  )
}
