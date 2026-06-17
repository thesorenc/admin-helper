import type { FlagAnnotation, ParsedComponent } from './types'
import { assemble } from './assembler'
import { normalizePlainText } from './normalize'
import { procedureById, contentById, atomById } from './procedures'
import { operativeHeader, type Encounter } from './encounter'
import { consolidateRx, isSuppressedToken, stripSuppressedLines } from './rx'
import { parseTeethList, splitRepeatTemplate, subComponent, TEETH_KEY } from './repeat'
import type { CaseItem } from '@/state/useCaseStore'

export type DocKind = 'opnote' | 'preop' | 'postop' | 'rx' | 'pullsheet'

export interface CaseDocument {
  text: string
  flags: FlagAnnotation[]
  smartlinks: string[]
}

const PREOP_TEXT = `PRE-OPERATIVE INSTRUCTIONS

Before your surgery:
- Nothing to eat or drink after midnight the night before (no food, water, gum, or candy) unless told otherwise.
- Take your usual morning medications with a small sip of water ONLY if your surgeon approved them. Hold blood thinners and diabetes medications as directed.
- If you are having sedation or general anesthesia, arrange a responsible adult to drive you home and stay with you for 24 hours.
- Wear loose, comfortable clothing with short sleeves. Leave jewelry and valuables at home.
- Brush your teeth the morning of surgery, but do not swallow water.
- If you become ill (fever, cold, cough) before surgery, call the clinic.

Day of surgery:
- Arrive at the scheduled time. Bring your ID and a current list of medications and allergies.
- Do not wear makeup, contact lenses, or nail polish.

[TEMPLATE: generic pre-op instructions. Confirm against your protocol and the specific procedure.]`

/** Per-site (independent) values for one tooth: the `site:<tooth>::` keys, prefix stripped. */
function siteValues(scoped: Record<string, string>, tooth: string): Record<string, string> {
  const prefix = `site:${tooth}::`
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(scoped)) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v
  }
  return out
}

/**
 * Assemble one atom's op-note snippet. For a `repeat: tooth | site` atom, the preamble
 * (before `=== PER TOOTH ===`) and closure (after `=== END PER TOOTH ===`) are stated once,
 * and the per-item body is emitted once per selected tooth. 'tooth' shares field values
 * across teeth (identical technique); 'site' reads independent per-tooth values (each
 * fixture differs). Non-repeat atoms assemble unchanged.
 */
export function assembleAtomBody(
  op: ParsedComponent,
  scoped: Record<string, string>,
): { text: string; flags: FlagAnnotation[]; smartlinks: string[] } {
  if (op.repeat !== 'tooth' && op.repeat !== 'site') {
    const r = assemble(op, scoped, { surfaceFlags: true })
    return { text: r.text, flags: r.flags, smartlinks: r.smartlinks }
  }
  const independent = op.repeat === 'site'
  const teeth = parseTeethList(scoped[TEETH_KEY])
  const [preTemplate, itemTemplate, closeTemplate] = splitRepeatTemplate(op.bodyTemplate)
  const hasPreamble = preTemplate.trim().length > 0
  const flags: FlagAnnotation[] = []
  const smartlinks = new Set<string>()
  const parts: string[] = []

  if (hasPreamble) {
    const pr = assemble(subComponent(op, preTemplate, { keepFlags: true }), scoped, {
      surfaceFlags: true,
    })
    flags.push(...pr.flags)
    pr.smartlinks.forEach((s) => smartlinks.add(s))
    if (pr.text.trim()) parts.push(pr.text.trim())
  }

  // No teeth chosen yet → emit one block with the raw [#__] placeholder as a reminder.
  const list = teeth.length ? teeth : ['']
  list.forEach((tooth, i) => {
    // When there's no preamble, the first item block carries the reviewer-flag banner.
    const keepFlags = !hasPreamble && i === 0
    const itemComp = subComponent(op, itemTemplate, { keepFlags })
    const tv = independent ? siteValues(scoped, tooth) : { ...scoped }
    for (const f of itemComp.fields) if (f.kind === 'toothNumber') tv[f.id] = tooth
    const tr = assemble(itemComp, tv, { surfaceFlags: keepFlags })
    if (keepFlags) flags.push(...tr.flags)
    tr.smartlinks.forEach((s) => smartlinks.add(s))
    if (tr.text.trim()) parts.push(tr.text.trim())
  })

  if (closeTemplate.trim()) {
    const cr = assemble(subComponent(op, closeTemplate, { keepFlags: false }), scoped, {
      surfaceFlags: false,
    })
    cr.smartlinks.forEach((s) => smartlinks.add(s))
    if (cr.text.trim()) parts.push(cr.text.trim())
  }

  // Strip the snippet's own "PROCEDURE:" line and authoring [TEMPLATE: ...] markers so the
  // preview and the op note read identically (the document names the block by heading).
  const text = parts
    .join('\n\n')
    .trim()
    .replace(/^PROCEDURE:.*\n+/i, '')
    .replace(/\[TEMPLATE:[^\]]*\]\s*/gi, '')
    .trim()
  return { text, flags, smartlinks: [...smartlinks] }
}

/** Field values for one instance, with the `${instanceId}::` prefix stripped. */
export function scopedValues(values: Record<string, string>, instanceId: string): Record<string, string> {
  const prefix = `${instanceId}::`
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(values)) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = val
  }
  return out
}

/**
 * Build one document (Op Note / Post-op / Rx) from the whole case.
 * - Op Note: each procedure instance's operative template, in order, with its own
 *   variables, under a "Procedure — #n" header, after the encounter header.
 * - Post-op / Rx: the union of linked components across the case (deduped), so two
 *   extractions don't print the handout twice.
 */
export function buildDocument(
  items: CaseItem[],
  values: Record<string, string>,
  encounter: Encounter,
  kind: DocKind,
): CaseDocument {
  const flags: FlagAnnotation[] = []
  const smartlinks = new Set<string>()
  const blocks: string[] = []

  if (kind === 'preop') {
    return { text: normalizePlainText(PREOP_TEXT), flags: [], smartlinks: [] }
  }

  if (kind === 'pullsheet') {
    const ids: string[] = []
    for (const item of items) {
      const pid = procedureById(item.procedureId)?.pullSheetId
      if (pid && !ids.includes(pid)) ids.push(pid)
    }
    for (const id of ids) {
      const comp = contentById(id)
      if (!comp) continue
      const r = assemble(comp, {}, { surfaceFlags: true })
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      blocks.push(r.text.trim())
    }
    return { text: normalizePlainText(blocks.join('\n\n')), flags, smartlinks: [...smartlinks] }
  }

  if (kind === 'opnote') {
    const procedureNames = items
      .map((item) => procedureById(item.procedureId)?.name)
      .filter((n): n is string => !!n)
    blocks.push(operativeHeader(encounter, procedureNames))

    items.forEach((item, idx) => {
      const proc = procedureById(item.procedureId)
      // Use the ATOM's own snippet (not contentById) so colliding op-template slugs
      // never substitute a full standalone note for the composable atom body.
      const op = proc && atomById(proc.opTemplateId)
      if (!proc || !op) return
      // No "Missing / to confirm" footer: unfilled fields already show in-place as their
      // raw [#__]/[token] in the note body, which is the natural reminder. The UNRESOLVED
      // reviewer-flag banner (surfaceFlags) stays for patient safety.
      const r = assembleAtomBody(op, scopedValues(values, item.instanceId))
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      // The "Name - #n" heading names the block; the snippet is already PROCEDURE-/marker-stripped.
      blocks.push(`${proc.name} - #${idx + 1}\n${'-'.repeat(40)}\n${r.text.trim()}`)
    })
  } else {
    // Post-op / Rx: dedupe linked component ids across the case.
    const ids: string[] = []
    const uncovered: string[] = [] // procedures with NO linked handout/Rx of this kind
    for (const item of items) {
      const proc = procedureById(item.procedureId)
      if (!proc) continue
      const linked = kind === 'postop' ? proc.postopIds : proc.rxIds
      if (linked.length === 0 && !uncovered.includes(proc.name)) uncovered.push(proc.name)
      for (const id of linked) {
        if (!ids.includes(id)) ids.push(id)
      }
    }
    const partTexts: string[] = []
    for (const id of ids) {
      const comp = contentById(id)
      if (!comp) continue
      const r = assemble(comp, {}, {
        // Rx and post-op both use the visible [TO BE COMPLETED] marker for unfilled
        // fields. For Rx this means a half-specified order (e.g. a steroid taper with
        // blank doses) is clearly flagged and starts unchecked, never copyable as raw "___".
        unfilledPolicy: 'sentinel',
        surfaceFlags: true,
      })
      flags.push(...r.flags)
      // Drop EHR-autofill tokens from the "Left for the EHR to fill" list.
      r.smartlinks.forEach((s) => {
        if (!isSuppressedToken(s)) smartlinks.add(s)
      })
      partTexts.push(r.text.trim())
    }
    if (kind === 'rx') {
      // One consolidated prescription across all procedures: a single "Rx:" header with
      // unique orders, instead of "Rx: …list… Rx: …list…" repeated per procedure.
      const merged = consolidateRx(partTexts)
      if (merged) blocks.push(merged)
    } else {
      // Post-op handouts stay per-component (each is a distinct patient handout), just
      // with the EHR-autofill tokens stripped.
      for (const t of partTexts) {
        const cleaned = stripSuppressedLines(t)
        if (cleaned) blocks.push(cleaned)
      }
    }
    // Patient-safety gate: a procedure with no linked post-op handout must NEVER
    // silently produce a blank page that could be printed and handed to a patient.
    // Surface a visible marker naming the uncovered procedure(s) instead.
    if (kind === 'postop' && uncovered.length) {
      const list = uncovered.map((n) => `- ${n}`).join('\n')
      blocks.push(
        `[NO POST-OP HANDOUT LINKED]\nNo post-operative instructions are on file for:\n${list}\n` +
          `Provide procedure-specific discharge instructions before the patient leaves.`,
      )
    }
  }

  return {
    text: normalizePlainText(blocks.join('\n\n')),
    flags,
    smartlinks: [...smartlinks],
  }
}
