import { describe, it, expect, beforeEach } from 'vitest'
import { useExamStore } from '../src/state/useExamStore'
import { PE_SYSTEMS } from '../src/lib/exam/content'

// A PE system + element with a detail-carrying control to exercise state hygiene.
const sys = PE_SYSTEMS[0]
const el = sys.elements[0]

beforeEach(() => {
  useExamStore.getState().reset()
})

describe('useExamStore — state hygiene', () => {
  it('un-addressing a finding drops its detail and note', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '+', 'some value')
    s.setDetail('pe', sys.id, `${el.id}.note`, 'a note')
    s.setDetail('pe', sys.id, `${el.id}.side`, 'left')
    useExamStore.getState().selectChoice('pe', sys.id, el.id, null)
    const rec = useExamStore.getState().pe[sys.id]
    expect(rec.marks[el.id]).toBeUndefined()
    expect(rec.detail[el.id]).toBeUndefined()
    expect(rec.detail[`${el.id}.note`]).toBeUndefined()
    expect(rec.detail[`${el.id}.side`]).toBeUndefined()
  })

  it('flipping to negative drops stale positive detail AND the positive-context note', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '+', 'some value')
    s.setDetail('pe', sys.id, `${el.id}.note`, 'a note about the positive')
    useExamStore.getState().selectChoice('pe', sys.id, el.id, '-')
    const rec = useExamStore.getState().pe[sys.id]
    expect(rec.marks[el.id]).toBe('-')
    expect(rec.detail[el.id]).toBeUndefined() // no resurfacing on later re-mark
    // a note authored under '+' must not trail the pertinent negative
    expect(rec.detail[`${el.id}.note`]).toBeUndefined()
  })

  it('a note authored while negative survives re-selecting the negative', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '-')
    s.setDetail('pe', sys.id, `${el.id}.note`, 'resolved since last visit')
    useExamStore.getState().selectChoice('pe', sys.id, el.id, '-')
    expect(useExamStore.getState().pe[sys.id].detail[`${el.id}.note`]).toBe('resolved since last visit')
  })

  it('flipping to positive drops a note authored under the negative', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '-')
    s.setDetail('pe', sys.id, `${el.id}.note`, 'a note about the negative')
    useExamStore.getState().selectChoice('pe', sys.id, el.id, '+', 'v')
    const rec = useExamStore.getState().pe[sys.id]
    expect(rec.marks[el.id]).toBe('+')
    expect(rec.detail[`${el.id}.note`]).toBeUndefined()
  })

  it('un-addressing one finding leaves its neighbors untouched', () => {
    const other = sys.elements[1]
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '+', 'v1')
    s.selectChoice('pe', sys.id, other.id, '+', 'v2')
    useExamStore.getState().selectChoice('pe', sys.id, el.id, null)
    const rec = useExamStore.getState().pe[sys.id]
    expect(rec.marks[other.id]).toBe('+')
    expect(rec.detail[other.id]).toBe('v2')
  })

  it('allNegative fills only untouched elements — a recorded positive is never flipped', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '+', 'some value')
    s.setDetail('pe', sys.id, `${el.id}.note`, 'a note')
    useExamStore.getState().allNegative('pe', sys.id)
    const rec = useExamStore.getState().pe[sys.id]
    // the documented positive survives, detail and note intact
    expect(rec.marks[el.id]).toBe('+')
    expect(rec.detail[el.id]).toBe('some value')
    expect(rec.detail[`${el.id}.note`]).toBe('a note')
    // every other element in the system becomes a pertinent negative
    for (const e of sys.elements) if (e.id !== el.id) expect(rec.marks[e.id]).toBe('-')
  })

  it('allNegativeAll fills every unmarked sweepable element but preserves findings and skips sweep:false', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '+', 'positive finding')
    useExamStore.getState().allNegativeAll('pe')
    const state = useExamStore.getState()
    // the documented positive survives, with its detail
    expect(state.pe[sys.id].marks[el.id]).toBe('+')
    expect(state.pe[sys.id].detail[el.id]).toBe('positive finding')
    // everything else across ALL systems is a pertinent negative — EXCEPT
    // maneuver-specific claims (sweep:false), which the one-tap sweep must not assert
    for (const system of PE_SYSTEMS) {
      for (const e of system.elements) {
        if (system.id === sys.id && e.id === el.id) continue
        if (e.sweep === false) expect(state.pe[system.id].marks[e.id]).toBeUndefined()
        else expect(state.pe[system.id].marks[e.id]).toBe('-')
      }
    }
    // the exclusion list is intentional and exact: GCS, hemotympanum, salivary flow
    expect(
      PE_SYSTEMS.flatMap((sy) => sy.elements.filter((e) => e.sweep === false).map((e) => e.id)).sort(),
    ).toEqual(['gcs', 'hemo', 'salflow'])
    // ros untouched
    expect(Object.values(state.ros).every((r) => Object.keys(r.marks).length === 0)).toBe(true)
  })

  it('clearSystem clears marks, detail, AND the comment (matches the button label)', () => {
    const s = useExamStore.getState()
    s.selectChoice('pe', sys.id, el.id, '+', 'v')
    s.setComment('pe', sys.id, 'system comment')
    useExamStore.getState().clearSystem('pe', sys.id)
    const rec = useExamStore.getState().pe[sys.id]
    expect(rec.marks).toEqual({})
    expect(rec.detail).toEqual({})
    expect(rec.comment).toBe('')
  })
})
