export interface PatientFormValues {
  medicalRecordNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: 'female' | 'male' | 'other' | 'unknown' | ''
  phone: string
  email: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
}

export type PatientFormErrors = Partial<Record<keyof PatientFormValues, string>>

const namePattern = /^[\p{L}\p{M} .'-]+$/u
const recordNumberPattern = /^[A-Za-z0-9][A-Za-z0-9/_-]{1,31}$/
const phonePattern = /^[+()\d][+()\d\s-]{6,19}$/

export const emptyPatientForm: PatientFormValues = {
  medicalRecordNumber: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: '',
  phone: '',
  email: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
}

export function validatePatient(values: PatientFormValues, today = new Date()): PatientFormErrors {
  const errors: PatientFormErrors = {}
  const firstName = values.firstName.trim()
  const lastName = values.lastName.trim()

  if (!recordNumberPattern.test(values.medicalRecordNumber.trim())) {
    errors.medicalRecordNumber = 'Use 2–32 letters, numbers, hyphens, slashes, or underscores.'
  }
  if (!firstName || firstName.length > 80 || !namePattern.test(firstName)) {
    errors.firstName = 'Enter a valid first name (up to 80 characters).'
  }
  if (!lastName || lastName.length > 80 || !namePattern.test(lastName)) {
    errors.lastName = 'Enter a valid last name (up to 80 characters).'
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(values.dateOfBirth)
  const birthDate = dateParts
    ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))
    : null
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const isRealDate = Boolean(
    birthDate
    && dateParts
    && birthDate.getFullYear() === Number(dateParts[1])
    && birthDate.getMonth() === Number(dateParts[2]) - 1
    && birthDate.getDate() === Number(dateParts[3]),
  )
  if (!birthDate || !isRealDate) {
    errors.dateOfBirth = 'Enter a valid date of birth.'
  } else if (birthDate > todayDate) {
    errors.dateOfBirth = 'Date of birth cannot be in the future.'
  } else if (birthDate.getFullYear() < 1900) {
    errors.dateOfBirth = 'Date of birth must be 1900 or later.'
  }

  if (!values.sex) {
    errors.sex = 'Select a sex value for the clinical record.'
  }
  if (values.phone.trim() && !phonePattern.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number.'
  }
  if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.address.trim().length > 500) {
    errors.address = 'Address must be 500 characters or fewer.'
  }
  if (values.emergencyContactPhone.trim() && !phonePattern.test(values.emergencyContactPhone.trim())) {
    errors.emergencyContactPhone = 'Enter a valid emergency contact number.'
  }

  return errors
}
