import { useMemo, useState } from 'react'
import type { PatientAllergy } from '../../../lib/database.types'
import type { MedicationOption, MedicineDraft, PrescriptionTemplateBundle } from '../consultationTypes'
import { emptyMedicine, matchingAllergies, medicationLabel, medicineFromOption, medicineFromStored, medicineSummary, rankMedications } from '../medicationUtils'

interface MedicationTabProps {
  value: MedicineDraft[]
  options: MedicationOption[]
  previous: import('../../../lib/database.types').PrescriptionItem[]
  templates: PrescriptionTemplateBundle[]
  allergies: PatientAllergy[]
  errors: Record<string, string>
  onChange: (value: MedicineDraft[]) => void
  onFavorite: (medicationId: string, favorite: boolean) => Promise<void>
  onApplyTemplate: (template: PrescriptionTemplateBundle) => void
  onSaveTemplate: (name: string) => Promise<void>
}

const doseChoices = ['0.5', '1', '2']
const frequencyChoices = ['OD', 'BD', 'TDS', 'QID', 'SOS']
const durationChoices = ['3', '5', '7']

export function MedicationTab({ value, options, previous, templates, allergies, errors, onChange, onFavorite, onApplyTemplate, onSaveTemplate }: MedicationTabProps) {
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<MedicineDraft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPrevious, setSelectedPrevious] = useState<string[]>([])
  const [templateName, setTemplateName] = useState('')
  const [templateStatus, setTemplateStatus] = useState<string | null>(null)
  const ranked = useMemo(() => rankMedications(options, query), [options, query])
  const favorites = ranked.filter((item) => item.preference?.is_favorite).slice(0, 6)
  const frequent = ranked.filter((item) => (item.preference?.usage_count ?? 0) > 0).slice(0, 8)
  const recent = ranked.filter((item) => item.preference?.last_used_at).slice(0, 6)
  const editorAllergies = editor ? matchingAllergies(editor, allergies) : []

  function openOption(option: MedicationOption) {
    setEditor(medicineFromOption(option))
    setEditingId(null)
  }

  function commitEditor() {
    if (!editor) return
    if (editingId) onChange(value.map((item) => item.id === editingId ? { ...editor, id: editingId } : item))
    else onChange([...value, editor])
    setEditor(null)
    setEditingId(null)
    setQuery('')
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= value.length) return
    const next = [...value]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    onChange(next)
  }

  function addPrevious() {
    const additions = previous.filter((item) => selectedPrevious.includes(item.id)).map(medicineFromStored)
    onChange([...value, ...additions])
    setSelectedPrevious([])
  }

  const renderShortcut = (item: MedicationOption) => <span className="medicine-shortcut" key={item.id}><button type="button" onClick={() => openOption(item)}><strong>{[item.brand_name || item.generic_name, item.strength].filter(Boolean).join(' ')}</strong><small>{[item.generic_name, item.formulation].filter(Boolean).join(' · ')}</small></button><button type="button" className={item.preference?.is_favorite ? 'favorite-toggle is-favorite' : 'favorite-toggle'} aria-label={`${item.preference?.is_favorite ? 'Unfavorite' : 'Favorite'} ${item.brand_name || item.generic_name}`} onClick={() => void onFavorite(item.id, !(item.preference?.is_favorite ?? false))}>★</button></span>

  return <section className="workspace-panel medicine-panel" aria-labelledby="tab-medicines">
    <div className="panel-heading"><div><h2>Medicines</h2><p>Convenience ranking is based only on your usage—not a clinical recommendation.</p></div><button type="button" className="button button--secondary" onClick={() => { setEditor(emptyMedicine()); setEditingId(null) }}>+ Custom medicine</button></div>
    {Object.keys(errors).some((key) => key.startsWith('medicine.')) && <div className="medicine-warning" role="alert">Complete the highlighted medicine details before saving. Use Edit to review dose, frequency, and duration.</div>}
    <label className="medicine-search">Search brand, generic, or strength<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicine…" /></label>
    {query && <div className="medicine-search-results">{ranked.slice(0, 10).map(renderShortcut)}{ranked.length === 0 && <button type="button" className="choice-chip" onClick={() => { setEditor(emptyMedicine({ brandName: query })); setEditingId(null) }}>+ Add “{query}” as custom</button>}</div>}
    {!query && <div className="medicine-shelves">
      {favorites.length > 0 && <div><h3>Favorites</h3><div>{favorites.map(renderShortcut)}</div></div>}
      <div><h3>Frequently used</h3><div>{frequent.length ? frequent.map(renderShortcut) : <span className="shelf-empty">Medicines rise here after use.</span>}</div></div>
      {recent.length > 0 && <div><h3>Recent</h3><div>{recent.map(renderShortcut)}</div></div>}
    </div>}

    {editor && <div className="medicine-editor">
      <div className="medicine-editor__heading"><div><span className="eyebrow">{editingId ? 'Edit medicine' : 'Add medicine'}</span><h3>{medicationLabel(editor)}</h3></div><button type="button" className="text-button" onClick={() => { setEditor(null); setEditingId(null) }}>Close</button></div>
      {editorAllergies.length > 0 && <div className="medicine-warning" role="alert">⚠ Patient allergy text matches: {editorAllergies.map((item) => item.allergen).join(', ')}. Review before prescribing.</div>}
      <div className="medicine-identity-grid"><label>Brand<input value={editor.brandName} maxLength={200} onChange={(event) => setEditor({ ...editor, brandName: event.target.value })} /></label><label>Generic<input value={editor.genericName} maxLength={200} onChange={(event) => setEditor({ ...editor, genericName: event.target.value })} /></label><label>Strength<input value={editor.strength} maxLength={100} placeholder="650 mg" onChange={(event) => setEditor({ ...editor, strength: event.target.value })} /></label><label>Form<select value={editor.formulation} onChange={(event) => setEditor({ ...editor, formulation: event.target.value, doseUnit: event.target.value.toLocaleLowerCase() })}><option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option><option>Cream</option><option>Drops</option><option value="">Other</option></select></label></div>
      <div className="medicine-dose-grid">
        <div><span className="input-label">Dose</span><div className="compact-options">{doseChoices.map((dose) => <button type="button" className={editor.doseValue === dose && !editor.doseText ? 'is-selected' : ''} key={dose} onClick={() => setEditor({ ...editor, doseValue: dose, doseText: '' })}>{dose === '0.5' ? '½' : dose}</button>)}</div><div className="inline-pair"><input aria-label="Dose value" type="number" step="0.25" min="0.01" value={editor.doseValue} onChange={(event) => setEditor({ ...editor, doseValue: event.target.value, doseText: '' })} /><input aria-label="Dose unit" value={editor.doseUnit} placeholder="tablet" onChange={(event) => setEditor({ ...editor, doseUnit: event.target.value })} /></div><input aria-label="Custom dose" value={editor.doseText} placeholder="Or custom dose" onChange={(event) => setEditor({ ...editor, doseText: event.target.value, doseValue: '' })} /></div>
        <div><span className="input-label">Frequency</span><div className="compact-options">{frequencyChoices.map((frequency) => <button type="button" className={editor.frequencyCode === frequency && !editor.frequencyText ? 'is-selected' : ''} key={frequency} onClick={() => setEditor({ ...editor, frequencyCode: frequency, frequencyText: '' })}>{frequency}</button>)}</div><input aria-label="Custom frequency" value={editor.frequencyText} placeholder="Or custom frequency" onChange={(event) => setEditor({ ...editor, frequencyText: event.target.value, frequencyCode: '' })} /></div>
        <div><span className="input-label">Timing</span><div className="compact-options compact-options--wrap">{([['before_food', 'Before food'], ['after_food', 'After food'], ['with_food', 'With food'], ['no_preference', 'No preference']] as const).map(([timing, label]) => <button type="button" className={editor.foodTiming === timing ? 'is-selected' : ''} key={timing} onClick={() => setEditor({ ...editor, foodTiming: timing })}>{label}</button>)}</div></div>
        <div><span className="input-label">Duration</span><div className="compact-options">{durationChoices.map((duration) => <button type="button" className={editor.durationValue === duration && !editor.durationText ? 'is-selected' : ''} key={duration} onClick={() => setEditor({ ...editor, durationValue: duration, durationUnit: 'days', durationText: '' })}>{duration}d</button>)}</div><div className="inline-pair"><input aria-label="Duration value" type="number" min="0.01" value={editor.durationValue} onChange={(event) => setEditor({ ...editor, durationValue: event.target.value, durationText: '' })} /><select aria-label="Duration unit" value={editor.durationUnit} onChange={(event) => setEditor({ ...editor, durationUnit: event.target.value as MedicineDraft['durationUnit'] })}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></div><input aria-label="Custom duration" value={editor.durationText} placeholder="Or custom duration" onChange={(event) => setEditor({ ...editor, durationText: event.target.value, durationValue: '' })} /></div>
      </div>
      <label>Instructions <span className="optional-label">Optional</span><textarea rows={2} maxLength={2000} value={editor.instructions} onChange={(event) => setEditor({ ...editor, instructions: event.target.value })} /></label>
      {(errors[`medicine.${editingId ? value.findIndex((item) => item.id === editingId) : value.length}.name`] || errors[`medicine.${editingId ? value.findIndex((item) => item.id === editingId) : value.length}.dose`] || errors[`medicine.${editingId ? value.findIndex((item) => item.id === editingId) : value.length}.frequency`] || errors[`medicine.${editingId ? value.findIndex((item) => item.id === editingId) : value.length}.duration`]) && <span className="field-error">Complete medicine name, dose, frequency, and duration.</span>}
      <button type="button" className="button button--primary" onClick={commitEditor}>{editingId ? 'Update medicine' : 'Add medicine'}</button>
    </div>}

    <div className="prescribed-list"><h3>Current prescription <span>{value.length}</span></h3>{value.length === 0 ? <p className="section-empty">No medicines added.</p> : value.map((item, index) => {
      const warnings = matchingAllergies(item, allergies)
      const hasError = Object.keys(errors).some((key) => key.startsWith(`medicine.${index}.`))
      return <article className={hasError ? 'has-error' : ''} key={item.id}><span className="prescribed-number">{index + 1}</span><div><strong>{medicationLabel(item)}</strong><small>{[item.genericName, item.formulation].filter(Boolean).join(' · ')}</small><p>{medicineSummary(item)}</p>{item.instructions && <p>{item.instructions}</p>}{hasError && <span className="field-error">Incomplete prescription details</span>}{warnings.length > 0 && <span className="inline-warning">⚠ Allergy match: {warnings.map((warning) => warning.allergen).join(', ')}</span>}</div><div className="prescribed-actions"><button type="button" aria-label={`Move ${medicationLabel(item)} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`Move ${medicationLabel(item)} down`} disabled={index === value.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" onClick={() => { setEditor({ ...item }); setEditingId(item.id) }}>Edit</button><button type="button" className="danger" onClick={() => onChange(value.filter((candidate) => candidate.id !== item.id))}>Remove</button></div></article>
    })}</div>

    {previous.length > 0 && <details className="compact-disclosure"><summary>Previous prescription</summary><div className="previous-medicines">{previous.map((item) => <label key={item.id}><input type="checkbox" checked={selectedPrevious.includes(item.id)} onChange={(event) => setSelectedPrevious((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><span><strong>{[item.brand_name || item.generic_name, item.strength].filter(Boolean).join(' ')}</strong><small>{[item.frequency_text || item.frequency_code, item.duration_text || (item.duration_value ? `${item.duration_value} ${item.duration_unit}` : '')].filter(Boolean).join(' · ')}</small></span></label>)}</div><button type="button" className="button button--secondary" disabled={!selectedPrevious.length} onClick={addPrevious}>Add selected</button></details>}
    <details className="compact-disclosure"><summary>Prescription templates</summary><div className="template-list">{templates.map((template) => <button type="button" key={template.template.id} onClick={() => onApplyTemplate(template)}><strong>{template.template.name}</strong><small>{template.medicines.length} medicines · {template.investigations.length} investigations · {template.advice.length} advice</small></button>)}{templates.length === 0 && <p className="section-empty">No templates saved yet.</p>}</div><div className="template-save"><input aria-label="Template name" value={templateName} maxLength={160} placeholder="Template name" onChange={(event) => setTemplateName(event.target.value)} /><button type="button" className="button button--secondary" disabled={!templateName.trim()} onClick={() => { setTemplateStatus(null); void onSaveTemplate(templateName).then(() => { setTemplateName(''); setTemplateStatus('Template saved.') }).catch(() => setTemplateStatus('Template could not be saved.')) }}>Save current as template</button></div>{templateStatus && <p className="template-status" role="status">{templateStatus}</p>}</details>
  </section>
}
