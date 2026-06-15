import type { ReactNode } from 'react'
import type { Field } from '@/lib/types'
import { canonicalSide, valueKey } from '@/lib/assembler'

/**
 * Store-agnostic field control. Reads/writes through the provided `values` map
 * and `setValue`. `scope` (an instance id) namespaces keys so the same procedure
 * can appear multiple times in one case without collisions.
 */
export function FieldRenderer({
  field,
  values,
  setValue,
  scope,
}: {
  field: Field
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  scope?: string
}) {
  const k = (key: string) => (scope ? `${scope}::${key}` : key)

  let control: ReactNode

  if (field.kind === 'side') {
    const key = k(valueKey(field))
    const current = values[key]
    const opts = field.options ?? ['right', 'left']
    control = (
      <div className="chips">
        {opts.map((opt) => {
          const canon = canonicalSide(opt)
          const on = current === canon
          return (
            <button
              key={opt}
              type="button"
              className={'chip' + (on ? ' on' : '')}
              onClick={() => setValue(key, canon)}
            >
              <span className="ck">✓</span>
              {opt}
            </button>
          )
        })}
      </div>
    )
  } else if (field.kind === 'enumText') {
    const opts = field.options ?? []
    const key = k(field.id)
    const v = values[key] ?? ''
    const isOther = v !== '' && !opts.includes(v)
    control = (
      <div className="field" style={{ gap: 7 }}>
        <div className="chips">
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              className={'chip' + (v === o ? ' on' : '')}
              onClick={() => setValue(key, o)}
            >
              <span className="ck">✓</span>
              {o}
            </button>
          ))}
          <button
            type="button"
            className={'chip' + (isOther ? ' on' : '')}
            onClick={() => setValue(key, isOther ? '' : ' ')}
          >
            Other…
          </button>
        </div>
        {isOther && (
          <input
            className="f-input"
            autoFocus
            placeholder="custom value"
            value={v.trim()}
            onChange={(e) => setValue(key, e.target.value)}
          />
        )}
      </div>
    )
  } else if (field.kind === 'hardwareDim') {
    control = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          className="f-input mono"
          style={{ width: 90 }}
          placeholder="Ø"
          inputMode="decimal"
          value={values[k(`${field.id}:d`)] ?? ''}
          onChange={(e) => setValue(k(`${field.id}:d`), e.target.value)}
        />
        <span style={{ color: 'var(--muted)' }}>×</span>
        <input
          className="f-input mono"
          style={{ width: 90 }}
          placeholder="length"
          inputMode="decimal"
          value={values[k(`${field.id}:l`)] ?? ''}
          onChange={(e) => setValue(k(`${field.id}:l`), e.target.value)}
        />
      </div>
    )
  } else if (field.kind === 'hardwareCount') {
    const key = k(field.id)
    const v = parseInt(values[key] ?? '', 10)
    const set = (n: number) => setValue(key, String(Math.max(0, n)))
    control = (
      <div className="stepper">
        <button type="button" onClick={() => set((isNaN(v) ? 0 : v) - 1)}>
          –
        </button>
        <input
          inputMode="numeric"
          value={values[key] ?? ''}
          onChange={(e) => setValue(key, e.target.value)}
        />
        <button type="button" onClick={() => set((isNaN(v) ? 0 : v) + 1)}>
          +
        </button>
      </div>
    )
  } else {
    const mono = field.kind === 'measurement' || field.kind === 'toothNumber'
    const key = k(field.id)
    control = (
      <input
        className={'f-input' + (mono ? ' mono' : '')}
        inputMode={field.kind === 'measurement' ? 'decimal' : 'text'}
        placeholder={field.hint ?? field.raw}
        value={values[key] ?? ''}
        onChange={(e) => setValue(key, e.target.value)}
      />
    )
  }

  return (
    <div className="field">
      <label className="f-label">
        {field.label}
        {field.unit ? <span className="f-hint">{field.unit}</span> : null}
      </label>
      {control}
    </div>
  )
}
