import { render } from 'svelte/server';
import { chromium } from 'playwright';
import type { Invoice, Settings } from '$lib/types.js';
import { generateInvoiceQrDataUrl } from './qr.js';
import InvoicePreview from '$lib/components/InvoicePreview.svelte';

export async function generateInvoicePdf(
  invoice: Invoice,
  settings: Settings
): Promise<Buffer> {
  const qrDataUrl = await generateInvoiceQrDataUrl(invoice, settings).catch(() => '');

  const { head, body } = render(InvoicePreview, {
    props: { invoice, settings, qrDataUrlOverride: qrDataUrl || undefined }
  });

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&family=Inter:wght@400;600;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet" />
${head}
<style>
  html { background: white; }
  body { margin: 0; padding: 0; background: white; display: inline-block; width: 100%; }
  .invoice-preview { border: none !important; max-width: none !important; border-radius: 0 !important; }
</style>
</head>
<body>${body}</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
