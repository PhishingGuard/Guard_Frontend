import { useState } from 'react'
import { api } from '../api/client'
import type { ReportLabel } from '../api/types'
import { Banner, SummaryList } from '../components/Info'
import { ErrorBox, TopBar } from '../components/Layout'
import { getCachedResult } from '../lib/checkStore'
import { VERDICT_META } from '../lib/format'
import { navigate } from '../lib/router'

const LABELS: { value: ReportLabel; title: string; desc: string }[] = [
  { value: 'phishing', title: '사기 문자인데 놓쳤습니다', desc: '안전이나 주의로 나왔지만 실제로는 사기 문자입니다.' },
  { value: 'safe', title: '정상 문자인데 위험으로 나왔습니다', desc: '실제 기관이나 아는 곳에서 보낸 안내 문자입니다.' },
]

// checkId가 있으면 판별 결과 신고, 없으면 받은 문자를 직접 신고
export function Report({ checkId }: { checkId?: string }) {
  const result = checkId ? getCachedResult(checkId) : undefined
  const [label, setLabel] = useState<ReportLabel>(result?.verdict === 'safe' ? 'phishing' : checkId ? 'safe' : 'phishing')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)

  const canSubmit = !sending && (checkId || text.trim() || url.trim())

  const submit = async () => {
    if (!canSubmit) return
    setSending(true)
    setError(undefined)
    try {
      await api.report({
        check_id: checkId ?? null,
        text: checkId ? null : text.trim() || null,
        url: url.trim() || null,
        label,
        memo: memo.trim() || null,
      })
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="screen">
        <TopBar title="신고" back />
        <div className="pad top-gap stack-lg">
          <Banner tone="success" title="신고 접수" heading="신고가 접수되었습니다">
            <p>검수자가 확인한 뒤 판별 정확도를 높이는 데 씁니다. 신고는 익명으로 처리됩니다.</p>
          </Banner>
          <button type="button" className="primary-btn" onClick={() => navigate('/', { replace: true })}>
            처음으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen has-bottom-bar">
      <TopBar title={checkId ? '판별 결과 신고' : '문자 신고'} back />
      <div className="page-head">
        <h1>{checkId ? '판별 결과가 틀렸나요?' : '받은 문자 신고'}</h1>
        <p>이름이나 연락처는 받지 않습니다.</p>
      </div>

      <form
        className="pad form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {result && (
          <SummaryList
            rows={[
              { key: '판정', value: `${VERDICT_META[result.verdict].label} (${result.score}점)` },
              { key: '수법', value: result.category_label },
              { key: '문자', value: <span className="ellipsis-2">{result.masked_text}</span> },
            ]}
          />
        )}

        <fieldset className="field">
          <legend className="field-label">무엇이 틀렸나요?</legend>
          <div className="radio-list">
            {LABELS.map((l) => (
              <label key={l.value} className={`radio-item${label === l.value ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  name="label"
                  value={l.value}
                  checked={label === l.value}
                  onChange={() => setLabel(l.value)}
                />
                <span>
                  <b>{l.title}</b>
                  <span className="field-hint">{l.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {!checkId && (
          <div className="field">
            <label className="field-label" htmlFor="report-text">
              받은 문자
            </label>
            <p className="field-hint">개인정보는 서버에서 가린 뒤 저장합니다.</p>
            <textarea
              id="report-text"
              className="textarea"
              rows={5}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="report-url">
            의심 링크 <span className="optional">선택</span>
          </label>
          <input
            id="report-url"
            className="input"
            type="url"
            inputMode="url"
            maxLength={2048}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="report-memo">
            메모 <span className="optional">선택</span>
          </label>
          <p className="field-hint">예: 실제 택배사 번호가 아닙니다.</p>
          <textarea
            id="report-memo"
            className="textarea"
            rows={3}
            maxLength={500}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {error && <ErrorBox message={error} />}

        <div className="bottom-bar">
          <button type="submit" className="primary-btn" disabled={!canSubmit}>
            {sending ? '보내는 중…' : '신고하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
