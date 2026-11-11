import { Fragment } from 'react'
import type { SourceOut } from '../api/types'
import { isWebUrl } from '../lib/format'
import { Icon } from './Icon'

// "…입니다 [1]." 의 [번호]를 출처 칩으로 바꿔 보여 준다
export function CitedText({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const parts = text.split(/(\[\d+\])/g)
  return (
    <p className="cited">
      {parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part)
        if (!m) return <Fragment key={i}>{part}</Fragment>
        const n = Number(m[1])
        return (
          <button key={i} type="button" className="cite" onClick={() => onCite?.(n)} aria-label={`출처 ${n}`}>
            {n}
          </button>
        )
      })}
    </p>
  )
}

export function SourceList({ sources, idPrefix }: { sources: SourceOut[]; idPrefix: string }) {
  if (sources.length === 0) return null
  return (
    <ol className="sources">
      {sources.map((s) => (
        <li key={s.n} id={`${idPrefix}-${s.n}`} className={s.used ? 'is-used' : ''}>
          <span className="source-n">{s.n}</span>
          {isWebUrl(s.url) ? (
            <a href={s.url} target="_blank" rel="noreferrer noopener">
              {s.title}
              <Icon name="external" size={13} />
            </a>
          ) : (
            <span>{s.title}</span>
          )}
          {s.used && <span className="tag">인용</span>}
        </li>
      ))}
    </ol>
  )
}
