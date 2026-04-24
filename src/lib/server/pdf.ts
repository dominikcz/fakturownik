import { chromium } from 'playwright';

export async function generateInvoicePdf(
  invoiceId: string,
  origin: string
): Promise<Buffer> {
  const invoiceUrl = `${origin}/invoices/${invoiceId}`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(invoiceUrl, { waitUntil: 'networkidle' });
    // Ukryj chrome aplikacji — zostaw tylko podgląd faktury
    await page.addStyleTag({
      content: `
        .sidebar { display: none !important; }
        .page-header { display: none !important; }
        .validation-errors, .alert { display: none !important; }
        .main-content { padding: 16px !important; }
        .page { max-width: none !important; }
      `
    });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
