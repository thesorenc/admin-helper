import { describe, it, expect } from 'vitest'
import { peLine, rosLine, assembleText, posPhrase } from './assemble'
import { PE_SYSTEMS, ROS_SYSTEMS } from './content'
import type { ExamRecord } from './types'

const peSys = (id: string) => PE_SYSTEMS.find((s) => s.id === id)!
const rosSys = (id: string) => ROS_SYSTEMS.find((s) => s.id === id)!
const rec = (over: Partial<ExamRecord> = {}): ExamRecord => ({ marks: {}, detail: {}, comment: '', ...over })

describe('content integrity — group wiring', () => {
  it('every group reference resolves, has ≥2 members, and ids are unique per system', () => {
    for (const sys of [...PE_SYSTEMS, ...ROS_SYSTEMS]) {
      const ids = sys.elements.map((e) => e.id)
      expect(new Set(ids).size, `${sys.id}: duplicate element ids`).toBe(ids.length)
      for (const el of sys.elements) {
        if (!el.group) continue
        expect(sys.groups?.[el.group], `${sys.id}/${el.id}: group '${el.group}' undefined`).toBeTruthy()
      }
      for (const gid of Object.keys(sys.groups ?? {})) {
        const members = sys.elements.filter((e) => e.group === gid)
        expect(members.length, `${sys.id}: group '${gid}' needs ≥2 members`).toBeGreaterThanOrEqual(2)
        // members must be consecutive: the editor renders a group as one cluster
        const first = sys.elements.findIndex((e) => e.group === gid)
        const slice = sys.elements.slice(first, first + members.length)
        expect(slice.every((e) => e.group === gid), `${sys.id}: group '${gid}' members not consecutive`).toBe(true)
      }
    }
  })
})

describe('peLine — defaults & legacy toggle', () => {
  it('is empty by default', () => {
    expect(peLine(peSys('mf'), rec())).toBeNull()
    expect(peLine(peSys('mf'), undefined)).toBeNull()
  })

  it('legacy side detail: positives then idiomatic pertinent negatives', () => {
    const l = peLine(peSys('mf'), rec({ marks: { swell: '+', tender: '+', crep: '-', asym: '-' }, detail: { swell: 'left', tender: 'left mandibular body' } }))
    expect(l?.text).toBe('Left facial swelling; tenderness over the left mandibular body; no crepitus; face symmetric.')
    expect(l?.abnormal).toBe(true)
  })

  it('idiomatic negatives, not "no <label>"', () => {
    const l = peLine(peSys('eyes'), rec({ marks: { eom: '-', aniso: '-', sluggish: '-', fixed: '-' } }))
    expect(l?.text).toBe('EOMI; PERRL.') // fully-negative pupils group collapses to PERRL
    expect(l?.abnormal).toBe(false)
  })

  it('comment-only system still renders', () => {
    const l = peLine(peSys('neck'), rec({ comment: 'Collar in place; exam deferred.' }))
    expect(l?.text).toBe('Collar in place; exam deferred.')
    expect(l?.abnormal).toBe(false)
  })

  it('comment is prepended to the start of the system line', () => {
    const l = peLine(peSys('mf'), rec({ marks: { crep: '-' }, comment: 'Guarding noted.' }))
    expect(l?.text).toBe('Guarding noted. No crepitus.')
  })

  it('a per-finding note trails that finding only', () => {
    const l = peLine(peSys('mf'), rec({ marks: { swell: '+', crep: '-' }, detail: { swell: 'left', 'swell.note': 'extends to orbit' } }))
    expect(l?.text).toBe('Left facial swelling — extends to orbit; no crepitus.')
  })
})

describe('Tier-1 controls', () => {
  it('Facial nerve → House-Brackmann grade + side', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { facial: '+' }, detail: { facial: 'IV', 'facial.side': 'left' } }))
    expect(l?.text).toBe('Left House-Brackmann IV facial weakness.')
  })

  it('Facial nerve "−" emits HB I pertinent negative', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { facial: '-' } }))
    expect(l?.text).toBe('Facial nerve symmetric, House-Brackmann I.')
  })

  it('Occlusion (folded into Mouth) → stable vs malocclusion', () => {
    expect(peLine(peSys('io'), rec({ marks: { occmal: '-', occaob: '-', occpob: '-' } }))?.text).toBe(
      'Occlusion stable and reproducible.',
    )
    expect(peLine(peSys('io'), rec({ marks: { occmal: '+' } }))?.text).toBe('Malocclusion.')
  })

  it('Tooth fracture → multi-tooth list', () => {
    const l = peLine(peSys('io'), rec({ marks: { fx: '+' }, detail: { fx: '8, 9' } }))
    expect(l?.text).toBe('Fracture of #8, #9.')
  })

  it('Trigeminal → division/nerve + deficit type + side', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { sens: '+' }, detail: { 'sens.nerves': 'V3, IAN', 'sens.type': 'anesthesia', 'sens.side': 'left' } }))
    expect(l?.text).toBe('Left V3, IAN anesthesia.')
  })

  it('MIO → measurement, flags trismus below threshold', () => {
    expect(peLine(peSys('tmj'), rec({ marks: { mio: '+' }, detail: { mio: '22' } }))?.text).toBe('Limited opening, MIO 22 mm.')
    expect(peLine(peSys('tmj'), rec({ marks: { mio: '+' }, detail: { mio: '42' } }))?.text).toBe('MIO 42 mm.')
  })

  it('GCS → composite E/V/M with computed total', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { gcs: '+' }, detail: { 'gcs.e': '4', 'gcs.v': '4', 'gcs.m': '6' } }))
    expect(l?.text).toBe('GCS 14 (E4 V4 M6).')
  })

  it('Lymphadenopathy → laterality only (no grades)', () => {
    const l = peLine(peSys('neck'), rec({ marks: { lad: '+' }, detail: { lad: 'right' } }))
    expect(l?.text).toBe('Right cervical lymphadenopathy.')
  })
})

describe('rosLine', () => {
  it('splits positives and negatives', () => {
    const l = rosLine(rosSys('rent'), rec({ marks: { facpain: '+', facswell: '+', swallow: '-', hearing: '-' } }))
    expect(l?.text).toBe('Positive for facial pain, facial swelling. Denies difficulty swallowing, hearing loss.')
    expect(l?.abnormal).toBe(true)
  })
})

describe('assembleText', () => {
  it('labels present sections and omits empty ones', () => {
    const t = assembleText({ mf: rec({ marks: { crep: '-' } }) }, {})
    expect(t).toContain('PHYSICAL EXAMINATION')
    expect(t).not.toContain('REVIEW OF SYSTEMS')
  })

  it('is empty when nothing is addressed', () => {
    expect(assembleText({}, {})).toBe('')
  })
})

describe('content review — relabeled multi-state findings', () => {
  it('General appearance → well / ill / toxic', () => {
    expect(peLine(peSys('gen'), rec({ marks: { appearance: '-' } }))?.text).toBe('Well-appearing, well-nourished.')
    expect(peLine(peSys('gen'), rec({ marks: { appearance: '+' }, detail: { appearance: 'toxic' } }))?.text).toBe('Toxic-appearing.')
  })
  it('groups: co-occurring findings are independent elements', () => {
    // Globe: the orbital-floor pattern — enophthalmos AND hypoglobus, same side.
    expect(
      peLine(peSys('eyes'), rec({ marks: { enoph: '+', hypo: '+' }, detail: { enoph: 'right', hypo: 'right' } }))?.text,
    ).toBe('Right enophthalmos; right hypoglobus.')
    // Bilateral trauma: DIFFERENT sides per finding (inexpressible before groups).
    expect(
      peLine(peSys('eyes'), rec({ marks: { enoph: '+', propt: '+' }, detail: { enoph: 'right', propt: 'left' } }))?.text,
    ).toBe('Right enophthalmos; left proptosis.')
    // Salivary glands: the classic sialolithiasis presentation keeps BOTH findings.
    expect(
      peLine(peSys('neck'), rec({ marks: { submand: '+', stone: '+' }, detail: { submand: 'left' } }))?.text,
    ).toBe('Left submandibular swelling; palpable submandibular sialolith.')
    // Occlusion: anterior open bite plus a sided posterior open bite.
    expect(
      peLine(peSys('io'), rec({ marks: { occaob: '+', occpob: '+' }, detail: { occpob: 'right' } }))?.text,
    ).toBe('Anterior open bite; right posterior open bite.')
  })

  it('groups: mixed positive + explicit negatives ("Normal, then tap the finding")', () => {
    expect(
      peLine(peSys('eyes'), rec({ marks: { enoph: '+', propt: '-', hypo: '-' }, detail: { enoph: 'left' } }))?.text,
    ).toBe('Left enophthalmos; no proptosis; no hypoglobus.')
  })

  it('groups: a per-finding note survives the collapsed group negative', () => {
    expect(
      peLine(peSys('eyes'), rec({ marks: { aniso: '-', sluggish: '-', fixed: '-' }, detail: { 'sluggish.note': 'limited by edema' } }))?.text,
    ).toBe('PERRL — limited by edema.')
  })

  it('Periorbital group: collapses when fully negative, composes when mixed', () => {
    expect(peLine(peSys('eyes'), rec({ marks: { peri: '-', periecc: '-' } }))?.text).toBe(
      'No periorbital edema or ecchymosis.',
    )
    expect(
      peLine(peSys('eyes'), rec({ marks: { peri: '+', periecc: '-' }, detail: { peri: 'left' } }))?.text,
    ).toBe('Left periorbital edema; no periorbital ecchymosis.')
  })

  it('Dentition group: collapsed normal names all members; partial keeps per-finding negs', () => {
    expect(peLine(peSys('io'), rec({ marks: { dentition: '-', fx: '-', mob: '-' } }))?.text).toBe(
      'Dentition intact without fractures or mobility.',
    )
    expect(
      peLine(peSys('io'), rec({ marks: { dentition: '-', fx: '+', mob: '-' }, detail: { fx: '8, 9' } }))?.text,
    ).toBe('Fracture of #8, #9; dentition intact; no mobile dentition.')
  })

  it('multiselect stays for multi-VALUE single findings: Le Fort II/III', () => {
    expect(peLine(peSys('mf'), rec({ marks: { lefort: '+' }, detail: { lefort: '2, 3' } }))?.text).toBe('Le Fort II/III mobility.')
  })

  it('Occlusion → open-bite pattern', () => {
    expect(peLine(peSys('io'), rec({ marks: { occaob: '+' } }))?.text).toBe('Anterior open bite.')
  })
  it('Floor of mouth → indurated alone; soft when whole group negative', () => {
    expect(peLine(peSys('io'), rec({ marks: { fomind: '+' } }))?.text).toBe('Floor-of-mouth induration.')
    expect(peLine(peSys('io'), rec({ marks: { fomelev: '-', fomind: '-' } }))?.text).toBe('Floor of mouth soft and non-tender.')
  })
  it('Midface mobility → Le Fort grade', () => {
    expect(peLine(peSys('mf'), rec({ marks: { lefort: '+' }, detail: { lefort: '2' } }))?.text).toBe('Le Fort II mobility.')
  })
  it('CSF: emits "concerning for CSF leak", not a confirmed diagnosis', () => {
    expect(peLine(peSys('nose'), rec({ marks: { csf: '+' } }))?.text).toBe('Clear rhinorrhea concerning for CSF leak.')
  })
  it('Neck ROM → limited / nuchal rigidity', () => {
    expect(peLine(peSys('neck'), rec({ marks: { rom: '+' }, detail: { rom: 'nuchal' } }))?.text).toBe('Nuchal rigidity.')
  })
})

describe('posPhrase', () => {
  it('legacy custom positive phrase with side detail (value getter)', () => {
    const swell = peSys('mf').elements.find((e) => e.id === 'swell')!
    expect(posPhrase(swell, () => 'left')).toBe('left facial swelling')
  })
})
