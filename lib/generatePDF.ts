import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { buildReportHTML, PdfReportData } from './pdf-html-template'

/**
 * Fetch the report logo and convert it to a base64 data-URL.
 * Falls back to a tiny transparent 1×1 PNG on failure.
 */
async function fetchLogoBase64(): Promise<string> {
  try {
    const res = await fetch('/images/report-logo.png')
    if (!res.ok) throw new Error('logo fetch failed')
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    // 1×1 transparent PNG as fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg=='
  }
}

/**
 * Client-side PDF generation using HTML-to-PDF approach.
 * Renders a styled HTML template to canvas via html2canvas,
 * then splits into A4 pages and saves as PDF.
 */
export async function generatePDF(data: PdfReportData): Promise<void> {
  const logoBase64 = await fetchLogoBase64()
  const htmlString = buildReportHTML(data, logoBase64)

  // Create hidden container for rendering
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '794px'
  container.innerHTML = htmlString
  document.body.appendChild(container)

  try {
    // Wait a tick for images to load in the DOM
    await new Promise(resolve => setTimeout(resolve, 100))

    // Render HTML to canvas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = await (html2canvas as any)(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    }) as HTMLCanvasElement

    // A4 dimensions in px at 72 DPI: 595.28 × 841.89
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    // Scale canvas to fit PDF width
    const scaledHeight = (canvas.height * pdfWidth) / canvas.width

    if (scaledHeight <= pdfHeight) {
      // Single page — content fits entirely
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight)
      addPageFooter(pdf, data.generatedAt, 1, 1)
    } else {
      // Multi-page — slice canvas into page-sized chunks
      const pageCanvasHeight = (canvas.width * pdfHeight) / pdfWidth
      const totalPages = Math.ceil(canvas.height / pageCanvasHeight)
      let position = 0

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageNum > 1) pdf.addPage()

        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - position)

        // Create a page-sized canvas slice
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeight
        const ctx = pageCanvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          ctx.drawImage(
            canvas,
            0, position, canvas.width, sliceHeight,
            0, 0, canvas.width, sliceHeight,
          )
        }

        const sliceImgData = pageCanvas.toDataURL('image/png')
        const sliceScaledHeight = (sliceHeight * pdfWidth) / canvas.width
        pdf.addImage(sliceImgData, 'PNG', 0, 0, pdfWidth, sliceScaledHeight)

        addPageFooter(pdf, data.generatedAt, pageNum, totalPages)
        position += pageCanvasHeight
      }
    }

    // Generate filename
    const fileName = `FinFlow-Report-${data.month.replace(/\s+/g, '-')}.pdf`
    pdf.save(fileName)
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Add a footer to the current PDF page with page number.
 */
function addPageFooter(
  pdf: jsPDF,
  generatedAt: string,
  pageNum: number,
  totalPages: number,
): void {
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const footerY = pdfHeight - 12

  // Footer line
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.5)
  pdf.line(20, footerY - 4, pdfWidth - 20, footerY - 4)

  // Footer text
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(156, 163, 175)
  pdf.text('FinFlow Financial Report \u00B7 Confidential', 20, footerY)
  pdf.text(
    `Generated on ${generatedAt} \u00B7 Page ${pageNum} of ${totalPages}`,
    pdfWidth - 20,
    footerY,
    { align: 'right' },
  )
}
