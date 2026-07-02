// Deterministic builder: turns the exam state (one ExamRecord per system) into
// paste-ready text. Pure and side-effect-free — unit-tested, identical for display + copy.
//
// Only marked elements appear. PE renders each selection as a clause (positives first,
// then pertinent negatives); ROS keeps the conventional "Positive for … / Denies …".

import { PE_SYSTEMS, ROS_SYSTEMS } from './content'
import { cap } from '../text'
import type { ExamElement, ExamRecord, ExamSystem } from './types'

export interface ExamLine {
  label: string
  text: string
  abnormal: boolean
}

export interface ExamSection {
  title: string
  lines: ExamLine[]
}

const sideWord = (v: string) => v || 'right'

/** Positive (abnormal) phrase for an element. `get()` returns the primary detail value,
 *  `get(sub)` a sub-value (detail[`${id}.${sub}`]) used by multi-value controls. */
export function posPhrase(el: ExamElement, get: (sub?: string) => string): string {
  if (el.build) return el.build(get)
  const value = get()
  if (el.pos) return el.pos(el.detail === 'side' ? sideWord(value) : value)
  if (el.detail === 'side') return `${sideWord(value)} ${el.label.toLowerCase()}`
  if (el.detail === 'mm') return `${el.label.toLowerCase()} (${value || '__'} mm)`
  if ((el.detail === 'text' || el.detail === 'tooth') && value) return `${el.label.toLowerCase()} (${value})`
  return el.label.toLowerCase()
}

/** Pertinent-negative phrase for an element. */
export function negPhrase(el: ExamElement): string {
  return el.neg ?? `no ${el.label.toLowerCase()}`
}

/** Comment goes at the START of the system's line (before the findings). */
function withComment(text: string, comment: string): string {
  const c = comment.trim()
  if (!c) return text
  return text ? `${c} ${text}` : c
}

/** PE: positives (with detail) then pertinent negatives, each a clause. */
export function peLine(system: ExamSystem, rec: ExamRecord | undefined): ExamLine | null {
  if (!rec) return null
  // A per-element note (detail[`${id}.note`]) trails that finding's own clause.
  const note = (id: string) => {
    const n = (rec.detail[`${id}.note`] ?? '').trim()
    return n ? ` — ${n}` : ''
  }
  const positives = system.elements
    .filter((e) => rec.marks[e.id] === '+')
    .map((e) => posPhrase(e, (sub?: string) => rec.detail[sub ? `${e.id}.${sub}` : e.id] ?? '') + note(e.id))
  // Negatives: when EVERY member of a group is '-', the whole group collapses into its
  // idiomatic neg phrase ("PERRL") instead of listing each member; a partially-negative
  // group keeps the marked members' own negs ("left enophthalmos; no proptosis").
  const negatives: string[] = []
  const collapsed = new Set<string>()
  for (const e of system.elements) {
    if (rec.marks[e.id] !== '-') continue
    const gdef = e.group ? system.groups?.[e.group] : undefined
    if (e.group && gdef) {
      if (collapsed.has(e.group)) continue
      const members = system.elements.filter((m) => m.group === e.group)
      if (members.every((m) => rec.marks[m.id] === '-')) {
        collapsed.add(e.group)
        negatives.push(gdef.neg + members.map((m) => note(m.id)).join(''))
        continue
      }
    }
    negatives.push(negPhrase(e) + note(e.id))
  }
  const parts = [...positives, ...negatives]
  if (!parts.length && !rec.comment.trim()) return null
  const base = parts.length ? cap(parts.join('; ')) + '.' : ''
  return { label: system.name, text: withComment(base, rec.comment), abnormal: positives.length > 0 }
}

/** ROS: conventional symptom-review phrasing. */
export function rosLine(system: ExamSystem, rec: ExamRecord | undefined): ExamLine | null {
  if (!rec) return null
  const positives = system.elements.filter((e) => rec.marks[e.id] === '+').map((e) => e.label.toLowerCase())
  const negatives = system.elements.filter((e) => rec.marks[e.id] === '-').map((e) => e.label.toLowerCase())
  if (!positives.length && !negatives.length && !rec.comment.trim()) return null
  const parts: string[] = []
  if (positives.length) parts.push(`Positive for ${positives.join(', ')}.`)
  if (negatives.length) parts.push(`Denies ${negatives.join(', ')}.`)
  return { label: system.name, text: withComment(parts.join(' '), rec.comment), abnormal: positives.length > 0 }
}

/** Sectioned view for display. Empty sections are omitted. */
export function buildSections(pe: Record<string, ExamRecord>, ros: Record<string, ExamRecord>): ExamSection[] {
  const peLines = PE_SYSTEMS.map((s) => peLine(s, pe[s.id])).filter((l): l is ExamLine => l !== null)
  const rosLines = ROS_SYSTEMS.map((s) => rosLine(s, ros[s.id])).filter((l): l is ExamLine => l !== null)
  const sections: ExamSection[] = []
  if (peLines.length) sections.push({ title: 'PHYSICAL EXAMINATION', lines: peLines })
  if (rosLines.length) sections.push({ title: 'REVIEW OF SYSTEMS', lines: rosLines })
  return sections
}

/** Flat plain-text used by Copy / Download / Print. */
export function assembleText(pe: Record<string, ExamRecord>, ros: Record<string, ExamRecord>): string {
  return buildSections(pe, ros)
    .map((sec) => `${sec.title}\n${sec.lines.map((l) => `${l.label}: ${l.text}`).join('\n')}`)
    .join('\n\n')
}
