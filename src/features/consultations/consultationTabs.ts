import type { ConsultationFormValues } from './consultationTypes'

export type ConsultationTab = 'symptoms' | 'vitals' | 'examination' | 'diagnosis' | 'medicines' | 'investigations' | 'advice' | 'follow-up' | 'preview'

export const consultationTabs: Array<{ id: ConsultationTab; label: string }> = [
  { id: 'symptoms', label: 'Symptoms' }, { id: 'vitals', label: 'Vitals' }, { id: 'examination', label: 'Examination' },
  { id: 'diagnosis', label: 'Diagnosis' }, { id: 'medicines', label: 'Medicines' }, { id: 'investigations', label: 'Investigations' },
  { id: 'advice', label: 'Advice' }, { id: 'follow-up', label: 'Follow-up' }, { id: 'preview', label: 'Preview' },
]

export function completedTabs(values: ConsultationFormValues) {
  return new Set<ConsultationTab>([
    ...(values.complaints.length ? ['symptoms' as const] : []),
    ...(Object.values(values.vitals).some(Boolean) ? ['vitals' as const] : []),
    ...(values.examination.generalCondition !== 'not_assessed' || Object.entries(values.examination).some(([key, value]) => key !== 'generalCondition' && value !== 'not_assessed' && Boolean(value)) ? ['examination' as const] : []),
    ...(values.diagnoses.length ? ['diagnosis' as const] : []),
    ...(values.medicines.length ? ['medicines' as const] : []),
    ...(values.investigations.length ? ['investigations' as const] : []),
    ...(values.advice.length ? ['advice' as const] : []),
    ...(values.followUp.type !== 'none' || values.followUp.notes.trim() ? ['follow-up' as const] : []),
  ])
}
