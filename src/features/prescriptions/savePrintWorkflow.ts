export async function saveBeforePrint(
  save: () => Promise<string>,
  openCanonicalSavedPrescription: (visitId: string) => void | Promise<void>,
) {
  const visitId = await save()
  await openCanonicalSavedPrescription(visitId)
  return visitId
}
