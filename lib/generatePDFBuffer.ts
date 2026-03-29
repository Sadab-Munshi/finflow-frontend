/**
 * Server-side utility to convert a base64-encoded PDF string to a Buffer.
 * Used by the cron job to upload generated PDFs to Supabase Storage.
 */
export function pdfBase64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}
