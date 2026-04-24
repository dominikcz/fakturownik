import { KsefClient } from 'ksef-client';
import { createHash } from 'node:crypto';
import type { Invoice, Settings } from '$lib/types.js';
import { buildFa3Xml } from './xml.js';

const QR_URLS: Record<string, string> = {
	TEST: 'https://qr-test.ksef.mf.gov.pl',
	DEMO: 'https://qr-demo.ksef.mf.gov.pl',
	PRD: 'https://qr.ksef.mf.gov.pl'
};

/**
 * Zwraca URL do weryfikacji faktury w KSeF (tylko dla faktur z numerem KSeF).
 */
export function buildKsefVerificationUrl(invoice: Invoice, settings: Settings): string | null {
	if (!invoice.ksefNumber) return null;
	const env = settings.ksef?.environment ?? 'PRD';
	const baseQrUrl = QR_URLS[env] ?? QR_URLS.PRD;
	const client = new KsefClient({ environment: env as 'TEST' | 'DEMO' | 'PRD', baseQrUrl });
	const nip = (invoice.seller.nip ?? settings.seller.nip).replace(/\D/g, '');
	const invoiceHash = invoice.ksefInvoiceHash
		?? (() => { const xml = buildFa3Xml(invoice); return createHash('sha256').update(xml, 'utf8').digest('base64url'); })();
	const [y, m, d] = invoice.issueDate.split('-');
	const issueDateDMY = `${d}-${m}-${y}`;
	return client.verificationLinks.buildInvoiceVerificationUrl(nip, issueDateDMY, invoiceHash);
}

/**
 * Generuje data URL (base64 PNG) kodu QR dla faktury.
 * Dla faktur z numerem KSeF — link weryfikacyjny MF.
 * Dla pozostałych — podstawowe dane faktury.
 */
export async function generateInvoiceQrDataUrl(
	invoice: Invoice,
	settings: Settings
): Promise<string> {
	const env = settings.ksef?.environment ?? 'PRD';
	const baseQrUrl = QR_URLS[env] ?? QR_URLS.PRD;
	const client = new KsefClient({ environment: env as 'TEST' | 'DEMO' | 'PRD', baseQrUrl });

	let qrValue: string;

	if (invoice.ksefNumber) {
		// Faktura przyjęta przez KSeF — generuj link weryfikacyjny
		const nip = (invoice.seller.nip ?? settings.seller.nip).replace(/\D/g, '');
		const invoiceHash = invoice.ksefInvoiceHash
			?? (() => { const xml = buildFa3Xml(invoice); return createHash('sha256').update(xml, 'utf8').digest('base64url'); })();
		const [y, m, d] = invoice.issueDate.split('-');
		const issueDateDMY = `${d}-${m}-${y}`;
		qrValue = client.verificationLinks.buildInvoiceVerificationUrl(
			nip,
			issueDateDMY,
			invoiceHash
		);
	} else {
		// Faktura bez numeru KSeF — zapisz podstawowe dane
		const nip = (invoice.seller.nip ?? settings.seller.nip ?? '').replace(/\D/g, '');
		qrValue = [
			`Nr: ${invoice.number}`,
			`Data: ${invoice.issueDate}`,
			`NIP: ${nip}`,
			`Brutto: ${invoice.summary.grossTotal.toFixed(2)} PLN`
		].join('\n');
	}

	return client.qr.toDataUrl(qrValue, { width: 160, margin: 1 });
}
