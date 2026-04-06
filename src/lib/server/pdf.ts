import { chromium } from 'playwright';
import type { Invoice, Settings } from '$lib/types.js';
import { generateInvoiceQrDataUrl } from './qr.js';

const vatRateLabels: Record<string, string> = {
	'23': '23%',
	'8': '8%',
	'5': '5%',
	'0': '0%',
	zw: 'ZW',
	np: 'NP'
};

const paymentMethodLabels: Record<string, string> = {
	transfer: 'Przelew bankowy',
	cash: 'Gotówka',
	card: 'Karta płatnicza'
};

function fmt(n: number): string {
	return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function esc(s: string | undefined | null): string {
	if (!s) return '';
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(invoice: Invoice, settings: Settings, qrDataUrl?: string): string {
	const font = esc(settings.defaultFont ?? 'Trebuchet MS');

	const itemRows = invoice.items.map((item, idx) => `
		<tr class="${idx % 2 === 1 ? 'row-even' : ''}">
			<td class="td-center">${idx + 1}</td>
			<td>${esc(item.description)}</td>
			<td class="td-right">${item.quantity}</td>
			<td class="td-center">${esc(item.unit)}</td>
			<td class="td-right">${fmt(item.unitPriceNet)}</td>
			<td class="td-center">${vatRateLabels[item.vatRate] ?? esc(item.vatRate)}</td>
			<td class="td-right">${fmt(item.netTotal)}</td>
			<td class="td-right">${fmt(item.vatTotal)}</td>
			<td class="td-right td-bold">${fmt(item.grossTotal)}</td>
		</tr>`).join('');

	const vatRows = invoice.summary.byVatRate.map((row) => `
		<tr>
			<td>${vatRateLabels[row.rate] ?? esc(row.rate)}</td>
			<td class="td-right">${fmt(row.net)}</td>
			<td class="td-right">${fmt(row.vat)}</td>
			<td class="td-right">${fmt(row.gross)}</td>
		</tr>`).join('');

	const logoHtml = settings.seller.logo
		? `<img src="${esc(settings.seller.logo)}" alt="Logo" class="logo" />`
		: '';

	const ksefHtml = invoice.ksefNumber
		? `<div class="ksef-number">Nr KSeF: ${esc(invoice.ksefNumber)}</div>`
		: '';

	const bankHtml = invoice.bankAccount && invoice.paymentMethod === 'transfer'
		? `<div class="meta-item meta-wide"><span class="meta-label">Numer konta:</span> <span class="meta-value">${esc(invoice.bankAccount)}</span></div>`
		: '';

	const commentsHtml = invoice.comments
		? `<div class="comments-section"><h3>Uwagi</h3><p>${esc(invoice.comments)}</p></div>`
		: '';

	const qrHtml = qrDataUrl
		? `<div class="qr-section">
			<img src="${qrDataUrl}" alt="Kod QR" class="qr-img" />
			<div class="qr-label">${invoice.ksefNumber ? 'Weryfikacja KSeF' : 'Dane faktury'}</div>
		</div>`
		: '';

	return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: '${font}', 'Trebuchet MS', sans-serif; font-size: 0.9rem; line-height: 1.5; color: #1e293b; background: #fff; padding: 32px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1e293b; padding-bottom: 16px; }
  .logo { max-height: 60px; max-width: 200px; object-fit: contain; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: 0.05em; }
  .invoice-number { font-size: 1.1rem; font-weight: 600; color: #2563eb; margin-top: 4px; }
  .ksef-number { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
  .meta-grid { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-bottom: 20px; background: #f8fafc; padding: 12px 16px; border-radius: 6px; }
  .meta-item { display: flex; gap: 6px; font-size: 0.85rem; }
  .meta-wide { flex-basis: 100%; }
  .meta-label { color: #64748b; font-weight: 500; }
  .meta-value { color: #1e293b; font-weight: 600; }
  .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .party { padding: 14px; border: 1px solid #e2e8f0; border-radius: 6px; }
  .party-title { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .party-name { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .party-info { font-size: 0.85rem; color: #374151; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.85rem; }
  .items-table th { padding: 8px; background: #1e293b; color: #f1f5f9; font-weight: 600; font-size: 0.75rem; text-align: left; border: none; }
  .items-table td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
  .row-even td { background: #f8fafc; }
  .td-center { text-align: center; }
  .td-right { text-align: right; font-variant-numeric: tabular-nums; }
  .td-bold { font-weight: 600; }
  .summary-section { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 20px; }
  .vat-summary { flex: 1; max-width: 420px; }
  .vat-summary h3 { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
  .vat-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .vat-table th, .vat-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  .vat-table th { font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f8fafc; }
  .total-row th { background: #1e293b; color: #f1f5f9; border-bottom: none; padding: 8px; }
  .total-box { border: 2px solid #2563eb; border-radius: 8px; padding: 16px 24px; text-align: center; min-width: 180px; }
  .total-label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .total-value { font-size: 1.5rem; font-weight: 700; color: #2563eb; margin-top: 4px; }
  .comments-section { border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .comments-section h3 { font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
  .qr-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .qr-img { width: 80px; height: 80px; image-rendering: pixelated; }
  .qr-label { font-size: 0.7rem; color: #94a3b8; text-align: center; width: 80px; }
  .logo-area { min-height: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">${logoHtml}</div>
    <div class="invoice-title">
      <h1>FAKTURA VAT</h1>
      <div class="invoice-number">${esc(invoice.number)}</div>
      ${ksefHtml}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Data wystawienia:</span> <span class="meta-value">${esc(invoice.issueDate)}</span></div>
    <div class="meta-item"><span class="meta-label">Data sprzedaży:</span> <span class="meta-value">${esc(invoice.saleDate)}</span></div>
    <div class="meta-item"><span class="meta-label">Termin płatności:</span> <span class="meta-value">${esc(invoice.paymentDueDate)}</span></div>
    <div class="meta-item"><span class="meta-label">Forma płatności:</span> <span class="meta-value">${esc(paymentMethodLabels[invoice.paymentMethod] ?? invoice.paymentMethod)}</span></div>
    ${bankHtml}
  </div>

  <div class="parties-grid">
    <div class="party">
      <div class="party-title">Sprzedawca</div>
      <div class="party-name">${esc(invoice.seller.name)}</div>
      <div class="party-info">${esc(invoice.seller.address)}</div>
      <div class="party-info">${esc(invoice.seller.postalCode)} ${esc(invoice.seller.city)}</div>
      <div class="party-info">NIP: ${esc(invoice.seller.nip)}</div>
    </div>
    <div class="party">
      <div class="party-title">Nabywca</div>
      <div class="party-name">${esc(invoice.buyer.name)}</div>
      <div class="party-info">${esc(invoice.buyer.address)}</div>
      <div class="party-info">${esc(invoice.buyer.postalCode)} ${esc(invoice.buyer.city)}</div>
      <div class="party-info">NIP: ${esc(invoice.buyer.nip)}</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="th-lp">Lp.</th>
        <th>Nazwa towaru / usługi</th>
        <th style="text-align:right">Ilość</th>
        <th style="text-align:center">J.m.</th>
        <th style="text-align:right">Cena netto</th>
        <th style="text-align:center">VAT</th>
        <th style="text-align:right">Wartość netto</th>
        <th style="text-align:right">Kwota VAT</th>
        <th style="text-align:right">Wartość brutto</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="summary-section">
    <div class="vat-summary">
      <h3>Podsumowanie VAT</h3>
      <table class="vat-table">
        <thead><tr><th>Stawka VAT</th><th>Netto</th><th>VAT</th><th>Brutto</th></tr></thead>
        <tbody>${vatRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <th>RAZEM</th>
            <th class="td-right">${fmt(invoice.summary.netTotal)}</th>
            <th class="td-right">${fmt(invoice.summary.vatTotal)}</th>
            <th class="td-right">${fmt(invoice.summary.grossTotal)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="total-box">
      <div class="total-label">Do zapłaty:</div>
      <div class="total-value">${fmt(invoice.summary.grossTotal)} PLN</div>
    </div>
  </div>

  ${commentsHtml}
  ${qrHtml}
</body>
</html>`;
}

export async function generateInvoicePdf(
	invoice: Invoice,
	settings: Settings
): Promise<Buffer> {
	const qrDataUrl = await generateInvoiceQrDataUrl(invoice, settings).catch(() => '');
	const html = buildHtml(invoice, settings, qrDataUrl);
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

