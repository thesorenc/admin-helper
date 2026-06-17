// Concise, human labels for the fields-at-top layout. The field's context sentence is
// shown alongside the control as the disambiguator, so a generic label here is still clear.

import type { Field } from './types'

// Placeholders whose inner text is a sigil, not a human name.
const GENERIC = new Set(['x', 'n', '__', '#__', '#', ''])
const isWord = (s: string) => /^[a-zA-Z][a-zA-Z ]{1,}$/.test(s) && !GENERIC.has(s.toLowerCase())
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

/** First meaningful [name] inside a raw token (e.g. "[system]" -> "system"). */
function nameFromRaw(raw: string): string | null {
  const m = raw.match(/\[([a-zA-Z][a-zA-Z ]*?)\]/)
  return m && isWord(m[1].trim()) ? m[1].trim() : null
}

export function deriveLabel(field: Field): string {
  switch (field.kind) {
    case 'toothNumber':
      return 'Tooth #'
    case 'side':
      return 'Side'
    case 'optionalClause':
      // The clause text itself is the clearest label.
      return field.raw.replace(/^\[|\]$/g, '').trim()
    case 'hardwareDim': {
      const names = [...field.raw.matchAll(/\[([a-zA-Z][a-zA-Z ]*?)\]/g)].map((m) => m[1].trim())
      if (names.length >= 2 && isWord(names[0]) && isWord(names[1]))
        return `${titleCase(names[0])} × ${titleCase(names[1])}`
      return 'Size (Ø×L)'
    }
    case 'measurement': {
      // Unit is shown separately as a chip next to the label, so don't repeat it here.
      const n = nameFromRaw(field.raw)
      return n ? titleCase(n) : 'Measurement'
    }
    case 'hardwareCount': {
      // Named count "[# holes]" → "Holes".
      const named = field.raw.match(/^\[#\s+([a-z][a-z ]*?)\]$/i)
      if (named) return titleCase(named[1].trim())
      const n = nameFromRaw(field.raw)
      return n ? titleCase(n) : 'Count'
    }
    case 'enumText': {
      // Named choice list: "[Platform: RP / NP / WP]" → "Platform".
      const named = field.raw.match(/^\[\s*([A-Za-z][A-Za-z0-9 ]*?):/)
      if (named) return titleCase(named[1].trim())
      const n = nameFromRaw(field.raw)
      return n ? titleCase(n) : 'Choose one'
    }
    default: {
      const n = nameFromRaw(field.raw)
      return n ? titleCase(n) : field.label || 'Detail'
    }
  }
}
