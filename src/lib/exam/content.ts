// OMFS-tailored exam content as a typed repo config. Every system is a list of elements;
// the editor renders each element's CHOICES as inline buttons (or a dropdown when many).
// The FIRST button is the pertinent negative (`normalLabel`); the positive button uses
// `posLabel` (binary/detail/measure/teeth) or the `options` labels (select/multiselect).
// Button labels are independent of the emitted note text (`neg` / `pos` / `build`), so a
// label always reads as a clinical STATE, never a generic Absent/Present.
//
// Under the hood an element resolves to a +/− mark plus a `detail` value; the assembler
// turns it into note text. Multi-value controls encode into the flat detail map via
// `${id}.${subkey}` keys. Clinical wording is the user's to vet.

import type { ExamSystem } from './types'

const teeth = (v: string) => (v ? v.split(/,\s*/).filter(Boolean).map((t) => `#${t}`).join(', ') : '#__')

export const PE_SYSTEMS: ExamSystem[] = [
  {
    id: 'gen', name: 'General', abbr: 'GEN', elements: [
      { id: 'distress', label: 'Acute distress', control: 'select', normalLabel: 'None', options: [{ value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }], build: (g) => `in ${g() || 'acute'} distress`, neg: 'no acute distress' },
      { id: 'appearance', label: 'General appearance', control: 'select', normalLabel: 'Well-appearing', options: [{ value: 'ill', label: 'Ill-appearing' }, { value: 'toxic', label: 'Toxic-appearing' }], build: (g) => (g() === 'toxic' ? 'toxic-appearing' : 'ill-appearing'), neg: 'well-appearing, well-nourished' },
    ],
  },
  {
    id: 'mf', name: 'Head', abbr: 'HD', elements: [
      { id: 'swell', label: 'Facial swelling', detail: 'side', normalLabel: 'None', pos: (s) => `${s} facial swelling`, neg: 'no facial swelling' },
      { id: 'ecchy', label: 'Ecchymosis', detail: 'side', normalLabel: 'None', pos: (s) => `${s} facial ecchymosis`, neg: 'no ecchymosis' },
      { id: 'step', label: 'Bony step-off', detail: 'text', normalLabel: 'Stable', posLabel: 'Step-off', hint: 'e.g. infraorbital rim', pos: (v) => `palpable step-off${v ? ` at the ${v}` : ''}`, neg: 'no bony step-offs; midface and mandible stable' },
      { id: 'lefort', label: 'Midface mobility', control: 'select', normalLabel: 'Stable', options: [{ value: '1', label: 'Le Fort I' }, { value: '2', label: 'Le Fort II' }, { value: '3', label: 'Le Fort III' }], build: (g) => `Le Fort ${g() === '1' ? 'I' : g() === '2' ? 'II' : 'III'} mobility`, neg: 'midface stable to manipulation' },
      { id: 'crep', label: 'Crepitus', normalLabel: 'None', posLabel: 'Crepitus', pos: () => 'crepitus', neg: 'no crepitus' },
      { id: 'tender', label: 'Tenderness', detail: 'text', normalLabel: 'Non-tender', posLabel: 'Tender', hint: 'e.g. left mandibular body', pos: (v) => `tenderness${v ? ` over the ${v}` : ''}`, neg: 'non-tender to palpation' },
      { id: 'lac', label: 'Laceration', detail: 'text', normalLabel: 'Intact', posLabel: 'Laceration', hint: 'site / length', pos: (v) => `laceration${v ? ` (${v})` : ''}`, neg: 'overlying skin intact' },
      { id: 'asym', label: 'Facial asymmetry', normalLabel: 'Symmetric', posLabel: 'Asymmetric', pos: () => 'facial asymmetry', neg: 'face symmetric' },
    ],
  },
  {
    id: 'eyes', name: 'Eyes', abbr: 'EYE', elements: [
      { id: 'eom', label: 'Extraocular movements', detail: 'side', normalLabel: 'EOMI', pos: (s) => `restricted extraocular motion, ${s}`, neg: 'EOMI' },
      { id: 'pupils', label: 'Pupils', control: 'select', normalLabel: 'PERRL', options: [{ value: 'aniso', label: 'Anisocoria' }, { value: 'sluggish', label: 'Sluggish' }, { value: 'fixed', label: 'Fixed/dilated' }], build: (g) => (g() === 'aniso' ? 'anisocoria' : g() === 'sluggish' ? 'sluggishly reactive pupil' : 'fixed, dilated pupil'), neg: 'PERRL' },
      { id: 'apd', label: 'Afferent pupillary defect', detail: 'side', normalLabel: 'No APD', pos: (s) => `${s} afferent pupillary defect`, neg: 'no afferent pupillary defect' },
      { id: 'va', label: 'Visual acuity', normalLabel: 'Grossly intact', posLabel: 'Decreased', pos: () => 'decreased visual acuity', neg: 'visual acuity grossly intact' },
      { id: 'dipl', label: 'Diplopia', detail: 'text', normalLabel: 'None', posLabel: 'Diplopia', hint: 'gaze', pos: (v) => `diplopia${v ? ` on ${v} gaze` : ''}`, neg: 'no diplopia' },
      { id: 'globe', label: 'Globe position', control: 'select', normalLabel: 'Normal', side: true, options: [{ value: 'enophthalmos', label: 'Enophthalmos' }, { value: 'proptosis', label: 'Proptosis' }, { value: 'hypoglobus', label: 'Hypoglobus' }], build: (g) => `${g('side') ? `${g('side')} ` : ''}${g() || 'globe malposition'}`, neg: 'no enophthalmos or proptosis' },
      { id: 'sclera', label: 'Sclera / conjunctiva', detail: 'side', normalLabel: 'Clear', pos: (s) => `${s} subconjunctival hemorrhage`, neg: 'sclera and conjunctiva clear' },
      { id: 'peri', label: 'Periorbital edema', detail: 'side', normalLabel: 'None', pos: (s) => `${s} periorbital edema`, neg: 'no periorbital edema' },
    ],
  },
  {
    id: 'ears', name: 'Ears', abbr: 'EAR', elements: [
      { id: 'hemo', label: 'Hemotympanum', detail: 'side', normalLabel: 'None', pos: (s) => `${s} hemotympanum`, neg: 'no hemotympanum' },
      { id: 'battle', label: "Battle's sign", detail: 'side', normalLabel: 'None', pos: (s) => `${s} Battle's sign`, neg: "no Battle's sign" },
    ],
  },
  {
    id: 'nose', name: 'Nose', abbr: 'NOS', elements: [
      { id: 'epi', label: 'Epistaxis', detail: 'side', normalLabel: 'None', pos: (s) => `${s} epistaxis`, neg: 'no epistaxis' },
      { id: 'septh', label: 'Septal hematoma', normalLabel: 'None', posLabel: 'Septal hematoma', pos: () => 'septal hematoma', neg: 'no septal hematoma; septum midline' },
      { id: 'csf', label: 'Clear rhinorrhea', normalLabel: 'None', posLabel: 'CSF concern', pos: () => 'clear rhinorrhea concerning for CSF leak', neg: 'no rhinorrhea' },
      { id: 'nasdef', label: 'Nasal deformity', normalLabel: 'None', posLabel: 'Deformity', pos: () => 'nasal deformity', neg: 'no nasal deformity; nares patent' },
    ],
  },
  {
    id: 'io', name: 'Mouth', abbr: 'MO', elements: [
      { id: 'mucosa', label: 'Mucosa', detail: 'text', normalLabel: 'Moist & pink', posLabel: 'Abnormal', hint: 'erythema / ulceration', pos: (v) => (v ? `mucosal ${v}` : 'mucosal abnormality'), neg: 'mucosa moist and pink' },
      { id: 'vest', label: 'Vestibular swelling', detail: 'text', normalLabel: 'None', posLabel: 'Swelling', hint: 'e.g. left mandibular buccal', pos: (v) => `swelling of the ${v || 'buccal'} vestibule`, neg: 'no vestibular swelling' },
      { id: 'fom', label: 'Floor of mouth', control: 'select', normalLabel: 'Soft', options: [{ value: 'elev', label: 'Elevated' }, { value: 'indur', label: 'Indurated' }], build: (g) => (g() === 'indur' ? 'floor-of-mouth induration' : 'floor-of-mouth elevation'), neg: 'floor of mouth soft and non-tender' },
      { id: 'sublhem', label: 'Sublingual hematoma', normalLabel: 'None', posLabel: 'Present', pos: () => 'sublingual hematoma', neg: 'no sublingual hematoma' },
      { id: 'dentition', label: 'Dentition', detail: 'text', normalLabel: 'Intact', posLabel: 'Abnormal', hint: 'caries / edentulous', pos: (v) => v || 'dental disease', neg: 'dentition intact' },
      { id: 'occ', label: 'Occlusion', control: 'select', normalLabel: 'Stable', options: [{ value: 'mal', label: 'Malocclusion' }, { value: 'aob', label: 'Ant. open bite' }, { value: 'pob', label: 'Post. open bite' }], build: (g) => (g() === 'aob' ? 'anterior open bite' : g() === 'pob' ? 'posterior open bite' : 'malocclusion'), neg: 'occlusion stable and reproducible' },
      { id: 'fx', label: 'Tooth fracture', control: 'teeth', normalLabel: 'None', posLabel: 'Fractured teeth', build: (g) => `fracture of ${teeth(g())}`, neg: 'no tooth fractures' },
      { id: 'mob', label: 'Mobile dentition', control: 'teeth', normalLabel: 'None', posLabel: 'Mobile teeth', build: (g) => `mobility of ${teeth(g())}`, neg: 'no mobile dentition' },
      { id: 'lesion', label: 'Mucosal lesion', detail: 'text', normalLabel: 'None', posLabel: 'Lesion', hint: 'site / size', pos: (v) => `mucosal lesion${v ? ` (${v})` : ''}`, neg: 'no mucosal lesions' },
      { id: 'pus', label: 'Purulent drainage', normalLabel: 'None', posLabel: 'Purulent', pos: () => 'purulent drainage', neg: 'no purulent drainage' },
      { id: 'bone', label: 'Exposed bone', detail: 'text', normalLabel: 'None', posLabel: 'Exposed', hint: 'site', pos: (v) => `exposed bone${v ? ` at the ${v}` : ''}`, neg: 'no exposed bone' },
      { id: 'salflow', label: 'Salivary flow', control: 'select', normalLabel: 'Clear', options: [{ value: 'scant', label: 'Scant/none' }, { value: 'purulent', label: 'Purulent' }], build: (g) => (g() === 'purulent' ? 'purulent salivary discharge on expression' : 'scant salivary flow on expression'), neg: 'clear salivary flow bilaterally' },
    ],
  },
  {
    id: 'tmj', name: 'TMJ', abbr: 'TMJ', elements: [
      { id: 'mio', label: 'Mouth opening (MIO)', control: 'measure', normalLabel: 'Full ROM', posLabel: 'Record (mm)', unit: 'mm', abnormalBelow: 35, build: (g) => { const n = parseInt(g(), 10); return `${Number.isFinite(n) && n < 35 ? 'limited opening, ' : ''}MIO ${g() || '__'} mm` }, neg: 'full range of motion' },
      { id: 'tend', label: 'Pre-auricular tenderness', detail: 'side', normalLabel: 'None', pos: (s) => `${s} pre-auricular tenderness`, neg: 'TMJ non-tender' },
      { id: 'click', label: 'Clicking / popping', detail: 'side', normalLabel: 'None', pos: (s) => `${s} clicking`, neg: 'no clicking or popping' },
      { id: 'crep', label: 'Crepitus', detail: 'side', normalLabel: 'None', pos: (s) => `${s} crepitus`, neg: 'no crepitus' },
      { id: 'dev', label: 'Deviation on opening', detail: 'side', normalLabel: 'None', pos: (s) => `deviation on opening toward the ${s}`, neg: 'no deviation on opening' },
      { id: 'lock', label: 'Locking', control: 'select', normalLabel: 'None', options: [{ value: 'closed', label: 'Closed lock' }, { value: 'open', label: 'Open lock' }], build: (g) => (g() === 'open' ? 'open lock' : 'closed lock'), neg: 'no locking' },
    ],
  },
  {
    id: 'neck', name: 'Neck', abbr: 'NK', elements: [
      { id: 'lad', label: 'Lymphadenopathy', control: 'multiselect', normalLabel: 'None', side: true, size: true, options: [{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' }, { value: 'IV', label: 'IV' }, { value: 'V', label: 'V' }, { value: 'VI', label: 'VI' }], build: (g) => `${g('size') ? `${g('size')} cm ` : ''}${g('side') ? `${g('side')} ` : ''}level ${g() || '__'} lymphadenopathy`, neg: 'no lymphadenopathy' },
      { id: 'mass', label: 'Neck mass', detail: 'text', normalLabel: 'None', posLabel: 'Mass', hint: 'location', pos: (v) => `neck mass${v ? ` (${v})` : ''}`, neg: 'no masses' },
      { id: 'tender', label: 'Tenderness', detail: 'text', normalLabel: 'Non-tender', posLabel: 'Tender', hint: 'location', pos: (v) => `tenderness${v ? ` (${v})` : ''}`, neg: 'non-tender' },
      { id: 'rom', label: 'Range of motion', control: 'select', normalLabel: 'Supple', options: [{ value: 'lim', label: 'Limited' }, { value: 'nuchal', label: 'Nuchal rigidity' }], build: (g) => (g() === 'nuchal' ? 'nuchal rigidity' : 'limited range of motion'), neg: 'supple, full range of motion' },
      { id: 'trachea', label: 'Trachea', normalLabel: 'Midline', posLabel: 'Deviation', pos: () => 'tracheal deviation', neg: 'trachea midline' },
      { id: 'salgland', label: 'Salivary glands', control: 'select', normalLabel: 'Non-tender', side: true, options: [{ value: 'parotid', label: 'Parotid swelling' }, { value: 'submand', label: 'Submandibular swelling' }, { value: 'stone', label: 'Sialolith' }], build: (g) => { const s = g('side') ? `${g('side')} ` : ''; return g() === 'stone' ? 'palpable submandibular sialolith' : g() === 'parotid' ? `${s}parotid swelling` : `${s}submandibular swelling` }, neg: 'parotid and submandibular glands non-tender' },
    ],
  },
  {
    id: 'cv', name: 'Cardiovascular', abbr: 'CV', elements: [
      { id: 'rhythm', label: 'Rate / rhythm', normalLabel: 'RRR', posLabel: 'Irregular', pos: () => 'irregular rhythm', neg: 'regular rate and rhythm' },
      { id: 'mur', label: 'Murmur', detail: 'text', normalLabel: 'None', posLabel: 'Murmur', hint: 'grade / location', pos: (v) => `murmur${v ? ` (${v})` : ''}`, neg: 'no murmurs, rubs, or gallops' },
      { id: 'edema', label: 'Peripheral edema', normalLabel: 'None', posLabel: 'Edema', pos: () => 'peripheral edema', neg: 'no peripheral edema' },
    ],
  },
  {
    id: 'resp', name: 'Respiratory', abbr: 'RES', elements: [
      { id: 'ausc', label: 'Auscultation', detail: 'text', normalLabel: 'Clear', posLabel: 'Abnormal', hint: 'wheezes / crackles', pos: (v) => v || 'abnormal breath sounds', neg: 'clear to auscultation bilaterally' },
      { id: 'distress', label: 'Respiratory distress', normalLabel: 'None', posLabel: 'Distress', pos: () => 'respiratory distress', neg: 'no respiratory distress' },
      { id: 'stridor', label: 'Stridor', normalLabel: 'None', posLabel: 'Stridor', pos: () => 'stridor', neg: 'no stridor' },
      { id: 'airway', label: 'Airway', control: 'select', normalLabel: 'Patent', options: [{ value: 'at risk', label: 'At risk' }, { value: 'compromised', label: 'Compromised' }], build: (g) => `airway ${g() || 'compromised'}`, neg: 'airway patent' },
    ],
  },
  {
    id: 'neuro', name: 'Neuro', abbr: 'NEU', elements: [
      { id: 'orient', label: 'Orientation', detail: 'text', normalLabel: 'A&O ×3', posLabel: 'Disoriented', hint: 'to ___', pos: (v) => `disoriented${v ? ` ${v}` : ''}`, neg: 'alert and oriented ×3' },
      { id: 'gcs', label: 'GCS', control: 'gcs', normalLabel: 'GCS 15', posLabel: 'Score…', build: (g) => { const e = g('e'), v = g('v'), m = g('m'); const tot = (parseInt(e, 10) || 0) + (parseInt(v, 10) || 0) + (parseInt(m, 10) || 0); return tot ? `GCS ${tot} (E${e || '_'} V${v || '_'} M${m || '_'})` : 'GCS' }, neg: 'GCS 15' },
      { id: 'focal', label: 'Focal deficit', detail: 'text', normalLabel: 'None', posLabel: 'Deficit', hint: 'describe', pos: (v) => `focal deficit${v ? ` (${v})` : ''}`, neg: 'no focal neurologic deficit' },
      { id: 'sens', label: 'Trigeminal sensation', control: 'trigeminal', normalLabel: 'Intact', posLabel: 'Deficit…', build: (g) => `${g('side') ? `${g('side')} ` : ''}${g('nerves') || 'trigeminal'} ${g('type') || 'paresthesia'}`, neg: 'facial sensation intact in V1–V3' },
      { id: 'facial', label: 'Facial nerve (VII)', control: 'select', normalLabel: 'Normal (HB I)', side: true, options: [{ value: 'II', label: 'HB II' }, { value: 'III', label: 'HB III' }, { value: 'IV', label: 'HB IV' }, { value: 'V', label: 'HB V' }, { value: 'VI', label: 'HB VI' }], build: (g) => `${g('side') ? `${g('side')} ` : ''}House-Brackmann ${g() || '__'} facial weakness`, neg: 'facial nerve symmetric, House-Brackmann I' },
      { id: 'cn12', label: 'Tongue (CN XII)', detail: 'side', normalLabel: 'Midline', pos: (s) => `tongue deviation to the ${s}`, neg: 'tongue midline' },
      { id: 'other', label: 'CN II–XII', detail: 'text', normalLabel: 'Intact', posLabel: 'Deficit', pos: (v) => `${v || 'cranial nerve'} deficit`, neg: 'CN II–XII otherwise grossly intact' },
    ],
  },
]

export const ROS_SYSTEMS: ExamSystem[] = [
  { id: 'rgen', name: 'Constitutional', abbr: 'GEN', elements: [
    { id: 'fever', label: 'Fever' }, { id: 'chills', label: 'Chills' }, { id: 'wl', label: 'Weight loss' }, { id: 'fatigue', label: 'Fatigue' }, { id: 'sweats', label: 'Night sweats' },
  ] },
  { id: 'reyes', name: 'Eyes', abbr: 'EYE', elements: [
    { id: 'vis', label: 'Vision changes' }, { id: 'dip', label: 'Diplopia' }, { id: 'pain', label: 'Eye pain' },
  ] },
  { id: 'rent', name: 'ENT / Mouth', abbr: 'ENT', elements: [
    { id: 'facpain', label: 'Facial pain' }, { id: 'facswell', label: 'Facial swelling' }, { id: 'chew', label: 'Difficulty chewing' }, { id: 'swallow', label: 'Difficulty swallowing' },
    { id: 'tris', label: 'Trismus' }, { id: 'biteoff', label: 'Bite feels off' }, { id: 'bleed', label: 'Oral bleeding' }, { id: 'hearing', label: 'Hearing loss' }, { id: 'throat', label: 'Sore throat' },
  ] },
  { id: 'rcv', name: 'Cardiovascular', abbr: 'CV', elements: [
    { id: 'cp', label: 'Chest pain' }, { id: 'palp', label: 'Palpitations' }, { id: 'edema', label: 'Leg edema' },
  ] },
  { id: 'rresp', name: 'Respiratory', abbr: 'RES', elements: [
    { id: 'sob', label: 'Shortness of breath' }, { id: 'cough', label: 'Cough' }, { id: 'wheeze', label: 'Wheezing' },
  ] },
  { id: 'rgi', name: 'Gastrointestinal', abbr: 'GI', elements: [
    { id: 'nv', label: 'Nausea / vomiting' }, { id: 'abd', label: 'Abdominal pain' }, { id: 'dysph', label: 'Dysphagia' },
  ] },
  { id: 'rgu', name: 'Genitourinary', abbr: 'GU', elements: [
    { id: 'dys', label: 'Dysuria' }, { id: 'freq', label: 'Frequency' }, { id: 'hematuria', label: 'Hematuria' },
  ] },
  { id: 'rmsk', name: 'Musculoskeletal', abbr: 'MSK', elements: [
    { id: 'joint', label: 'Joint pain' }, { id: 'myal', label: 'Myalgias' }, { id: 'back', label: 'Back pain' },
  ] },
  { id: 'rskin', name: 'Integumentary', abbr: 'SK', elements: [
    { id: 'rash', label: 'Rash' }, { id: 'lesion', label: 'Lesions' }, { id: 'itch', label: 'Pruritus' },
  ] },
  { id: 'rneuro', name: 'Neurologic', abbr: 'NEU', elements: [
    { id: 'ha', label: 'Headache' }, { id: 'numb', label: 'Facial numbness / paresthesia' }, { id: 'weak', label: 'Weakness' }, { id: 'dizzy', label: 'Dizziness' },
  ] },
  { id: 'rpsych', name: 'Psychiatric', abbr: 'PSY', elements: [
    { id: 'dep', label: 'Depression' }, { id: 'anx', label: 'Anxiety' },
  ] },
  { id: 'rendo', name: 'Endocrine', abbr: 'END', elements: [
    { id: 'poly', label: 'Polyuria / polydipsia' }, { id: 'temp', label: 'Heat / cold intolerance' },
  ] },
  { id: 'rheme', name: 'Heme / Lymphatic', abbr: 'HEM', elements: [
    { id: 'bruise', label: 'Easy bruising / bleeding' }, { id: 'lad', label: 'Lymphadenopathy' },
  ] },
  { id: 'rallergy', name: 'Allergic / Immuno', abbr: 'ALL', elements: [
    { id: 'allergies', label: 'Seasonal allergies' }, { id: 'hives', label: 'Hives' },
  ] },
]
