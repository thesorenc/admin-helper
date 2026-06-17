// Support for `repeat: tooth` atoms: a single dental-chart selection drives one
// rendered/assembled block per tooth, with a once-stated preamble (anesthesia, etc.)
// hoisted above a PER-TOOTH delimiter so it is never repeated per tooth.

import { SENTINEL_OPEN as S0, SENTINEL_CLOSE as S1 } from './types'
import type { ParsedComponent } from './types'

/** Value key (within an instance scope) for the per-tooth chart selection. */
export const TEETH_KEY = '__teeth__'

/** Marks where a `repeat: tooth` atom's once-stated preamble ends and the
 *  repeated-per-tooth body begins. Authored in the vault; never shown in output. */
export const PER_TOOTH_DELIM = '=== PER TOOTH ==='

/** Ordered tooth tokens from a chart value like "1, 16, 17" (already sorted by the chart). */
export function parseTeethList(v: string | undefined): string[] {
  return (v || '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Split a repeat atom's bodyTemplate into [preamble, perTooth] on the delimiter.
 *  If the delimiter is absent, the whole body is per-tooth (preamble empty). */
export function splitRepeatTemplate(bodyTemplate: string): [string, string] {
  const i = bodyTemplate.indexOf(PER_TOOTH_DELIM)
  if (i === -1) return ['', bodyTemplate]
  return [bodyTemplate.slice(0, i), bodyTemplate.slice(i + PER_TOOTH_DELIM.length)]
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
