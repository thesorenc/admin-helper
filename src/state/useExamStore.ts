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

interface ExamState {
  pe: Record<string, ExamRecord>
  ros: Record<string, ExamRecord>
  /** Toggle an element to '+' / '-'; clicking the active mark again clears it. */
  setMark: (section: Section, sysId: string, elemId: string, mark: Mark) => void
  setDetail: (section: Section, sysId: string, elemId: string, value: string) => void
  setComment: (section: Section, sysId: string, value: string) => void
  /** Mark every element in the system a pertinent negative (explicit "rest normal"). */
  allNegative: (section: Section, sysId: string) => void
  /** Clear all marks (and detail) for the system. */
  clearSystem: (section: Section, sysId: string) => void
  reset: () => void
}

// Persisted to sessionStorage so a refresh keeps the exam. NOT PHI: only marks, detail
// values, and free-text comments are stored, and sessionStorage clears on tab close.
export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      pe: initRecords(PE_SYSTEMS),
      ros: initRecords(ROS_SYSTEMS),
      setMark: (section, sysId, elemId, mark) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          if (!r) return {}
          const marks = { ...r.marks }
          if (marks[elemId] === mark) delete marks[elemId]
          else marks[elemId] = mark
          return { [section]: { ...map, [sysId]: { ...r, marks } } } as Partial<ExamState>
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
          return { [section]: { ...map, [sysId]: { ...r, marks } } } as Partial<ExamState>
        }),
      clearSystem: (section, sysId) =>
        set((s) => {
          const map = s[section]
          const r = map[sysId]
          if (!r) return {}
          return { [section]: { ...map, [sysId]: { ...r, marks: {}, detail: {} } } } as Partial<ExamState>
        }),
      reset: () => set({ pe: initRecords(PE_SYSTEMS), ros: initRecords(ROS_SYSTEMS) }),
    }),
    {
      name: 'omfs-exam',
      storage: createJSONStorage(() => sessionStorage),
      version: EXAM_VERSION,
      partialize: (s) => ({ pe: s.pe, ros: s.ros, sig: CONTENT_SIG }),
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
              out[k] = {
                marks,
                detail: r.detail && typeof r.detail === 'object' ? (r.detail as Record<string, string>) : {},
                comment: typeof r.comment === 'string' ? r.comment : '',
              }
            }
          }
          return out
        }
        return { ...current, pe: hydrate(PE_SYSTEMS, p.pe), ros: hydrate(ROS_SYSTEMS, p.ros) }
      },
    },
  ),
)
