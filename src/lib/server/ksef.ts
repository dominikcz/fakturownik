import { KsefClient, XadesKeyPair, serializeInvoiceXml } from 'ksef-client';
import { validate } from '@ksefuj/validator';
import fs from 'node:fs';
import type { Invoice } from '$lib/types.js';
import type { Settings } from '$lib/types.js';
import { buildFa3Xml } from './xml.js';

export interface KsefSendResult {
	ksefNumber: string;
	sessionRef: string;
	upoXml: string;
}

export async function sendInvoiceToKsef(
	invoice: Invoice,
	settings: Settings
): Promise<KsefSendResult> {
	const { ksef } = settings;

	const certPem = ksef.certPem ?? (ksef.certPath ? fs.readFileSync(ksef.certPath, 'utf-8') : '');
	const keyPem = ksef.keyPem ?? (ksef.keyPath ? fs.readFileSync(ksef.keyPath, 'utf-8') : '');

	if (!certPem || !keyPem) {
		throw new Error('Brak certyfikatu lub klucza KSeF. Wgraj pliki w ustawieniach KSeF.');
	}

	const keyPair = XadesKeyPair.fromPem({ certificatePem: certPem, privateKeyPem: keyPem });

	const xmlString = buildFa3Xml(invoice);

	// Walidacja XML
	const validationResult = await validate(xmlString);
	const errors = validationResult.issues.filter((i) => i.code.severity === 'error');
	if (errors.length > 0) {
		const messages = errors.map((e) => e.message).join('; ');
		throw new Error(`Walidacja XML zakończyła się błędami: ${messages}`);
	}

	const nipContext = ksef.nip?.replace(/\D/g, '') || settings.seller.nip?.replace(/\D/g, '') || '';
	if (!nipContext) {
		throw new Error('Brak NIP sprzedawcy w ustawieniach (wymagany do autoryzacji KSeF).');
	}

	const client = new KsefClient({ environment: ksef.environment });

	// Uwierzytelnienie certyfikatem
	const authResult = await client.workflows.auth.authenticateWithCertificate({
		keyPair,
		context: { type: 'Nip', value: nipContext }
	});
	client.authManager.setTokens(authResult);

	// Otwieramy sesję online
	const session = await client.workflows.sessions.online.open({
		formCode: { systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA' }
	});

	try {
		const invoiceBuffer = serializeInvoiceXml(xmlString);
		const sendResult = await session.sendInvoice({ invoice: invoiceBuffer });

		// Czekamy na UPO
		const upoXml = await session.waitForUpo({ maxAttempts: 60, pollIntervalMs: 3000 });

		await session.close();

		// Pobieramy numer KSeF z odpowiedzi sesji
		const sessionStatus = await client.sessions.getSessionStatus(session.referenceNumber);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const invoiceList = sessionStatus as any;
		const ksefNumber = invoiceList?.invoicesSent?.[0]?.ksefReferenceNumber ?? sendResult.referenceNumber ?? '';

		return {
			ksefNumber,
			sessionRef: session.referenceNumber,
			upoXml: upoXml ?? ''
		};
	} catch (err) {
		await session.close().catch(() => {});
		throw err;
	}
}
