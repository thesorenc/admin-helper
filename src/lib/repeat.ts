// Support for `repeat: tooth | site` atoms: a single dental-chart selection drives one
// rendered/assembled block per tooth. A once-stated preamble (anesthesia) sits above the
// PER-TOOTH delimiter and a once-stated closure sits below the END delimiter, so neither
// is repeated per tooth.
//   - 'tooth': the per-item fields are SHARED across teeth (identical technique).
//   - 'site':  the per-item fields are INDEPENDENT per tooth (each fixture/site differs).

import { SENTINEL_OPEN as S0, SENTINEL_CLOSE as S1 } from './types'
import type { ParsedComponent } from './types'

/** Value key (within an instance scope) for the per-tooth chart selection. */
export const TEETH_KEY = '__teeth__'

/** Per-site (independent) value key for a field at a given tooth, within an instance. */
export const siteKey = (tooth: string, fieldId: string) => `site:${tooth}::${fieldId}`

/** Start of the repeated-per-tooth body. Authored in the vault; never shown in output. */
export const PER_TOOTH_DELIM = '=== PER TOOTH ==='
/** End of the repeated body; anything after is the once-stated closure. Optional. */
export const PER_TOOTH_END = '=== END PER TOOTH ==='

/** Ordered tooth tokens from a chart value like "1, 16, 17" (already sorted by the chart). */
export function parseTeethList(v: string | undefined): string[] {
  return (v || '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Split a repeat atom's bodyTemplate into [preamble, perItem, closure] on the delimiters.
 *  Missing delimiters degrade gracefully: no start ⇒ whole body is per-item; no end ⇒ no closure. */
export function splitRepeatTemplate(bodyTemplate: string): [string, string, string] {
  let pre = ''
  let rest = bodyTemplate
  const start = bodyTemplate.indexOf(PER_TOOTH_DELIM)
  if (start !== -1) {
    pre = bodyTemplate.slice(0, start)
    rest = bodyTemplate.slice(start + PER_TOOTH_DELIM.length)
  }
  let perItem = rest
  let closure = ''
  const end = rest.indexOf(PER_TOOTH_END)
  if (end !== -1) {
    perItem = rest.slice(0, end)
    closure = rest.slice(end + PER_TOOTH_END.length)
  }
  return [pre, perItem, closure]
}

/** The fields whose sentinels appear in a body slice (preamble / per-item / closure). */
export function fieldsIn(op: ParsedComponent, template: string) {
  return op.fields.filter((f) => template.includes(`${S0}${f.id}${S1}`))
}

/** A shallow sub-component over a body slice: only the fields whose sentinels appear in
 *  that slice are kept, so assemble() resolves exactly that section. `keepFlags` puts the
 *  component's reviewer flags (and thus the UNRESOLVED banner) on the preamble only. */
export function subComponent(
  op: ParsedComponent,
  template: string,
  opts: { keepFlags: boolean },
): ParsedComponent {
  return {
    ...op,
    bodyTemplate: template,
    fields: op.fields.filter((f) => template.includes(`${S0}${f.id}${S1}`)),
    flags: opts.keepFlags ? op.flags : [],
  }
}
