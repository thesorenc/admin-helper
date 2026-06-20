// Type model for the standalone Exam builder (physical exam + review of systems).
// Content is a typed config in this repo (src/lib/exam/content.ts), NOT vault-authored.
// Zero-PHI: only marks / detail values / comments are ever held, never identifiers.
//
// Model: every system is a list of ELEMENTS. Each element is independently toggled
// '+' (positive / abnormal finding, optionally with a detail value) or '-' (a specific
// pertinent negative). Untouched elements never appear in the note — the default is empty.

/** Legacy single-value detail control shown on a '+' element. */
export type DetailKind = 'side' | 'mm' | 'text' | 'tooth'

/** Richer '+' controls (take precedence over `detail`). Multi-value controls encode
 *  their values into the flat `detail` map under `${elementId}.${subkey}` keys, so the
 *  ExamRecord shape never has to change. */
export type ControlKind = 'select' | 'multiselect' | 'measure' | 'teeth' | 'gcs' | 'trigeminal'

export type Mark = '+' | '-'

export interface ExamOption {
  value: string
  label: string
}

export interface ExamElement {
  id: string
  /** Neutral element name shown in the UI (e.g. "Extraocular movements", "Crepitus"). */
  label: string
  // ── '+' control: pick ONE of `control` or `detail` (control wins) ──
  /** Richer control revealed when '+'. */
  control?: ControlKind
  /** Options for select / multiselect controls. */
  options?: ExamOption[]
  /** Unit label for a measure control (e.g. 'mm', 'cm'). */
  unit?: string
  /** measure / multiselect also collect a laterality sub-control. */
  side?: boolean
  /** multiselect also collects a size sub-control (cm). */
  size?: boolean
  /** measure renders as an abnormal finding below this value (e.g. MIO < 35). */
  abnormalBelow?: number
  /** Legacy single-value detail control. */
  detail?: DetailKind
  /** Placeholder for 'text' / 'tooth' detail inputs. */
  hint?: string
  // ── phrasing ──
  /** Legacy positive phrase from a single detail value (for 'side' it's the laterality word). */
  pos?: (value: string) => string
  /** Positive phrase from a control's value(s). `get()` = primary value (detail[id]);
   *  `get(sub)` = a sub-value (detail[`${id}.${sub}`]). Used by multi-value controls. */
  build?: (get: (sub?: string) => string) => string
  /** Pertinent-negative phrase. Omit to default to `no <label lowercased>`. */
  neg?: string
}

export interface ExamSystem {
  id: string
  name: string
  /** Mono badge abbreviation, e.g. 'MF'. */
  abbr: string
  elements: ExamElement[]
}

// ── per-encounter state (persisted to sessionStorage, session-only, zero-PHI) ──

export interface ExamRecord {
  /** element id -> '+' (positive) | '-' (pertinent negative). Absent = not addressed. */
  marks: Record<string, Mark>
  /** element id -> detail value for '+' findings (a measurement is a numeric string). */
  detail: Record<string, string>
  comment: string
}
