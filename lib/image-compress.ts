/**
 * Client-side compression for receipt images.
 *
 * Every browser → backend call now travels through the Vercel proxy, which
 * caps request bodies at ~4.5 MB. Base64 inflates bytes by roughly 1.37×, so a
 * photo has to land well under that *before* it is JSON-encoded into the
 * `parse-receipt` payload. We walk a ladder of (maxWidth, quality) pairs and
 * keep the first result that fits the budget, which keeps ordinary phone
 * photos at one attempt while still rescuing a 12 MP HEIC-turned-JPEG.
 */

/** Raw-base64 budget per request. Leaves headroom under Vercel's ~4.5 MB cap. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

export interface CompressedImage {
  /** Base64 payload, no data-URL prefix — exactly what the API expects. */
  base64: string
  /** data: URL suitable for an <Image src>. */
  previewUrl: string
  /** Decoded size of `base64`, in bytes. */
  bytes: number
  mimeType: 'image/jpeg'
  /** How many rungs of the ladder were tried (1 = fit on the first pass). */
  attempts: number
}

const LADDER: Array<{ maxWidth: number; quality: number }> = [
  { maxWidth: 1280, quality: 0.82 },
  { maxWidth: 1024, quality: 0.78 },
  { maxWidth: 900, quality: 0.72 },
  { maxWidth: 760, quality: 0.64 },
  { maxWidth: 620, quality: 0.56 },
]

/** Decoded byte length of a base64 string, without allocating a Buffer. */
export function base64ByteLength(base64: string): number {
  if (!base64) return 0
  const len = base64.length
  let padding = 0
  if (base64.endsWith('==')) padding = 2
  else if (base64.endsWith('=')) padding = 1
  // Strip any data-URL prefix if one slipped through.
  const comma = base64.indexOf(',')
  const stripped = comma >= 0 ? base64.length - comma - 1 : len
  return Math.max(0, Math.floor((stripped * 3) / 4) - padding)
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

function render(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): { base64: string; previewUrl: string } {
  let w = img.width
  let h = img.height
  if (w > maxWidth) {
    h = Math.round((h * maxWidth) / w)
    w = maxWidth
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  // JPEG has no alpha; paint white first or transparent PNGs turn black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  const previewUrl = canvas.toDataURL('image/jpeg', quality)
  return { base64: previewUrl.split(',')[1], previewUrl }
}

export async function compressImageToBudget(
  file: File,
  maxBytes: number = MAX_UPLOAD_BYTES
): Promise<CompressedImage> {
  const { img, url } = await loadImage(file)

  try {
    let last: { base64: string; previewUrl: string } | null = null
    let attempts = 0

    for (const rung of LADDER) {
      attempts += 1
      last = render(img, rung.maxWidth, rung.quality)
      if (base64ByteLength(last.base64) <= maxBytes) {
        return {
          base64: last.base64,
          previewUrl: last.previewUrl,
          bytes: base64ByteLength(last.base64),
          mimeType: 'image/jpeg',
          attempts,
        }
      }
    }

    // Still too large at the smallest rung: surface a real error rather than
    // shipping a payload the proxy will reject with a bare 413.
    throw new Error('Image is too large even after compression. Please use a smaller photo.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
