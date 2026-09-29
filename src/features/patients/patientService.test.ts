import { describe, expect, it } from 'vitest'
import {
  getPatientDataErrorMessage,
  normalizePatientSearch,
  toPatientInsert,
} from './patientService'
import { emptyPatientForm, type PatientFormValues } from './patientValidation'

const validValues: PatientFormValues = {
  ...emptyPatientForm,
  medicalRecordNumber: ' test-002 ',
  firstName: ' Sample ',
  lastName: ' Patient ',
  dateOfBirth: '1990-06-15',
  sex: 'unknown',
  phone: '',
  email: ' sample@example.test ',
}

describe('patient service boundaries', () => {
  it('maps a form to an insert without generated or audit timestamp fields', () => {
    const insert = toPatientInsert('clinic-id', 'user-id', validValues)

    expect(insert).toMatchObject({
      clinic_id: 'clinic-id',
      created_by: 'user-id',
      medical_record_number: 'TEST-002',
      first_name: 'Sample',
      phone: null,
      email: 'sample@example.test',
    })
    expect(insert).not.toHaveProperty('id')
    expect(insert).not.toHaveProperty('created_at')
    expect(insert).not.toHaveProperty('updated_at')
  })

  it('removes PostgREST filter grammar from search input', () => {
    expect(normalizePatientSearch('  Sam%),clinic_id.eq.other  ')).toBe('Samclinicideqother')
  })

  it('does not expose raw database errors to patients or staff', () => {
    expect(getPatientDataErrorMessage({ code: '23505', message: 'constraint details' }, 'fallback'))
      .toBe('That medical record number is already in use.')
    expect(getPatientDataErrorMessage({ code: 'XX000', message: 'internal details' }, 'Safe fallback'))
      .toBe('Safe fallback')
  })
})
