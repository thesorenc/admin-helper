import { useEffect, useRef } from 'react'
import { formatHtml } from './DocFormat'
import { downloadText } from '@/lib/export'
import { normalizePlainText } from '@/lib/normalize'
import { useCopy, useCopyShortcut } from '@/lib/useCopy'

/**
 * A formatted, EDITABLE document for the pull sheet: renders the assembled text as
 * a structured contentEditable doc the user can tweak before printing. Manual edits
 * persist until the case composition changes (the effect only re-applies when `text`
 * changes, which happens when procedures are added/removed, not on field keystrokes).
 * Nothing is persisted — edits are ephemeral, pre-print only (PHI hygiene).
 */
export function EditableOutput({ text, filename = 'pull-sheet.txt' }: { text: string; filename?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const edited = useRef(false)
  const { copied, liveMsg, copy } = useCopy('Pull sheet copied')

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = formatHtml(text)
    edited.current = false
  }, [text])

  // The rendered DOM drops the "- " list markers, so a naive innerText read copies
  // markerless lines. Unedited, the assembled `text` IS the document — copy it verbatim.
  // After a manual edit, serialize the DOM block-by-block, restoring "- " on list items,
  // and re-normalize (innerText whitespace varies by browser).
  const serialize = () => {
    const root = ref.current
    if (!root) return text
    const lines: string[] = []
    for (const el of root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, p, li')) {
      const t = (el.innerText ?? '').trim()
      if (t) lines.push(el.tagName === 'LI' ? `- ${t}` : t)
    }
    return lines.length ? lines.join('\n') : (root.innerText ?? text)
  }
  const current = () => (edited.current ? normalizePlainText(serialize()) : text)
  useCopyShortcut(() => copy(current()))

  return (
    <>
      <div className="out-toolbar no-print">
        <span className="out-kind">
          <span className="dot print" />
          Editable · click to edit, then print
        </span>
        <span className="spacer" />
        <button className={'btn-primary' + (copied ? ' copied' : '')} title="Copy (Ctrl/⌘+Enter)" onClick={() => copy(current())}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button className="btn-sm" onClick={() => window.print()}>
          Print / PDF
        </button>
        <button className="btn-sm" onClick={() => downloadText(filename, current())}>
          Download
        </button>
        <button
          className="btn-sm"
          onClick={() => {
            if (ref.current) ref.current.innerHTML = formatHtml(text)
            edited.current = false
          }}
        >
          Reset
        </button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>
      <div className="out-scroll">
        <div
          className="doc pullsheet-doc"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          aria-label="Editable pull sheet — click to edit, then print"
          ref={ref}
          onInput={() => {
            edited.current = true
          }}
        />
      </div>
    </>
  )
}
