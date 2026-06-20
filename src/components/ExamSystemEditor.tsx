import { useState } from 'react'
import { PE_SYSTEMS, ROS_SYSTEMS } from '@/lib/exam/content'
import type { ExamElement, ExamOption } from '@/lib/exam/types'
import { useExamStore, type Section } from '@/state/useExamStore'
import { ToothPicker } from '@/components/FieldRenderer'

const SIDES = ['right', 'left', 'bilateral'] as const
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const splitList = (v: string) => (v ? v.split(', ').filter(Boolean) : [])
const toggleInList = (v: string, item: string) => {
  const a = splitList(v)
  const i = a.indexOf(item)
  if (i >= 0) a.splice(i, 1)
  else a.push(item)
  return a.join(', ')
}

type Getter = (sub?: string) => string
type Setter = (sub: string | undefined, value: string) => void

const GCS_PARTS = [
  { label: 'Eye', sub: 'e', range: [1, 2, 3, 4] },
  { label: 'Verbal', sub: 'v', range: [1, 2, 3, 4, 5] },
  { label: 'Motor', sub: 'm', range: [1, 2, 3, 4, 5, 6] },
]
const TRIG_NERVES: ExamOption[] = [
  { value: 'V1', label: 'V1' }, { value: 'V2', label: 'V2' }, { value: 'V3', label: 'V3' },
  { value: 'infraorbital', label: 'Infraorbital' }, { value: 'IAN', label: 'IAN' }, { value: 'mental', label: 'Mental' },
  { value: 'lingual', label: 'Lingual' }, { value: 'buccal', label: 'Buccal' },
]
const TRIG_TYPES: ExamOption[] = [
  { value: 'paresthesia', label: 'Paresthesia' }, { value: 'anesthesia', label: 'Anesthesia' }, { value: 'dysesthesia', label: 'Dysesthesia' },
]

/** Middle pane: edits one active system as a list of +/- elements. A '+' element reveals
 *  its detail control (legacy side/mm/text/tooth, or a richer select/measure/teeth/etc.).
 *  Remounted per system (keyed by the route), so the comment-open flag resets on switch. */
export function ExamSystemEditor({ section, systemId }: { section: Section; systemId: string }) {
  const [commentOpen, setCommentOpen] = useState(false)
  const system = (section === 'pe' ? PE_SYSTEMS : ROS_SYSTEMS).find((s) => s.id === systemId)
  const rec = useExamStore((s) => s[section][systemId])
  const setMark = useExamStore((s) => s.setMark)
  const setDetail = useExamStore((s) => s.setDetail)
  const setComment = useExamStore((s) => s.setComment)
  const allNegative = useExamStore((s) => s.allNegative)
  const clearSystem = useExamStore((s) => s.clearSystem)

  if (!system || !rec) return null

  return (
    <div className="proc-block">
      <div className="proc-block-head">
        <span className="pbh-icon">{system.abbr}</span>
        <div className="pbh-title">
          <div className="t">{system.name}</div>
          <div className="s">{section === 'pe' ? 'Physical exam' : 'Review of systems'}</div>
        </div>
      </div>
      <div className="proc-block-body">
        <div className="exam-actions">
          <button className="btn-sm" onClick={() => allNegative(section, systemId)}>All negative</button>
          <button className="btn-sm" onClick={() => clearSystem(section, systemId)}>Clear</button>
        </div>

        <div className="exam-rows">
          {system.elements.map((el) => {
            const m = rec.marks[el.id]
            const get: Getter = (sub) => rec.detail[sub ? `${el.id}.${sub}` : el.id] ?? ''
            const set: Setter = (sub, value) => setDetail(section, systemId, sub ? `${el.id}.${sub}` : el.id, value)
            return (
              <div className="exam-item" key={el.id}>
                <div className={'exam-row' + (m === '+' ? ' pos' : m === '-' ? ' neg' : '')}>
                  <span className="rs-label">{el.label}</span>
                  <span className="exam-pm">
                    <button className={'minus' + (m === '-' ? ' on' : '')} aria-label={`${el.label}: negative`} aria-pressed={m === '-'} onClick={() => setMark(section, systemId, el.id, '-')}>−</button>
                    <button className={'plus' + (m === '+' ? ' on' : '')} aria-label={`${el.label}: positive`} aria-pressed={m === '+'} onClick={() => setMark(section, systemId, el.id, '+')}>＋</button>
                  </span>
                </div>
                {m === '+' && (el.control || el.detail) && <ElementControl element={el} get={get} set={set} />}
              </div>
            )
          })}
        </div>

        <CommentField open={commentOpen || rec.comment.trim().length > 0} value={rec.comment} onOpen={() => setCommentOpen(true)} onChange={(v) => setComment(section, systemId, v)} />
      </div>
    </div>
  )
}

function ElementControl({ element, get, set }: { element: ExamElement; get: Getter; set: Setter }) {
  switch (element.control) {
    case 'teeth':
      return <div className="ex-detail col"><ToothPicker value={get()} onChange={(v) => set(undefined, v)} /></div>
    case 'select':
      return (
        <div className="ex-detail wrap">
          <ChipGroup options={element.options ?? []} value={get()} onChange={(v) => set(undefined, v)} />
          {element.side && <SideSeg value={get('side')} onChange={(v) => set('side', v)} />}
        </div>
      )
    case 'multiselect':
      return (
        <div className="ex-detail wrap">
          <ChipGroup multi options={element.options ?? []} value={get()} onChange={(v) => set(undefined, v)} />
          {element.side && <SideSeg value={get('side')} onChange={(v) => set('side', v)} />}
          {element.size && (
            <span className="size-in">
              <input className="d-text" inputMode="decimal" style={{ minWidth: 56 }} placeholder="size" aria-label={`${element.label} size`} value={get('size')} onChange={(e) => set('size', e.target.value)} />
              <span className="d-label">cm</span>
            </span>
          )}
        </div>
      )
    case 'measure':
      return (
        <div className="ex-detail wrap">
          <Stepper value={get()} onChange={(v) => set(undefined, v)} ariaLabel={`${element.label}${element.unit ? ` (${element.unit})` : ''}`} />
          {element.unit && <span className="d-label">{element.unit}</span>}
          {element.side && <SideSeg value={get('side')} onChange={(v) => set('side', v)} />}
        </div>
      )
    case 'gcs':
      return <GcsControl get={get} set={set} />
    case 'trigeminal':
      return <TrigeminalControl get={get} set={set} />
    default:
      return <LegacyDetail element={element} value={get()} onChange={(v) => set(undefined, v)} />
  }
}

function ChipGroup({ options, value, onChange, multi }: { options: ExamOption[]; value: string; onChange: (v: string) => void; multi?: boolean }) {
  const sel = multi ? splitList(value) : [value]
  return (
    <div className="chips">
      {options.map((o) => {
        const on = sel.includes(o.value)
        return (
          <button key={o.value} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onChange(multi ? toggleInList(value, o.value) : on ? '' : o.value)}>
            <span className="ck">✓</span>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SideSeg({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="miniseg" role="radiogroup" aria-label="side">
      {SIDES.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? 'on' : ''} onClick={() => onChange(value === o ? '' : o)}>
          {cap(o)}
        </button>
      ))}
    </span>
  )
}

function Stepper({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  const n = parseInt(value, 10)
  const step = (d: number) => onChange(String(Math.max(0, (Number.isFinite(n) ? n : 0) + d)))
  return (
    <span className="stepper">
      <button type="button" aria-label="decrease" onClick={() => step(-1)}>−</button>
      <input inputMode="numeric" value={value} placeholder="—" aria-label={ariaLabel} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} />
      <button type="button" aria-label="increase" onClick={() => step(1)}>+</button>
    </span>
  )
}

function GcsControl({ get, set }: { get: Getter; set: Setter }) {
  const total = GCS_PARTS.reduce((sum, p) => sum + (parseInt(get(p.sub), 10) || 0), 0)
  return (
    <div className="ex-detail col">
      {GCS_PARTS.map((p) => (
        <div className="gcs-row" key={p.sub}>
          <span className="d-label" style={{ minWidth: 52 }}>{p.label}</span>
          <div className="chips">
            {p.range.map((v) => {
              const on = get(p.sub) === String(v)
              return (
                <button key={v} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} aria-label={`${p.label} ${v}`} onClick={() => set(p.sub, on ? '' : String(v))}>
                  {v}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="d-label">Total: <b>{total || '—'}</b></div>
    </div>
  )
}

function TrigeminalControl({ get, set }: { get: Getter; set: Setter }) {
  return (
    <div className="ex-detail col">
      <div>
        <div className="d-label" style={{ marginBottom: 5 }}>Distribution</div>
        <ChipGroup multi options={TRIG_NERVES} value={get('nerves')} onChange={(v) => set('nerves', v)} />
      </div>
      <div>
        <div className="d-label" style={{ marginBottom: 5 }}>Deficit type</div>
        <ChipGroup options={TRIG_TYPES} value={get('type')} onChange={(v) => set('type', v)} />
      </div>
      <SideSeg value={get('side')} onChange={(v) => set('side', v)} />
    </div>
  )
}

function LegacyDetail({ element, value, onChange }: { element: ExamElement; value: string; onChange: (v: string) => void }) {
  if (element.detail === 'side') {
    const cur = value || 'right'
    return (
      <div className="ex-detail">
        <span className="d-label">specify</span>
        <span className="miniseg" role="radiogroup" aria-label={`${element.label} side`}>
          {SIDES.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={cur === o} className={cur === o ? 'on' : ''} onClick={() => onChange(o)}>
              {cap(o)}
            </button>
          ))}
        </span>
      </div>
    )
  }
  if (element.detail === 'mm') {
    return (
      <div className="ex-detail">
        <Stepper value={value} onChange={onChange} ariaLabel={`${element.label} (mm)`} />
        <span className="d-label">mm</span>
      </div>
    )
  }
  return (
    <div className="ex-detail">
      <input className="d-text" value={value} placeholder={element.hint ?? (element.detail === 'tooth' ? '#__' : 'specify')} aria-label={element.label} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function CommentField({ open, value, onOpen, onChange }: { open: boolean; value: string; onOpen: () => void; onChange: (v: string) => void }) {
  if (!open) {
    return <button className="btn-sm comment-btn" onClick={onOpen}>✎ Comment</button>
  }
  return (
    <div className="comment-wrap">
      <label className="np-label" style={{ marginBottom: 6 }}>Comment</label>
      <textarea className="comment-box" value={value} placeholder="Free text — appended to this system's note line" onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
