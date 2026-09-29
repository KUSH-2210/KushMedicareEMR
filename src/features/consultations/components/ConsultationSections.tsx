import { useState, type ReactNode } from 'react'
import { commonAdvice, commonDiagnoses, commonInvestigations, commonSymptoms } from '../catalogs'
import { calculateBmi } from '../consultationForm'
import type {
  ComplaintDraft,
  ConsultationFormValues,
  DiagnosisDraft,
  ExaminationFormValues,
  FollowUpFormValues,
  VitalsFormValues,
} from '../consultationTypes'
import type { FindingStatus } from '../../../lib/database.types'
import { SearchablePicker } from './SearchablePicker'

export function SectionCard({ number, title, subtitle, children }: { number: string; title: string; subtitle?: string; children: ReactNode }) {
  return <fieldset className="consultation-section"><legend><span>{number}</span><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span></legend>{children}</fieldset>
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null
}

const vitalFields: Array<{ key: keyof VitalsFormValues; label: string; unit: string; min: number; max: number; step?: string }> = [
  { key: 'systolicBp', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 300 },
  { key: 'diastolicBp', label: 'Diastolic BP', unit: 'mmHg', min: 20, max: 200 },
  { key: 'pulseBpm', label: 'Pulse', unit: 'bpm', min: 20, max: 300 },
  { key: 'temperatureF', label: 'Temperature', unit: '°F', min: 77, max: 122, step: '0.1' },
  { key: 'oxygenSaturation', label: 'SpO₂', unit: '%', min: 0, max: 100, step: '0.1' },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: '/min', min: 3, max: 100 },
  { key: 'weightKg', label: 'Weight', unit: 'kg', min: 0.01, max: 1000, step: '0.1' },
  { key: 'heightCm', label: 'Height', unit: 'cm', min: 0.01, max: 300, step: '0.1' },
]

export function VitalsSection({ value, errors, onChange }: { value: VitalsFormValues; errors: Record<string, string>; onChange: (value: VitalsFormValues) => void }) {
  const bmi = calculateBmi(value.weightKg, value.heightCm)
  return <SectionCard number="01" title="Vitals" subtitle="Optional — enter what was measured">
    <div className="vitals-grid">
      {vitalFields.map((field) => <label key={field.key}>{field.label}<span className="unit-input"><input type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step ?? '1'} value={value[field.key]} aria-invalid={Boolean(errors[field.key])} onChange={(event) => onChange({ ...value, [field.key]: event.target.value })} /><span>{field.unit}</span></span><FieldError message={errors[field.key]} /></label>)}
      <div className="bmi-card"><span>Calculated BMI</span><strong>{bmi ?? '—'}</strong><small>kg/m²</small></div>
    </div>
  </SectionCard>
}

export function ComplaintsSection({ value, errors, onChange }: { value: ComplaintDraft[]; errors: Record<string, string>; onChange: (value: ComplaintDraft[]) => void }) {
  const add = (name: string) => {
    if (!name || value.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return
    onChange([...value, { id: crypto.randomUUID(), name, durationValue: '', durationUnit: 'days', notes: '' }])
  }
  return <SectionCard number="02" title="Presenting complaints" subtitle="Add one or more symptoms">
    <SearchablePicker label="Symptom" catalog={commonSymptoms} selected={value.map((item) => item.name)} onAdd={add} />
    <div className="entry-list">
      {value.map((item, index) => <div className="structured-entry" key={item.id}>
        <div className="structured-entry__heading"><strong>{item.name}</strong><button type="button" className="text-button text-button--danger" onClick={() => onChange(value.filter((candidate) => candidate.id !== item.id))}>Remove</button></div>
        <div className="duration-row"><label>Duration<input type="number" inputMode="decimal" min="0.01" value={item.durationValue} aria-invalid={Boolean(errors[`complaint.${index}.duration`])} onChange={(event) => onChange(value.map((candidate) => candidate.id === item.id ? { ...candidate, durationValue: event.target.value } : candidate))} /></label><label>Unit<select value={item.durationUnit} onChange={(event) => onChange(value.map((candidate) => candidate.id === item.id ? { ...candidate, durationUnit: event.target.value as ComplaintDraft['durationUnit'] } : candidate))}><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></label></div>
        <FieldError message={errors[`complaint.${index}.duration`]} />
        <label>Notes <span className="optional-label">Optional</span><textarea rows={2} maxLength={2000} value={item.notes} onChange={(event) => onChange(value.map((candidate) => candidate.id === item.id ? { ...candidate, notes: event.target.value } : candidate))} /></label>
      </div>)}
      {value.length === 0 && <p className="section-empty">No presenting complaints added.</p>}
    </div>
  </SectionCard>
}

const statusFields: Array<{ key: keyof Pick<ExaminationFormValues, 'pallor' | 'icterus' | 'cyanosis' | 'clubbing' | 'edema' | 'lymphadenopathy'>; label: string }> = [
  { key: 'pallor', label: 'Pallor' }, { key: 'icterus', label: 'Icterus' }, { key: 'cyanosis', label: 'Cyanosis' },
  { key: 'clubbing', label: 'Clubbing' }, { key: 'edema', label: 'Edema' }, { key: 'lymphadenopathy', label: 'Lymphadenopathy' },
]
function StatusControl({ label, value, onChange }: { label: string; value: FindingStatus; onChange: (value: FindingStatus) => void }) {
  return <div className="status-control"><span>{label}</span><div role="group" aria-label={label}>{(['not_assessed', 'absent', 'present'] as const).map((status) => <button type="button" className={value === status ? 'is-selected' : ''} onClick={() => onChange(status)} key={status}>{status === 'not_assessed' ? 'Not assessed' : status[0].toUpperCase() + status.slice(1)}</button>)}</div></div>
}

export function ExaminationSection({ value, onChange }: { value: ExaminationFormValues; onChange: (value: ExaminationFormValues) => void }) {
  const [openSystems, setOpenSystems] = useState<string[]>([])
  const systems = [
    { key: 'cvs' as const, label: 'CVS', normal: 'Normal' },
    { key: 'respiratorySystem' as const, label: 'Respiratory', normal: 'Normal' },
    { key: 'abdomen' as const, label: 'Abdomen', normal: 'Soft / NT' },
    { key: 'cns' as const, label: 'CNS', normal: 'Normal' },
    { key: 'localExamination' as const, label: 'Local', normal: '' },
  ]
  return <SectionCard number="03" title="Examination" subtitle="Record general and system findings">
    <div className="fast-exam">
      <div className="fast-exam-row"><strong>General</strong><button type="button" className={value.generalCondition === 'well' ? 'is-selected' : ''} onClick={() => onChange({ ...value, generalCondition: 'well' })}>Normal</button><button type="button" className={['fair', 'ill', 'critical'].includes(value.generalCondition) ? 'is-selected' : ''} onClick={() => onChange({ ...value, generalCondition: 'fair' })}>Abnormal</button><select aria-label="General condition detail" value={value.generalCondition} onChange={(event) => onChange({ ...value, generalCondition: event.target.value as ExaminationFormValues['generalCondition'] })}><option value="not_assessed">Not assessed</option><option value="well">Well</option><option value="fair">Fair</option><option value="ill">Ill</option><option value="critical">Critical</option></select></div>
      {systems.map((system) => {
        const isOpen = openSystems.includes(system.key) || (value[system.key] && value[system.key] !== system.normal)
        return <div className="fast-exam-system" key={system.key}><div className="fast-exam-row"><strong>{system.label}</strong>{system.normal && <button type="button" className={value[system.key] === system.normal ? 'is-selected' : ''} onClick={() => onChange({ ...value, [system.key]: system.normal })}>{system.normal}</button>}<button type="button" onClick={() => setOpenSystems((current) => current.includes(system.key) ? current : [...current, system.key])}>+ Finding</button>{value[system.key] && <button type="button" className="text-button" onClick={() => onChange({ ...value, [system.key]: '' })}>Clear</button>}</div>{isOpen && <textarea aria-label={`${system.label} finding`} rows={2} maxLength={5000} value={value[system.key]} placeholder={`Enter ${system.label.toLocaleLowerCase()} finding`} onChange={(event) => onChange({ ...value, [system.key]: event.target.value })} />}</div>
      })}
    </div>
    <details className="advanced-exam"><summary>More examination findings</summary><div className="status-grid">{statusFields.map((field) => <StatusControl key={field.key} label={field.label} value={value[field.key]} onChange={(status) => onChange({ ...value, [field.key]: status })} />)}</div><label>Other findings<textarea rows={3} maxLength={5000} value={value.otherFindings} onChange={(event) => onChange({ ...value, otherFindings: event.target.value })} /></label></details>
  </SectionCard>
}

export function DiagnosisSection({ value, error, onChange }: { value: DiagnosisDraft[]; error?: string; onChange: (value: DiagnosisDraft[]) => void }) {
  const add = (name: string) => {
    if (!name || value.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return
    onChange([...value, { id: crypto.randomUUID(), name, notes: '', isPrimary: value.length === 0 }])
  }
  return <SectionCard number="04" title="Diagnosis" subtitle="Mark one primary diagnosis">
    <SearchablePicker label="Diagnosis" catalog={commonDiagnoses} selected={value.map((item) => item.name)} onAdd={add} />
    <FieldError message={error} />
    <div className="entry-list">{value.map((item) => <div className="structured-entry diagnosis-entry" key={item.id}>
      <div className="structured-entry__heading"><label className="primary-choice"><input type="radio" name="primary-diagnosis" checked={item.isPrimary} onChange={() => onChange(value.map((candidate) => ({ ...candidate, isPrimary: candidate.id === item.id })))} /> Primary</label><strong>{item.name}</strong><button type="button" className="text-button text-button--danger" onClick={() => { const next = value.filter((candidate) => candidate.id !== item.id); if (item.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true }; onChange(next) }}>Remove</button></div>
      <label>Notes <span className="optional-label">Optional</span><textarea rows={2} maxLength={2000} value={item.notes} onChange={(event) => onChange(value.map((candidate) => candidate.id === item.id ? { ...candidate, notes: event.target.value } : candidate))} /></label>
    </div>)}</div>
  </SectionCard>
}

export function SelectionSection({ number, title, catalog, value, onChange }: { number: string; title: string; catalog: readonly string[]; value: string[]; onChange: (value: string[]) => void }) {
  return <SectionCard number={number} title={title} subtitle="Select common items or add your own">
    <SearchablePicker label={title.slice(0, -1)} catalog={catalog} selected={value} onAdd={(item) => { if (item && !value.some((current) => current.toLocaleLowerCase() === item.toLocaleLowerCase())) onChange([...value, item]) }} />
    <div className="selected-chips">{value.map((item) => <span className="selected-chip" key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((current) => current !== item))}>×</button></span>)}</div>
  </SectionCard>
}

export function InvestigationsSection(props: Omit<Parameters<typeof SelectionSection>[0], 'number' | 'title' | 'catalog'>) {
  return <SelectionSection number="05" title="Investigations" catalog={commonInvestigations} {...props} />
}

export function AdviceSection(props: Omit<Parameters<typeof SelectionSection>[0], 'number' | 'title' | 'catalog'>) {
  return <SelectionSection number="06" title="Advice" catalog={commonAdvice} {...props} />
}

export function FollowUpSection({ value, error, onChange }: { value: FollowUpFormValues; error?: string; onChange: (value: FollowUpFormValues) => void }) {
  return <SectionCard number="07" title="Follow-up" subtitle="Optional review plan">
    <div className="follow-up-options" role="group" aria-label="Follow-up timing">{(['none', 'interval', 'date'] as const).map((type) => <button type="button" className={value.type === type ? 'is-selected' : ''} onClick={() => onChange({ ...value, type })} key={type}>{type === 'none' ? 'No follow-up' : type === 'interval' ? 'After interval' : 'On date'}</button>)}</div>
    {value.type === 'interval' && <div className="duration-row follow-up-fields"><label>Interval<input type="number" inputMode="numeric" min="1" max="365" value={value.intervalValue} aria-invalid={Boolean(error)} onChange={(event) => onChange({ ...value, intervalValue: event.target.value })} /></label><label>Unit<select value={value.intervalUnit} onChange={(event) => onChange({ ...value, intervalUnit: event.target.value as FollowUpFormValues['intervalUnit'] })}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></label></div>}
    {value.type === 'date' && <label className="follow-up-date">Follow-up date<input type="date" value={value.date} aria-invalid={Boolean(error)} onChange={(event) => onChange({ ...value, date: event.target.value })} /></label>}
    <FieldError message={error} />
    <label className="follow-up-notes">Notes <span className="optional-label">Optional</span><textarea rows={3} maxLength={2000} value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} /></label>
  </SectionCard>
}

export type ConsultationChange = <K extends keyof ConsultationFormValues>(key: K, value: ConsultationFormValues[K]) => void
