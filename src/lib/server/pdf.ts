import { renderPdfFromXml } from '@mdab25/ksef-pdf';
import type { Invoice } from '$lib/types.js';
import { buildFa3Xml } from './xml.js';

export async function generateInvoicePdf(
	invoice: Invoice,
	ksefNumber?: string,
	qrUrl?: string
): Promise<Buffer> {
	const xmlString = buildFa3Xml(invoice);
	const pdfBytes = await renderPdfFromXml(xmlString, {
		nrKSeF: ksefNumber,
		qrCode: qrUrl
	});
	return Buffer.from(pdfBytes);
}
