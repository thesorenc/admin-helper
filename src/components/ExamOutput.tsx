import { Fragment, useState } from 'react'
import { downloadText } from '@/lib/export'
import type { ExamSection } from '@/lib/exam/assemble'

/** Right pane: paste-ready PE/ROS as a clean mono block (.emr), copies clean to EMR.
 *  Display is derived from `sections`; Copy / Download / Print all use the raw `text`. */
export function ExamOutput({ sections, text }: { sections: ExamSection[]; text: string }) {
  const [copied, setCopied] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')
  const empty = sections.length === 0

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setLiveMsg('Exam copied')
      setTimeout(() => {
        setCopied(false)
        setLiveMsg('')
      }, 1500)
    } catch {
      window.prompt('Copy failed — select and copy manually:', text)
    }
  }

  return (
    <>
      <div className="out-toolbar no-print">
        <span className="out-kind">
          <span className="dot" />
          Formatted · copies clean to EMR
        </span>
        <span className="spacer" />
        <button className={'btn-primary' + (copied ? ' copied' : '')} onClick={copy} disabled={empty}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button className="btn-sm" onClick={() => window.print()} disabled={empty}>
          Print / PDF
        </button>
        <button className="btn-sm" onClick={() => downloadText('exam.txt', text)} disabled={empty}>
          Download
        </button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>

      <div className="out-scroll">
        {empty ? (
          <div className="empty-out">
            <div>
              <div className="eo-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v7h18v-7a2 2 0 0 0-2-2h-4" />
                  <path d="M9 11V5a3 3 0 0 1 6 0v6" />
                </svg>
              </div>
              <p>Pick a system on the left and mark it Normal or Abnormal — the paste-ready exam builds here.</p>
            </div>
          </div>
        ) : (
          <div className="emr">
            {sections.map((sec, i) => (
              <Fragment key={sec.title}>
                {i > 0 && '\n\n'}
                <span className="sec">{sec.title}</span>
                {'\n'}
                {sec.lines.map((l, j) => (
                  <Fragment key={l.label}>
                    {j > 0 && '\n'}
                    <span className="sys">{l.label}:</span> <span className={l.abnormal ? 'abn' : undefined}>{l.text}</span>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
