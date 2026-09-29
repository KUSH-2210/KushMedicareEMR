import { normalizePrescriptionPaperSize, type PrescriptionDocumentData, type PrescriptionLineItem, type PrescriptionPaperSize } from '../prescriptionTypes'
import '../prescription.css'

function DocumentList({ items, ordered = false }: { items: PrescriptionLineItem[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul'
  return <List>{items.map((item, index) => <li key={`${item.primary}-${index}`}><div><strong>{item.primary}</strong>{item.secondary && <span>{item.secondary}</span>}</div>{item.detail && <p>{item.detail}</p>}{item.note && <small>{item.note}</small>}</li>)}</List>
}

export function PrescriptionDocument({ data, paperSize = data.paperSize }: { data: PrescriptionDocumentData; paperSize?: PrescriptionPaperSize }) {
  const resolvedPaperSize = normalizePrescriptionPaperSize(paperSize)
  return <article className={`prescription-document prescription-document--${resolvedPaperSize.toLowerCase()}`} data-prescription-state={data.state} aria-label={`${data.state === 'draft' ? 'Draft' : 'Saved'} prescription`}>
    <header className="prescription-letterhead">
      {data.clinic.logoUrl && <img className="prescription-logo" src={data.clinic.logoUrl} alt="Clinic logo" />}
      <div className="prescription-clinic"><h1>{data.clinic.name}</h1>{data.clinic.address && <p>{data.clinic.address}</p>}<p>{[data.clinic.phone, data.clinic.email].filter(Boolean).join(' · ')}</p></div>
      <div className="prescription-doctor"><strong>{data.doctor.name}</strong>{data.doctor.qualification && <span>{data.doctor.qualification}</span>}{data.doctor.specialization && <span>{data.doctor.specialization}</span>}{data.doctor.registrationNumber && <span>Reg. No. {data.doctor.registrationNumber}</span>}{data.doctor.additionalCredentials && <small>{data.doctor.additionalCredentials}</small>}</div>
    </header>
    <div className="prescription-meta"><div><span>Patient</span><strong>{data.patient.name}</strong><small>{data.patient.age}y · {data.patient.sex} · ID {data.patient.patientId}{data.patient.phone ? ` · ${data.patient.phone}` : ''}</small></div><div><span>Date</span><strong>{data.date}</strong>{data.prescriptionNumber && <small>{data.prescriptionNumber}</small>}</div></div>
    {data.state === 'draft' && <div className="prescription-draft-label">DRAFT · Save the consultation before printing</div>}
    {data.vitals.length > 0 && <section className="prescription-vitals"><h2>Vitals</h2><p>{data.vitals.join(' · ')}</p></section>}
    <div className="prescription-clinical-grid">
      {data.symptoms.length > 0 && <section><h2>Chief complaints</h2><DocumentList items={data.symptoms} /></section>}
      {data.examination.length > 0 && <section><h2>Examination</h2><ul>{data.examination.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </div>
    {data.diagnoses.length > 0 && <section><h2>Diagnosis</h2><DocumentList items={data.diagnoses} ordered /></section>}
    {data.medicines.length > 0 && <section className="prescription-rx"><h2><span aria-hidden="true">℞</span> Prescription</h2><DocumentList items={data.medicines} ordered /></section>}
    <div className="prescription-clinical-grid">
      {data.investigations.length > 0 && <section><h2>Investigations</h2><ul>{data.investigations.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      {data.advice.length > 0 && <section><h2>Advice</h2><ul>{data.advice.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </div>
    <section><h2>Follow-up</h2><p>{data.followUp}</p></section>
    <footer className="prescription-footer"><div>{data.clinic.footer && <p>{data.clinic.footer}</p>}</div><div className="prescription-signature">{data.doctor.signatureUrl && <img src={data.doctor.signatureUrl} alt="Doctor signature" />}<span>Doctor signature</span><strong>{data.doctor.name}</strong></div></footer>
  </article>
}
