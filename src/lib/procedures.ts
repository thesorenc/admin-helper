import { OP_TEMPLATES, COMPONENTS, PULL_SHEETS, ATOMS } from '@/content'

/**
 * A procedure is an ATOMIC building block: one operative step you add to a case.
 * Each atom carries its own op-note snippet (the atom's body) plus frontmatter links
 * to the pull sheet, post-op handout(s), and Rx it contributes to. The Case builder
 * library is the set of atoms; documents compose from whatever atoms are in the case.
 */
export interface Procedure {
  id: string
  name: string
  category: string
  /** the atom's own component id; its body is the composable op-note snippet */
  opTemplateId: string
  postopIds: string[]
  rxIds: string[]
  pullSheetId?: string
  /** flagged when a linked pairing is a best guess worth confirming */
  review: boolean
}

const compIds = new Set(COMPONENTS.map((c) => c.id))
const keep = (ids: string[]) => ids.filter((id) => compIds.has(id))
const PULL_SHEET_IDS = new Set(PULL_SHEETS.map((p) => p.id))

export const PROCEDURES: Procedure[] = ATOMS.map((a) => {
  const links = a.links ?? {}
  const pull = links.pullSheet
  return {
    id: a.id,
    name: a.title,
    category: a.category,
    opTemplateId: a.id,
    postopIds: keep(links.postop ?? []),
    rxIds: keep(links.rx ?? ['post-op-rx']),
    pullSheetId: pull && PULL_SHEET_IDS.has(pull) ? pull : undefined,
    review: a.flags.length > 0,
  }
})

const BY_ID = new Map(PROCEDURES.map((p) => [p.id, p]))
export const procedureById = (id: string) => BY_ID.get(id)

// Resolve any content id (atom snippet, component, pull sheet, op template) for assembly.
const COMP_BY_ID = new Map(
  [...ATOMS, ...COMPONENTS, ...PULL_SHEETS, ...OP_TEMPLATES].map((c) => [c.id, c]),
)
export const contentById = (id: string) => COMP_BY_ID.get(id)
