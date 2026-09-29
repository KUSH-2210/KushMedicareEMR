import type { Clinic, Profile } from '../../../lib/database.types'
import { commonAdvice } from '../catalogs'
import type { ConsultationErrors } from '../consultationForm'
import type { ConsultationContext, ConsultationFormValues, PrescriptionTemplateBundle } from '../consultationTypes'
import { completedTabs, consultationTabs, type ConsultationTab } from '../consultationTabs'
import { ComplaintsSection, DiagnosisSection, ExaminationSection, FollowUpSection, InvestigationsSection, SelectionSection, VitalsSection } from './ConsultationSections'
import { ConsultationPreview } from './ConsultationPreview'
import { MedicationTab } from './MedicationTab'
import type { PrescriptionAssetUrls } from '../../prescriptions/prescriptionUtils'

interface ConsultationWorkspaceProps {
  activeTab: ConsultationTab
  onActiveTab: (tab: ConsultationTab) => void
  context: ConsultationContext
  values: ConsultationFormValues
  errors: ConsultationErrors
  clinic: Clinic | null
  profile: Profile | null
  onChange: <K extends keyof ConsultationFormValues>(key: K, value: ConsultationFormValues[K]) => void
  onFavorite: (medicationId: string, favorite: boolean) => Promise<void>
  onApplyTemplate: (template: PrescriptionTemplateBundle) => void
  onSaveTemplate: (name: string) => Promise<void>
  prescriptionAssets?: PrescriptionAssetUrls
}

export function ConsultationWorkspace({ activeTab, onActiveTab, context, values, errors, clinic, profile, onChange, onFavorite, onApplyTemplate, onSaveTemplate, prescriptionAssets }: ConsultationWorkspaceProps) {
  const complete = completedTabs(values)
  const activeIndex = consultationTabs.findIndex((tab) => tab.id === activeTab)
  const previous = consultationTabs[activeIndex - 1]
  const next = consultationTabs[activeIndex + 1]
  const adviceCatalog = [...new Set([...commonAdvice, ...context.adviceSnippets.map((item) => item.advice)])]

  return <div className="consultation-workspace">
    <div className="consultation-tabs" role="tablist" aria-label="Consultation sections">{consultationTabs.map((tab) => <button id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => onActiveTab(tab.id)} key={tab.id}>{tab.label}{complete.has(tab.id) && <span aria-label="complete">✓</span>}</button>)}</div>
    <div id="panel-symptoms" role="tabpanel" aria-labelledby="tab-symptoms" className="consultation-tab-panel" hidden={activeTab !== 'symptoms'}><ComplaintsSection value={values.complaints} errors={errors} onChange={(value) => onChange('complaints', value)} /></div>
    <div id="panel-vitals" role="tabpanel" aria-labelledby="tab-vitals" className="consultation-tab-panel" hidden={activeTab !== 'vitals'}><VitalsSection value={values.vitals} errors={errors} onChange={(value) => onChange('vitals', value)} /></div>
    <div id="panel-examination" role="tabpanel" aria-labelledby="tab-examination" className="consultation-tab-panel" hidden={activeTab !== 'examination'}><ExaminationSection value={values.examination} onChange={(value) => onChange('examination', value)} /></div>
    <div id="panel-diagnosis" role="tabpanel" aria-labelledby="tab-diagnosis" className="consultation-tab-panel" hidden={activeTab !== 'diagnosis'}><DiagnosisSection value={values.diagnoses} error={errors.diagnoses} onChange={(value) => onChange('diagnoses', value)} /></div>
    <div id="panel-medicines" role="tabpanel" aria-labelledby="tab-medicines" className="consultation-tab-panel" hidden={activeTab !== 'medicines'}><MedicationTab value={values.medicines} options={context.medicationOptions} previous={context.previousMedicines} templates={context.templates} allergies={context.allergies} errors={errors} onChange={(value) => onChange('medicines', value)} onFavorite={onFavorite} onApplyTemplate={onApplyTemplate} onSaveTemplate={onSaveTemplate} /></div>
    <div id="panel-investigations" role="tabpanel" aria-labelledby="tab-investigations" className="consultation-tab-panel" hidden={activeTab !== 'investigations'}><InvestigationsSection value={values.investigations} onChange={(value) => onChange('investigations', value)} /></div>
    <div id="panel-advice" role="tabpanel" aria-labelledby="tab-advice" className="consultation-tab-panel" hidden={activeTab !== 'advice'}><SelectionSection number="07" title="Advice" catalog={adviceCatalog} value={values.advice} onChange={(value) => onChange('advice', value)} /></div>
    <div id="panel-follow-up" role="tabpanel" aria-labelledby="tab-follow-up" className="consultation-tab-panel" hidden={activeTab !== 'follow-up'}><FollowUpSection value={values.followUp} error={errors.followUp} onChange={(value) => onChange('followUp', value)} /></div>
    <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" className="consultation-tab-panel" hidden={activeTab !== 'preview'}><ConsultationPreview context={context} values={values} clinic={clinic} profile={profile} assets={prescriptionAssets} onBackToMedicines={() => onActiveTab('medicines')} /></div>
    <nav className="tab-step-navigation" aria-label="Consultation step navigation"><span>{previous && <button type="button" onClick={() => onActiveTab(previous.id)}>← {previous.label}</button>}</span><span>{next && <button type="button" onClick={() => onActiveTab(next.id)}>Next: {next.label} →</button>}</span></nav>
  </div>
}
