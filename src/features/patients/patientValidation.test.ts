import { describe, expect, it } from 'vitest'
import { emptyPatientForm, validatePatient, type PatientFormValues } from './patientValidation'

const validPatient: PatientFormValues = {
  ...emptyPatientForm,
  medicalRecordNumber: 'TEST-0001',
  firstName: 'Sample',
  lastName: 'Patient',
  dateOfBirth: '1990-06-15',
  sex: 'unknown',
  phone: '+1 555 010 2020',
  email: 'sample@example.test',
}

describe('validatePatient', () => {
  it('accepts a complete valid demographic record', () => {
    expect(validatePatient(validPatient, new Date('2026-09-26'))).toEqual({})
  })

  it('rejects required fields and a future birth date', () => {
    const errors = validatePatient(
      { ...emptyPatientForm, medicalRecordNumber: '!', dateOfBirth: '2027-01-01' },
      new Date('2026-09-26'),
    )

    expect(errors.medicalRecordNumber).toBeDefined()
    expect(errors.firstName).toBeDefined()
    expect(errors.lastName).toBeDefined()
    expect(errors.dateOfBirth).toBe('Date of birth cannot be in the future.')
    expect(errors.sex).toBeDefined()
  })

  it('validates optional contact fields only when supplied', () => {
    const errors = validatePatient(
      { ...validPatient, phone: 'abc', email: 'invalid', emergencyContactPhone: '12' },
      new Date('2026-09-26'),
    )

    expect(errors.phone).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.emergencyContactPhone).toBeDefined()
  })

  it('rejects calendar dates that do not exist', () => {
    const errors = validatePatient(
      { ...validPatient, dateOfBirth: '2026-02-31' },
      new Date('2026-09-26'),
    )

    expect(errors.dateOfBirth).toBe('Enter a valid date of birth.')
  })
})
