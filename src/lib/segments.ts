// Splits a tokenized bodyTemplate back into an ordered list of prose runs and the
// fields embedded in them, so the UI can render an atom as its actual sentences with
// the placeholders as inline fill-in-the-blank controls (the surrounding sentence is
// the context). Pure + deterministic; the inverse of the tokenizer's sentinel pass.

import type { Field } from './types'
import { SENTINEL_OPEN as S0, SENTINEL_CLOSE as S1 } from './types'

export type TemplateSegment =
  | { type: 'text'; text: string }
  | { type: 'field'; field: Field }
  | { type: 'include'; dotPhrase: string }

const SEG_RE = new RegExp(`${S0}([^${S1}]+)${S1}`, 'g')

/** The atom's leading "PROCEDURE: ..." line names the block elsewhere; never shown inline. */
function stripProcedureLine(s: string): string {
  return s.replace(/^\s*PROCEDURE:.*(?:\n|$)/i, '')
}

export function splitTemplate(bodyTemplate: string, fields: Field[]): TemplateSegment[] {
  const byId = new Map(fields.map((f) => [f.id, f]))
  const out: TemplateSegment[] = []
  let last = 0
  let m: RegExpExecArray | null
  SEG_RE.lastIndex = 0
  let first = true
  while ((m = SEG_RE.exec(bodyTemplate))) {
    if (m.index > last) {
      let text = bodyTemplate.slice(last, m.index)
      if (first) text = stripProcedureLine(text)
      out.push({ type: 'text', text })
      first = false
    }
    const token = m[1]
    if (token.startsWith('include:')) {
      out.push({ type: 'include', dotPhrase: token.slice('include:'.length) })
    } else {
      const field = byId.get(token)
      if (field) out.push({ type: 'field', field })
    }
    last = SEG_RE.lastIndex
  }
  if (last < bodyTemplate.length) {
    let text = bodyTemplate.slice(last)
    if (first) text = stripProcedureLine(text)
    out.push({ type: 'text', text })
  }
  return out
}
