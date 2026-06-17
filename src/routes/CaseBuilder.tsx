import { useEffect, useMemo, useRef, useState } from 'react'
import { ATOMS } from '@/content'
import { PROCEDURES, procedureById, atomById } from '@/lib/procedures'
import { buildDocument, type DocKind } from '@/lib/caseAssembly'
import { splitTemplate, type TemplateSegment } from '@/lib/segments'
import { parseTeethList, splitRepeatTemplate, TEETH_KEY } from '@/lib/repeat'
import { makeSearch } from '@/lib/search'
import { InlineField, ToothPicker } from '@/components/FieldRenderer'
import type { ParsedComponent } from '@/lib/types'
import { useCaseStore } from '@/state/useCaseStore'
import { OutputPanel } from '@/components/OutputPanel'
import { RxPanel } from '@/components/RxPanel'
import { EditableOutput } from '@/components/EditableOutput'
import { EncounterBar } from '@/components/EncounterBar'

function abbrev(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? title).slice(0, 3).toUpperCase()
}

/** Render an atom's prose segments as inline fill-in-the-blank controls. In the per-tooth
 *  body, tooth placeholders are shown as a static chip (the chart above drives them). */
function Segments({
  segs,
  scope,
  values,
  setValue,
  staticTooth,
}: {
  segs: TemplateSegment[]
  scope: string
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  staticTooth?: string
}) {
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <span className="prose-text" key={i}>
              {seg.text}
            </span>
          )
        }
        if (seg.type === 'include') {
          return (
            <span className="prose-include" key={i}>
              [{seg.dotPhrase}]
            </span>
          )
        }
        if (staticTooth !== undefined && seg.field.kind === 'toothNumber') {
          return (
            <span className="ipill on" key={seg.field.id} aria-hidden="true">
              #{staticTooth}
            </span>
          )
        }
        return (
          <InlineField
            key={seg.field.id}
            field={seg.field}
            values={values}
            setValue={setValue}
            scope={scope}
          />
        )
      })}
    </>
  )
}

/** A `repeat: tooth` atom: a prominent dental chart drives the selection, the preamble
 *  (anesthesia) is filled once, and the per-tooth body previews one block per tooth. */
function PerToothBlock({
  op,
  instanceId,
  values,
  setValue,
}: {
  op: ParsedComponent
  instanceId: string
  values: Record<string, string>
  setValue: (key: string, value: string) => void
}) {
  const teethKey = `${instanceId}::${TEETH_KEY}`
  const teeth = parseTeethList(values[teethKey])
  const [preT, toothT] = splitRepeatTemplate(op.bodyTemplate)
  const preSegs = splitTemplate(preT, op.fields)
  const toothSegs = splitTemplate(toothT, op.fields)
  const staticTooth = teeth.length === 1 ? teeth[0] : teeth.length ? 'each' : '___'
  return (
    <>
      <div className="tooth-chart-field">
        <label className="f-label">Teeth</label>
        <ToothPicker value={values[teethKey] ?? ''} onChange={(v) => setValue(teethKey, v)} />
      </div>
      {preT.trim() && (
        <div className="prose-fill">
          <Segments segs={preSegs} scope={instanceId} values={values} setValue={setValue} />
        </div>
      )}
      <div className="per-tooth-divider">
        {teeth.length
          ? `Repeated per tooth — ${teeth.length} block${teeth.length > 1 ? 's' : ''}: #${teeth.join(', #')}`
          : 'Select teeth above to generate one block per tooth.'}
      </div>
      <div className="prose-fill">
        <Segments
          segs={toothSegs}
          scope={instanceId}
          values={values}
          setValue={setValue}
          staticTooth={staticTooth}
        />
      </div>
    </>
  )
}

const TABS: { kind: DocKind; label: string }[] = [
  { kind: 'opnote', label: 'Operative Note' },
  { kind: 'preop', label: 'Pre-op' },
  { kind: 'postop', label: 'Post-op' },
  { kind: 'rx', label: 'Rx' },
  { kind: 'pullsheet', label: 'Pull sheet' },
]

export function CaseBuilder() {
  const { items, values, encounter, add, remove, setValue, setEncounter, countOf } = useCaseStore()
  const [tab, setTab] = useState<DocKind>('opnote')
  const [q, setQ] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // ARIA tabs keyboard model: arrows move (and wrap) selection, Home/End jump to
  // the ends, and DOM focus follows the newly selected tab.
  function onTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = TABS.findIndex((t) => t.kind === tab)
    let next: number
    if (e.key === 'ArrowRight') next = (current + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    setTab(TABS[next].kind)
    tabRefs.current[next]?.focus()
  }

  const fuse = useMemo(() => makeSearch(ATOMS), [])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const groups = useMemo(() => {
    const matched = q.trim() ? new Set(fuse.search(q).map((r) => r.item.id)) : null
    const filtered = matched ? PROCEDURES.filter((p) => matched.has(p.id)) : PROCEDURES
    const map = new Map<string, typeof PROCEDURES>()
    for (const p of filtered) {
      const arr = map.get(p.category) ?? []
      arr.push(p)
      map.set(p.category, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [q, fuse])

  const doc = useMemo(
    () => buildDocument(items, values, encounter, tab),
    [items, values, encounter, tab],
  )

  return (
    <div className="workbench">
      {/* Library of procedures */}
      <aside className="pane library no-print">
        <div className="lib-head">
          <div className="lib-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search procedures…" />
          </div>
        </div>
        {groups.map(([cat, list]) => (
          <div className="lib-group" key={cat}>
            <h4>{cat}</h4>
            {list.map((p) => {
              const count = countOf(p.id)
              return (
                <button key={p.id} className="proc-card" onClick={() => add(p.id)}>
                  <span className="pc-icon">{abbrev(p.name)}</span>
                  <span className="pc-body">
                    <span className="pc-name">{p.name}</span>
                  </span>
                  {count > 0 ? <span className="pc-count">{count}</span> : <span className="pc-add">+</span>}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* Case builder */}
      <section className="pane config no-print">
        <div className="config-inner">
          <div className="config-hero">
            <h1>Case builder</h1>
            <p>
              Add procedures from the library and fill the variables. The Op Note, Post-op, and Rx
              documents on the right update instantly. Identifiers stay as EHR placeholders.
            </p>
          </div>

          <EncounterBar value={encounter} onChange={setEncounter} />

          {items.length === 0 ? (
            <div className="case-empty">
              <div className="ce-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h3>No procedures yet</h3>
              <p>Pick one or more procedures from the library to start building the case.</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const proc = procedureById(item.procedureId)
              if (!proc) return null
              // Render the atom's own op-note snippet (atomById, matching assembly) as
              // live prose: each placeholder becomes an inline fill-in-the-blank, so the
              // surrounding sentence is the context. Filling the form == drafting the note.
              const op = atomById(proc.opTemplateId)
              const segments = op ? splitTemplate(op.bodyTemplate, op.fields) : []
              const hasFields = segments.some((s) => s.type === 'field')
              return (
                <div className="proc-block" key={item.instanceId}>
                  <div className="proc-block-head">
                    <span className="pbh-icon">{abbrev(proc.name)}</span>
                    <div className="pbh-title">
                      <div className="t">
                        {proc.name} — #{idx + 1}
                      </div>
                      <div className="s">{proc.category}</div>
                    </div>
                    <button
                      className="res-x"
                      aria-label={`Remove ${proc.name}`}
                      title="Remove"
                      onClick={() => remove(item.instanceId)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="proc-block-body">
                    {op?.repeat === 'tooth' ? (
                      <PerToothBlock
                        op={op}
                        instanceId={item.instanceId}
                        values={values}
                        setValue={setValue}
                      />
                    ) : (
                      <>
                        <div className="prose-fill">
                          <Segments
                            segs={segments}
                            scope={item.instanceId}
                            values={values}
                            setValue={setValue}
                          />
                        </div>
                        {!hasFields && (
                          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 0' }}>
                            No fillable variables — ready as-is.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Documents */}
      <section id="docs-pane" className={'pane output' + (drawerOpen ? ' open' : '')}>
        <div className="out-head no-print" role="tablist" aria-label="Documents" onKeyDown={onTabKeyDown}>
          {TABS.map((t, i) => (
            <button
              key={t.kind}
              id={`tab-${t.kind}`}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              aria-selected={tab === t.kind}
              aria-controls="docs-panel"
              tabIndex={tab === t.kind ? 0 : -1}
              className="out-tab"
              onClick={() => setTab(t.kind)}
            >
              {t.label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button className="drawer-close" aria-label="Close documents" onClick={() => setDrawerOpen(false)}>
            ✕
          </button>
        </div>
        <div id="docs-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} style={{ display: 'contents' }}>
          {items.length === 0 && tab !== 'preop' ? (
            <div className="empty-out">
              <div>
                <div className="eo-mark">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <p>Add a procedure to generate the Operative Note, Post-op handout, Rx, and pull sheet.</p>
              </div>
            </div>
          ) : tab === 'pullsheet' ? (
            <EditableOutput key={tab} text={doc.text} filename="pull-sheet.txt" />
          ) : tab === 'rx' ? (
            <RxPanel
              key={tab}
              text={doc.text}
              flags={doc.flags}
              smartlinks={doc.smartlinks}
              filename="rx.txt"
            />
          ) : (
            <OutputPanel
              key={tab}
              text={doc.text}
              flags={doc.flags}
              smartlinks={doc.smartlinks}
              filename={`${tab}.txt`}
              patientFacing={tab === 'postop' || tab === 'preop'}
            />
          )}
        </div>
      </section>

      {drawerOpen && <div className="drawer-backdrop no-print" onClick={() => setDrawerOpen(false)} />}
      <button
        className="drawer-toggle no-print"
        aria-controls="docs-pane"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        Documents
      </button>
    </div>
  )
}
