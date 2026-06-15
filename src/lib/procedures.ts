import type { ParsedComponent } from './types'
import { OP_TEMPLATES, COMPONENTS } from '@/content'

/**
 * A procedure = one operative template plus the post-op handout(s) and Rx that
 * accompany it. The pairings below are RULE-BASED best guesses derived from the
 * procedure's category/title; ones marked `review` are flagged in the UI for the
 * surgeon to confirm. Edit the rules here to change linkage.
 */
export interface Procedure {
  id: string
  name: string
  category: string
  opTemplateId: string
  postopIds: string[]
  rxIds: string[]
  /** true when the post-op pairing is a best-guess worth confirming */
  review: boolean
}

const have = new Set(COMPONENTS.map((c) => c.id))
const keep = (ids: string[]) => ids.filter((id) => have.has(id))

const EXTRACTION = 'post-op-instructions-extraction'
const ORIF = 'post-op-instructions-orif'
const ID = 'post-op-instructions-id'
const SINUS = 'sinus-precautions'
const RX = 'post-op-rx'

function linkFor(op: ParsedComponent): { postop: string[]; rx: string[]; review: boolean } {
  const t = op.title.toLowerCase()
  const cat = op.category
  let postop: string[] = []
  let review = false

  if (cat === 'Trauma') {
    postop = [ORIF] // ORIF / fracture care
    if (/hardware removal/.test(t)) review = true
  } else if (cat === 'Dentoalveolar & Implant') {
    postop = [EXTRACTION]
    if (/sinus|maxilla|le ?fort|aicbg|bone graft|implant|graft/.test(t)) postop.push(SINUS)
  } else if (cat === 'Pathology, Salivary & Infection') {
    if (/drainage|abscess|i&d/.test(t)) postop = [ID]
    else postop = [EXTRACTION]
  } else if (cat === 'Orthognathic') {
    postop = [ORIF]
    if (/le ?fort|sarpe/.test(t)) postop.push(SINUS)
    review = true
  } else if (cat === 'TMJ') {
    postop = [ORIF]
    review = true
  } else {
    // Cosmetic & Facial and anything else: no general handout yet (postop stays []).
    review = true
  }

  return { postop: keep([...new Set(postop)]), rx: keep([RX]), review }
}

export const PROCEDURES: Procedure[] = OP_TEMPLATES.map((op) => {
  const { postop, rx, review } = linkFor(op)
  return {
    id: op.id,
    name: op.title,
    category: op.category,
    opTemplateId: op.id,
    postopIds: postop,
    rxIds: rx,
    review,
  }
})

const BY_ID = new Map(PROCEDURES.map((p) => [p.id, p]))
export const procedureById = (id: string) => BY_ID.get(id)

const COMP_BY_ID = new Map([...OP_TEMPLATES, ...COMPONENTS].map((c) => [c.id, c]))
export const contentById = (id: string) => COMP_BY_ID.get(id)
