// Shared constants for PDF report generation (server + client)

/** Keywords highlighted in bold teal within the AI summary paragraph */
export const AI_SUMMARY_TEAL_KEYWORDS = [
  'concerning',
  'major allocation',
  'reduce',
  'mitigate',
  'generate income',
]

/**
 * Returns a display-friendly description for a transaction.
 * Falls back to the category name when note is empty, null, or "Done".
 */
export function getTransactionDescription(
  note: string | null | undefined,
  category: string
): string {
  const trimmed = (note || '').trim()
  if (!trimmed || trimmed.toLowerCase() === 'done') {
    return category || '-'
  }
  return trimmed.replace(/\n/g, ' ')
}
