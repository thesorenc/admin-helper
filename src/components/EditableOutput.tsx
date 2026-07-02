import { useEffect, useRef } from 'react'
import { formatHtml } from './DocFormat'
import { downloadText } from '@/lib/export'
import { normalizePlainText } from '@/lib/normalize'
import { useCopy } from '@/lib/useCopy'

/**
 * A formatted, EDITABLE document for the pull sheet: renders the assembled text as
 * a structured contentEditable doc the user can tweak before printing. Manual edits
 * persist until the case composition changes (the effect only re-applies when `text`
 * changes, which happens when procedures are added/removed, not on field keystrokes).
 * Nothing is persisted — edits are ephemeral, pre-print only (PHI hygiene).
 */
export function EditableOutput({ text, filename = 'pull-sheet.txt' }: { text: string; filename?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { copied, liveMsg, copy } = useCopy('Pull sheet copied')

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = formatHtml(text)
  }, [text])

  // innerText serialization varies by browser (NBSPs, doubled blank lines, trailing
  // spaces) — re-normalize on read so copied/downloaded text meets the output contract.
  const current = () => normalizePlainText(ref.current?.innerText ?? text)

  return (
    <>
      <div className="out-toolbar no-print">
        <span className="out-kind">
          <span className="dot print" />
          Editable · click to edit, then print
        </span>
        <span className="spacer" />
        <button className={'btn-primary' + (copied ? ' copied' : '')} onClick={() => copy(current())}>
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
        />
      </div>
    </>
  )
}
