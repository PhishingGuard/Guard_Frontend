import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { AskResponse } from '../api/types'
import { CitedText, SourceList } from '../components/Cited'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/Layout'
import { VerdictBadge } from '../components/Verdict'
import { getCachedResult } from '../lib/checkStore'
import { scrollToSource } from '../lib/scroll'
import { useSlowFlag } from '../lib/useAsync'

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'bot'; res: AskResponse }
  | { id: number; role: 'error'; text: string }

const EXAMPLES = [
  '택배 문자 링크를 눌렀는데 어떻게 해야 해?',
  '모르는 앱을 설치했어요. 지금 뭘 해야 하나요?',
  '가족이라며 상품권을 사 달라는 문자가 왔어요',
  '계좌번호를 알려 줬는데 위험한가요?',
]

let nextId = 1
// 탭을 옮겨도 대화가 남도록 화면 밖에 보관 (새로고침하면 비워짐)
let savedMessages: Message[] = []

export function Ask({ checkId }: { checkId?: string }) {
  const [messages, setMessages] = useState<Message[]>(() => savedMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [linked, setLinked] = useState(!!checkId)
  const endRef = useRef<HTMLDivElement>(null)
  const slow = useSlowFlag(sending, 8000)
  const result = checkId ? getCachedResult(checkId) : undefined

  useEffect(() => {
    savedMessages = messages
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const send = async (question: string) => {
    const q = question.trim()
    if (q.length < 2 || sending) return
    setInput('')
    setMessages((m) => [...m, { id: nextId++, role: 'user', text: q }])
    setSending(true)
    try {
      const res = await api.ask({ question: q, check_id: linked ? checkId : null })
      setMessages((m) => [...m, { id: nextId++, role: 'bot', res }])
    } catch (e) {
      setMessages((m) => [...m, { id: nextId++, role: 'error', text: (e as Error).message }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="screen chat-screen">
      <TopBar title="물어보기" back={checkId ? true : undefined} />

      <div className="chat-body">
        {linked && checkId && (
          <div className="context-chip">
            {result ? <VerdictBadge verdict={result.verdict} compact /> : <Icon name="link" size={14} />}
            <span className="ellipsis">{result ? result.masked_text : '방금 판별한 문자'}에 대해 질문 중</span>
            <button type="button" className="icon-btn small" aria-label="연결 해제" onClick={() => setLinked(false)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="chat-intro">
            <span className="chat-intro-icon">
              <Icon name="chat" size={26} />
            </span>
            <h2>피싱이 걱정될 때 물어보세요</h2>
            <p className="field-hint">대응 가이드와 사례에서 찾아 출처와 함께 답합니다.</p>
            <div className="example-list">
              {EXAMPLES.map((e) => (
                <button key={e} type="button" className="example" onClick={() => send(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="bubble user">
              {m.text}
            </div>
          ) : m.role === 'error' ? (
            <div key={m.id} className="bubble error">
              <Icon name="alert" size={16} /> {m.text}
            </div>
          ) : (
            <BotAnswer key={m.id} id={m.id} res={m.res} />
          ),
        )}

        {sending && (
          <div className="bubble bot typing" aria-label="답을 작성하는 중">
            <span />
            <span />
            <span />
            {slow && <em className="field-hint">서버를 깨우는 중입니다…</em>}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요"
          maxLength={500}
          aria-label="질문"
        />
        <button type="submit" className="send-btn" disabled={input.trim().length < 2 || sending} aria-label="보내기">
          <Icon name="send" size={18} />
        </button>
      </form>
    </div>
  )
}

function BotAnswer({ id, res }: { id: number; res: AskResponse }) {
  const prefix = `ask${id}`
  return (
    <div className="bubble bot">
      <CitedText text={res.answer} onCite={(n) => scrollToSource(prefix, n)} />
      {res.actions.length > 0 && (
        <div className="bot-actions">
          <p className="sub-heading">지금 할 일</p>
          <ol className="numbered compact">
            {res.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </div>
      )}
      {res.sources.length > 0 && (
        <details className="bot-sources">
          <summary>출처 {res.sources.length}개</summary>
          <SourceList sources={res.sources} idPrefix={prefix} />
        </details>
      )}
    </div>
  )
}
