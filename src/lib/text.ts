// Tiny shared string helpers (previously duplicated per-module).

/** Capitalize the first character. */
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Two-to-three-letter tile abbreviation for a title (list icons). */
export function abbrev(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? title).slice(0, 3).toUpperCase()
}
