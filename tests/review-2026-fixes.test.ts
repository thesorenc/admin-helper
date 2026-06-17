import { describe, it, expect } from 'vitest'
import { PROCEDURES } from '../src/lib/procedures'
import { buildDocument } from '../src/lib/caseAssembly'
import { defaultEncounter, localISODate, ANESTHESIA, AIRWAY } from '../src/lib/encounter'
import { consolidateRx, isSuppressedToken, stripSuppressedLines } from '../src/lib/rx'
import { TEETH_KEY } from '../src/lib/repeat'
import type { CaseItem } from '../src/state/useCaseStore'

const enc = defaultEncounter()

describe('date defaults to LOCAL today (not UTC)', () => {
  it('localISODate builds YYYY-MM-DD from local calendar fields', () => {
    // Late-evening local time that is already "tomorrow" in UTC must still read as the
    // local day. toISOString() would return 2026-06-17 here; localISODate must not.
    const d = new Date(2026, 5, 16, 23, 30, 0) // local June 16, 23:30
    expect(localISODate(d)).toBe('2026-06-16')
  })
  it('defaultEncounter().date matches local today', () => {
    expect(defaultEncounter().date).toBe(localISODate())
  })
})

describe('encounter option lists', () => {
  it('anesthesia uses deep sedation, not moderate', () => {
    expect(ANESTHESIA).toContain('IV deep sedation')
    expect(ANESTHESIA).not.toContain('IV moderate sedation')
  })
  it('airway includes an Open option', () => {
    expect(AIRWAY).toContain('Open')
  })
})

describe('op note: no "Missing / to confirm" footer', () => {
  it('omits the missing block even with unfilled fields', () => {
    const proc = PROCEDURES.find((p) => p.id === 'dental-implant')!
    const { text } = buildDocument([{ instanceId: 'a', procedureId: proc.id }], {}, enc, 'opnote')
    expect(text).not.toMatch(/Missing \/ to confirm/i)
  })
})

describe('per-tooth expansion (repeat: tooth)', () => {
  const ext = PROCEDURES.find((p) => p.id === 'extraction-simple')!
  const build = (teeth: string) =>
    buildDocument(
      [{ instanceId: 'a', procedureId: ext.id }],
      { [`a::${TEETH_KEY}`]: teeth },
      enc,
      'opnote',
    ).text

  it('emits one block per selected tooth', () => {
    const text = build('1, 16')
    expect(text).toContain('Tooth #1 was tested')
    expect(text).toContain('Tooth #16 was tested')
  })

  it('states local anesthesia ONCE, not per tooth', () => {
    const text = build('1, 16, 17')
    const hits = (text.match(/Local anesthesia was achieved/g) ?? []).length
    expect(hits).toBe(1)
  })

  it('never leaks the PER-TOOTH delimiter or raw tooth token', () => {
    const text = build('8')
    expect(text).not.toContain('PER TOOTH')
    expect(text).not.toContain('[#__]')
  })

  it('with no teeth selected, still produces a single block (graceful)', () => {
    const text = build('')
    expect(text).toContain('Local anesthesia was achieved')
    // exactly one per-tooth body
    expect((text.match(/was tested for profound anesthesia/g) ?? []).length).toBe(1)
  })
})

describe('Rx consolidation + token suppression', () => {
  it('suppressed-token helpers match the leaking EHR tokens', () => {
    expect(isSuppressedToken('[ pfs_discharge_medications ]')).toBe(true)
    expect(isSuppressedToken('[Medications Given]')).toBe(true)
    expect(isSuppressedToken('Ibuprofen 600 mg')).toBe(false)
    expect(stripSuppressedLines('Rx:\n[ pfs_discharge_medications ]\nIbuprofen 600 mg')).not.toContain(
      'pfs_discharge_medications',
    )
  })

  it('two procedures yield ONE Rx: header, deduped, no leaking tokens', () => {
    const a = PROCEDURES.find((p) => p.id === 'extraction-simple')!
    const b = PROCEDURES.find((p) => p.id === 'dental-implant')!
    const items: CaseItem[] = [
      { instanceId: 'a', procedureId: a.id },
      { instanceId: 'b', procedureId: b.id },
    ]
    const { text } = buildDocument(items, {}, enc, 'rx')
    expect((text.match(/^Rx:$/gm) ?? []).length).toBe(1)
    expect(text).not.toContain('pfs_discharge_medications')
    expect(text).not.toContain('Medications Given')
    // a shared first-line analgesic appears once, not once per procedure
    expect((text.match(/Ibuprofen 600 mg/g) ?? []).length).toBe(1)
  })

  it('consolidateRx merges sub-headers and drops empty groups', () => {
    const out = consolidateRx([
      'Rx:\n[ Medications Given ]\nIbuprofen 600 mg PO\nAntibiotics:\nAmoxicillin 500 mg PO',
      'Rx:\nIbuprofen 600 mg PO\nOxycodone 5 mg PO',
    ])
    expect((out.match(/^Rx:$/gm) ?? []).length).toBe(1)
    expect((out.match(/Ibuprofen 600 mg/g) ?? []).length).toBe(1)
    expect(out).toContain('Antibiotics:')
    expect(out).toContain('Oxycodone 5 mg PO')
    expect(out).not.toContain('Medications Given')
  })
})

describe('arthroscopy consolidation', () => {
  it('single TMJ Arthroscopy atom exists; the two redundant ones are gone', () => {
    const ids = new Set(PROCEDURES.map((p) => p.id))
    expect(ids.has('tmj-arthroscopy')).toBe(true)
    expect(ids.has('tmj-arthroscopic-discopexy')).toBe(false)
    expect(ids.has('tmj-arthroscopy-lysis-lavage-prf')).toBe(false)
    expect(ids.has('tmj-arthrocentesis')).toBe(true) // kept separate
  })
})

describe('pull-sheet coverage', () => {
  it('every procedure except the non-tray accounting atom has a pull sheet', () => {
    const uncovered = PROCEDURES.filter((p) => !p.pullSheetId).map((p) => p.id)
    expect(uncovered).toEqual(['specimen-culture-hardware-accounting'])
  })
})
