export function validateTransactionDate(
  dateInput: string | Date | null | undefined
): string {
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const currentYear = today.getFullYear()
  const yearStart = new Date(currentYear, 0, 1)
  yearStart.setHours(0, 0, 0, 0)

  if (!dateInput) {
    return today.toISOString().split('T')[0]
  }

  const inputDate = new Date(dateInput)

  if (isNaN(inputDate.getTime())) {
    return today.toISOString().split('T')[0]
  }

  if (inputDate < yearStart || inputDate > today) {
    return today.toISOString().split('T')[0]
  }

  return inputDate.toISOString().split('T')[0]
}
