import type { Field, ParsedComponent } from '@/lib/types'
import { FieldRenderer, ToothPicker } from './FieldRenderer'
import { formatBlocks } from './DocFormat'
import { assembleAtomBody, scopedValues } from '@/lib/caseAssembly'
import { fieldsIn, parseTeethList, splitRepeatTemplate, TEETH_KEY } from '@/lib/repeat'

const NON_FILLABLE = new Set(['flag', 'include', 'smartlink'])

/** A labeled stack of field controls. Tooth fields are hidden in repeat sections (the
 *  chart above drives them); non-fillable kinds (flags/includes/smartlinks) never show. */
function Fields({
  fields,
  scope,
  values,
  setValue,
  hideTooth = false,
}: {
  fields: Field[]
  scope: string
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  hideTooth?: boolean
}) {
  const visible = fields.filter(
    (f) => !NON_FILLABLE.has(f.kind) && !(hideTooth && f.kind === 'toothNumber'),
  )
  if (!visible.length) return null
  return (
    <div className="fields-form">
      {visible.map((f) => (
        <FieldRenderer key={f.id} field={f} values={values} setValue={setValue} scope={scope} />
      ))}
    </div>
  )
}

/**
 * Edits one atom instance as a fields-at-top form with a live note preview below.
 * For repeat atoms the dental chart is the primary control:
 *  - repeat: 'tooth' — one shared field panel applied to every selected tooth.
 *  - repeat: 'site'  — one independent field panel per selected tooth/site.
 * Preamble (anesthesia/setup) and closure are stated once.
 */
export function AtomEditor({
  op,
  instanceId,
  values,
  setValue,
}: {
  op: ParsedComponent
  instanceId: string
  values: Record<string, string>
  setValue: (key: string, value: string) => void
}) {
  const scoped = scopedValues(values, instanceId)
  const preview = assembleAtomBody(op, scoped).text
  const repeat = op.repeat

  let form
  if (repeat !== 'tooth' && repeat !== 'site') {
    form = <Fields fields={op.fields} scope={instanceId} values={values} setValue={setValue} />
  } else {
    const teethKey = `${instanceId}::${TEETH_KEY}`
    const teeth = parseTeethList(values[teethKey])
    const [preT, itemT, closeT] = splitRepeatTemplate(op.bodyTemplate)
    const preFields = fieldsIn(op, preT)
    const itemFields = fieldsIn(op, itemT)
    const closeFields = fieldsIn(op, closeT)
    const itemHasInputs = itemFields.some((f) => !NON_FILLABLE.has(f.kind) && f.kind !== 'toothNumber')
    form = (
      <>
        <div className="tooth-chart-field">
          <label className="f-label">Teeth</label>
          <ToothPicker value={values[teethKey] ?? ''} onChange={(v) => setValue(teethKey, v)} />
        </div>
        {!!preFields.length && (
          <section className="repeat-sec">
            <h5>Anesthesia &amp; setup</h5>
            <Fields fields={preFields} scope={instanceId} values={values} setValue={setValue} />
          </section>
        )}
        {repeat === 'tooth'
          ? itemHasInputs && (
              <section className="repeat-sec">
                <h5>Per tooth — applies to every selected tooth</h5>
                <Fields fields={itemFields} hideTooth scope={instanceId} values={values} setValue={setValue} />
              </section>
            )
          : teeth.length
            ? teeth.map((t) => (
                <section className="repeat-sec site-card" key={t}>
                  <h5>Site #{t}</h5>
                  {itemHasInputs ? (
                    <Fields
                      fields={itemFields}
                      hideTooth
                      scope={`${instanceId}::site:${t}`}
                      values={values}
                      setValue={setValue}
                    />
                  ) : (
                    <p className="repeat-empty">No per-site variables.</p>
                  )}
                </section>
              ))
            : <p className="repeat-empty">Select teeth on the chart to configure each site.</p>}
        {!!closeFields.length && (
          <section className="repeat-sec">
            <h5>Closure</h5>
            <Fields fields={closeFields} scope={instanceId} values={values} setValue={setValue} />
          </section>
        )}
      </>
    )
  }

  return (
    <div className="atom-editor">
      {form}
      <div className="note-preview">
        <div className="np-label">Note preview</div>
        <div className="doc np-doc">{formatBlocks(preview, 'doc')}</div>
      </div>
    </div>
  )
}
