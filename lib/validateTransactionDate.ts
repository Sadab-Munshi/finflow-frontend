export function validateTransactionDate(
  dateInput: string | Date | null | undefined
): string {
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  if (!dateInput) {
    return new Date().toISOString().split('T')[0]
  }

  const inputDate = new Date(dateInput)

  if (isNaN(inputDate.getTime())) {
    return new Date().toISOString().split('T')[0]
  }

  if (inputDate > today) {
    return new Date().toISOString().split('T')[0]
  }

  return inputDate.toISOString().split('T')[0]
}
