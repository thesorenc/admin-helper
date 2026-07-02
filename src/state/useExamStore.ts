import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PE_SYSTEMS, ROS_SYSTEMS } from '@/lib/exam/content'
import type { ExamRecord, ExamSystem, Mark } from '@/lib/exam/types'

export type Section = 'pe' | 'ros'

// Bump when the persisted SHAPE changes; older sessions are discarded on rehydrate.
const EXAM_VERSION = 2

// Signature over the content shape (system + element ids). If the typed exam config
// changes between deploys, a stored mark could re-bind to a different element of the
// same system. This cheap hash changes whenever the config does, so we drop stale state
// rather than silently mis-binding it (mirrors useCaseStore's guard).
function contentSignature(): string {
  let h = 0
  const push = (s: string) => {
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  }
  for (const sys of [...PE_SYSTEMS, ...ROS_SYSTEMS]) {
    push(sys.id)
    for (const el of sys.elements) push(el.id)
  }
  return String(h >>> 0)
}
const CONTENT_SIG = contentSignature()

function initRecords(systems: ExamSystem[]): Record<string, ExamRecord> {
  return Object.fromEntries(systems.map((s) => [s.id, { marks: {}, detail: {}, comment: '' }]))
}
const systemsFor = (section: Section) => (section === 'pe' ? PE_SYSTEMS : ROS_SYSTEMS)

/**
 * Drop an element's primary detail value and its `${id}.*` sub-keys. `keepNote`
 * preserves `${id}.note` — a note may annotate a negative clause, so flipping a
 * finding to '-' keeps it, while un-addressing the finding drops everything.
 */
function clearElemDetail(detail: Record<string, string>, elemId: string, keepNote = false): Record<string, string> {
  const prefix = `${elemId}.`
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(detail)) {
    if (k === elemId) continue
    if (k.startsWith(prefix) && !(keepNote && k === `${elemId}.note`)) continue
    out[k] = v
  }
  return out
}

export type Modality = 'PE' | 'ROS'

interface ExamState {
  pe: Record<string, ExamRecord>
  ros: Record<string, ExamRecord>
  /** UI position (persisted so tab switches / refreshes don't lose your place). */
  modality: Modality
  activePE: string
  activeROS: string
  setModality: (m: Modality) => void
  setActive: (section: Section, sysId: string) => void
  /** Set an element's exact mark ('+'/'-', or null to un-address) and optionally its detail. */
  selectChoice: (section: Section, sysId: string, elemId: string, mark: Mark | null, value?: string) => void
  setDetail: (section: Section, sysId: string, elemId: string, value: string) => void
  setComment: (section: Section, sysId: string, value: string) => void
  /** Mark every element in the system a pertinent negative (explicit "rest normal"). */
  allNegative: (section: Section, sysId: string) => void
  /**
   * Mark every UNMARKED element of every system in the section negative — documents a
   * fully normal exam / "otherwise negative" ROS without touching findings already marked.
   */
  allNegativeAll: (section: Section) => void
  /** Clear all marks (and detail) for the system. */
  clearSystem: (section: Section, sysId: string) => void
  reset: () => void
}

const DEFAULT_ACTIVE = { pe: 'mf', ros: 'rent' } as const

// Persisted to sessionStorage so a refresh keeps the exam. NOT PHI: only marks, detail
// values, and free-text comments are stored, and sessionStorage clears on tab close.
export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      pe: initRecords(PE_SYSTEMS),
      ros: initRecords(ROS_SYSTEMS),
      modality: 'PE',
      activePE: DEFAULT_ACTIVE.pe,
      activeROS: DEFAULT_ACTIVE.ros,
      setModality: (modality) => set({ modality }),
      setActive: (section, sysId) => set(section === 'pe' ? { activePE: sysId } : { activeROS: sysId }),
      selectChoice: (section, sysId, elemId, mark, value) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          if (!r) return {}
          const marks = { ...r.marks }
          let detail: Record<string, string>
          if (mark === null) {
            // Un-address: drop the element's data so a later re-mark starts clean.
            delete marks[elemId]
            detail = clearElemDetail(r.detail, elemId)
          } else {
            marks[elemId] = mark
            // A '-' never carries positive detail; keep only the note.
            detail = mark === '-' ? clearElemDetail(r.detail, elemId, true) : { ...r.detail }
            if (value !== undefined) detail[elemId] = value
          }
          return { [section]: { ...map, [sysId]: { ...r, marks, detail } } } as Partial<ExamState>
        }),
      setDetail: (section, sysId, elemId, value) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          if (!r) return {}
          return { [section]: { ...map, [sysId]: { ...r, detail: { ...r.detail, [elemId]: value } } } } as Partial<ExamState>
        }),
      setComment: (section, sysId, value) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          if (!r) return {}
          return { [section]: { ...map, [sysId]: { ...r, comment: value } } } as Partial<ExamState>
        }),
      allNegative: (section, sysId) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          const sys = systemsFor(section).find((x) => x.id === sysId)
          if (!r || !sys) return {}
          const marks = { ...r.marks }
          for (const el of sys.elements) marks[el.id] = '-'
          // Every element is now '-': positive detail values are stale; notes survive.
          const detail: Record<string, string> = {}
          for (const [k, v] of Object.entries(r.detail)) if (k.endsWith('.note')) detail[k] = v
          return { [section]: { ...map, [sysId]: { ...r, marks, detail } } } as Partial<ExamState>
        }),
      allNegativeAll: (section) =>
        set((s) => {
          const map = { ...s[section] }
          for (const sys of systemsFor(section)) {
            const r = map[sys.id]
            if (!r) continue
            const marks = { ...r.marks }
            for (const el of sys.elements) if (!marks[el.id]) marks[el.id] = '-'
            map[sys.id] = { ...r, marks }
          }
          return { [section]: map } as Partial<ExamState>
        }),
      clearSystem: (section, sysId) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          if (!r) return {}
          return { [section]: { ...map, [sysId]: { marks: {}, detail: {}, comment: '' } } } as Partial<ExamState>
        }),
      reset: () => set({ pe: initRecords(PE_SYSTEMS), ros: initRecords(ROS_SYSTEMS) }),
    }),
    {
      name: 'omfs-exam',
      storage: createJSONStorage(() => sessionStorage),
      version: EXAM_VERSION,
      partialize: (s) => ({
        pe: s.pe,
        ros: s.ros,
        modality: s.modality,
        activePE: s.activePE,
        activeROS: s.activeROS,
        sig: CONTENT_SIG,
      }),
      migrate: () => undefined as unknown as ExamState,
      // Start from fresh records and overlay only valid persisted ones, so a malformed
      // or content-incompatible blob can never crash assembly or drop a system.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ExamState> & { sig?: string }
        if (p.sig !== CONTENT_SIG) return current
        const hydrate = (systems: ExamSystem[], stored: unknown): Record<string, ExamRecord> => {
          const out = initRecords(systems)
          if (stored && typeof stored === 'object') {
            for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
              if (!out[k] || !v || typeof v !== 'object') continue
              const r = v as Partial<ExamRecord>
              const marks: Record<string, Mark> = {}
              if (r.marks && typeof r.marks === 'object') {
                for (const [mk, mv] of Object.entries(r.marks)) if (mv === '+' || mv === '-') marks[mk] = mv
              }
              const detail: Record<string, string> = {}
              if (r.detail && typeof r.detail === 'object') {
                for (const [dk, dv] of Object.entries(r.detail)) if (typeof dv === 'string') detail[dk] = dv
              }
              out[k] = {
                marks,
                detail,
                comment: typeof r.comment === 'string' ? r.comment : '',
              }
            }
          }
          return out
        }
        return {
          ...current,
          pe: hydrate(PE_SYSTEMS, p.pe),
          ros: hydrate(ROS_SYSTEMS, p.ros),
          modality: p.modality === 'ROS' ? 'ROS' : 'PE',
          activePE: PE_SYSTEMS.some((s) => s.id === p.activePE) ? p.activePE! : DEFAULT_ACTIVE.pe,
          activeROS: ROS_SYSTEMS.some((s) => s.id === p.activeROS) ? p.activeROS! : DEFAULT_ACTIVE.ros,
        }
      },
    },
  ),
)
