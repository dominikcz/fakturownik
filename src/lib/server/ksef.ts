import { KsefClient, XadesKeyPair, serializeInvoiceXml } from 'ksef-client';
import { validate } from '@ksefuj/validator';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { Invoice } from '$lib/types.js';
import type { Settings } from '$lib/types.js';
import { buildFa3Xml } from './xml.js';

export interface KsefValidationIssue {
	code: string;
	message: string;
	element?: string;
	xpath?: string;
}

export class KsefValidationError extends Error {
	constructor(public readonly issues: KsefValidationIssue[]) {
		super('Walidacja XML nie powiodła się');
		this.name = 'KsefValidationError';
	}
}

export interface KsefSendResult {
	sessionRef: string;
	invoiceRef: string;
	invoiceHash: string;
}

export interface KsefUpoResult {
	ksefNumber: string;
	upoXml: string;
}

async function createAuthenticatedClient(settings: Settings['ksef']): Promise<KsefClient> {
	const envCert = settings.certs?.[settings.environment];
	const certPem = envCert?.certPem ?? settings.certPem ?? (settings.certPath ? fs.readFileSync(settings.certPath, 'utf-8') : '');
	const keyPem = envCert?.keyPem ?? settings.keyPem ?? (settings.keyPath ? fs.readFileSync(settings.keyPath, 'utf-8') : '');

	if (!certPem || !keyPem) {
		throw new Error('Brak certyfikatu lub klucza KSeF. Wgraj pliki w ustawieniach KSeF.');
	}

	const keyPair = XadesKeyPair.fromPem({ certificatePem: certPem, privateKeyPem: keyPem });
	const nipContext = settings.nip?.replace(/\D/g, '') ?? '';
	if (!nipContext) {
		throw new Error('Brak NIP w ustawieniach KSeF (wymagany do autoryzacji).');
	}

	const client = new KsefClient({ environment: settings.environment });
	const authResult = await client.workflows.auth.authenticateWithCertificate({
		keyPair,
		context: { type: 'Nip', value: nipContext }
	});
	client.authManager.setTokens(authResult);
	return client;
}

export async function validateInvoiceForKsef(invoice: Invoice): Promise<void> {
	// Walidacja daty wystawienia — KSeF odrzuci fakturę z datą w przyszłości
	if (invoice.issueDate) {
		const today = new Date().toISOString().slice(0, 10);
		if (invoice.issueDate > today) {
			throw new KsefValidationError([{
				code: 'ISSUE_DATE_FUTURE',
				message: `Data wystawienia (${invoice.issueDate}) jest późniejsza niż dzisiejsza data (${today}). KSeF wymaga, aby data wystawienia nie była w przyszłości.`,
				element: 'P_1'
			}]);
		}
	}

	const xmlString = buildFa3Xml(invoice);
	const validationResult = await validate(xmlString);
	const errors = validationResult.issues.filter((i) => i.code.severity === 'error');
	if (errors.length > 0) {
		throw new KsefValidationError(
			errors.map((e) => ({
				code: e.code.code,
				message: e.message,
				element: e.context?.location?.element,
				xpath: e.context?.location?.xpath
			}))
		);
	}
}

export async function sendInvoiceToKsef(
	invoice: Invoice,
	settings: Settings
): Promise<KsefSendResult> {
	const { ksef } = settings;

	await validateInvoiceForKsef(invoice);

	const xmlString = buildFa3Xml(invoice);
	const invoiceHash = createHash('sha256').update(xmlString, 'utf8').digest('base64url');

	const nipContext = ksef.nip?.replace(/\D/g, '') || settings.seller.nip?.replace(/\D/g, '') || '';
	if (!nipContext) {
		throw new Error('Brak NIP sprzedawcy w ustawieniach (wymagany do autoryzacji KSeF).');
	}

	const client = await createAuthenticatedClient({ ...ksef, nip: nipContext });

	// Otwieramy sesję online
	const session = await client.workflows.sessions.online.open({
		formCode: { systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA' }
	});

	try {
		const invoiceBuffer = serializeInvoiceXml(xmlString);
		const sendResult = await session.sendInvoice({ invoice: invoiceBuffer });

		await session.close();

		return {
			sessionRef: session.referenceNumber,
			invoiceRef: sendResult.referenceNumber,
			invoiceHash
		};
	} catch (err) {
		await session.close().catch(() => {});
		throw err;
	}
}

export interface KsefSessionError {
	description: string;
	details?: string[];
}

export class KsefSessionInvoiceError extends Error {
	constructor(public readonly errors: KsefSessionError[]) {
		super('KSeF odrzucił fakturę w sesji');
		this.name = 'KsefSessionInvoiceError';
	}
}

export async function fetchUpoForInvoice(
	invoice: Invoice,
	settings: Settings
): Promise<KsefUpoResult> {
	const { ksef } = settings;

	if (!invoice.ksefSessionRef) {
		throw new Error('Brak reference sesji KSeF – nie można pobrać UPO.');
	}

	const nipContext = ksef.nip?.replace(/\D/g, '') || settings.seller.nip?.replace(/\D/g, '') || '';
	const client = await createAuthenticatedClient({ ...ksef, nip: nipContext });

	// Sprawdź status sesji
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sessionStatus = await client.sessions.getSessionStatus(invoice.ksefSessionRef) as any;

	const statusCode: number = sessionStatus?.status?.code ?? 0;
	const failedCount: number = sessionStatus?.failedInvoiceCount ?? 0;
	const successCount: number = sessionStatus?.successfulInvoiceCount ?? 0;
	const totalCount: number = sessionStatus?.invoiceCount ?? 0;

	// Sesja nie jest jeszcze przetworzona
	if (statusCode !== 200 && failedCount === 0 && successCount === 0) {
		const desc = sessionStatus?.status?.description ?? `kod ${statusCode}`;
		throw new Error(`Sesja KSeF nie jest jeszcze przetworzona (status: ${desc}). Spróbuj za chwilę.`);
	}

	// Sesja przetworzona ale faktury odrzucone
	if (failedCount > 0) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let failedErrors: KsefSessionError[] = [];
		try {
			const failedRes = await client.sessions.getSessionFailedInvoices(invoice.ksefSessionRef) as any;
			const failedInvoices: any[] = failedRes?.invoices ?? failedRes?.failedInvoices ?? [];
			failedErrors = failedInvoices.map((inv: any) => ({
				description: inv?.status?.description ?? inv?.errorMessage ?? 'Błąd semantycznej walidacji faktury',
				details: inv?.status?.details ?? []
			}));
		} catch {
			const desc = sessionStatus?.status?.description ?? 'Błąd weryfikacji semantyki dokumentu faktury';
			failedErrors = [{ description: desc, details: sessionStatus?.status?.details }];
		}
		if (failedErrors.length === 0) {
			const desc = sessionStatus?.status?.description ?? 'Błąd weryfikacji semantyki dokumentu faktury';
			failedErrors = [{ description: desc }];
		}
		throw new KsefSessionInvoiceError(failedErrors);
	}

	// Sesja bez żadnych przetworzoych faktur (np. status inny niż 200 ale nie wiemy dlaczego)
	if (statusCode !== 200 && totalCount === 0) {
		const desc = sessionStatus?.status?.description ?? `kod ${statusCode}`;
		throw new Error(`Sesja KSeF nie jest jeszcze przetworzona (status: ${desc}). Spróbuj za chwilę.`);
	}

	// Pobierz UPO XML
	let upoXml = '';
	const upoPages = sessionStatus?.upo?.pages;
	if (upoPages?.length > 0) {
		upoXml = await client.sessions.getSessionUpo(invoice.ksefSessionRef, upoPages[0].referenceNumber);
	}

	// Pobierz numer KSeF faktury
	let ksefNumber = invoice.ksefInvoiceRef ?? '';
	if (invoice.ksefSessionRef && invoice.ksefInvoiceRef) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const inv = await client.sessions.getSessionInvoices(invoice.ksefSessionRef) as any;
			const firstInvoice = inv?.invoices?.[0];
			ksefNumber = firstInvoice?.ksefReferenceNumber ?? ksefNumber;
		} catch {
			// fallback do invoiceRef jeśli endpoint nie zwróci danych
		}
	}

	return { ksefNumber, upoXml };
}

export interface KsefInvoiceMeta {
	ksefReferenceNumber: string;
	invoiceNumber: string;
	invoicingDate: string;
	net: number;
	vat: number;
	gross: number;
	buyerName: string;
	buyerNip: string;
	sellerName: string;
	sellerNip: string;
}

export async function queryKsefInvoices(
	settings: Settings,
	dateFrom: string,
	dateTo: string
): Promise<KsefInvoiceMeta[]> {
	const { ksef } = settings;
	const nipContext = ksef.nip?.replace(/\D/g, '') || settings.seller.nip?.replace(/\D/g, '') || '';
	const client = await createAuthenticatedClient({ ...ksef, nip: nipContext });

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const response = await client.invoices.queryInvoiceMetadata(
		{
			subjectType: 'subject1',
			dateRange: {
				dateType: 'InvoicingDate',
				from: dateFrom,
				to: dateTo
			}
		},
		0,
		100,
		'Desc'
	) as any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const items: any[] = response?.invoices ?? response?.invoiceHeaderList ?? [];
	return items.map((item: any) => ({
		ksefReferenceNumber: item.ksefReferenceNumber ?? item.invoiceReferenceNumber ?? '',
		invoiceNumber: item.invoiceNumber ?? item.number ?? '',
		invoicingDate: item.invoicingDate ?? item.issueDate ?? '',
		net: parseFloat(item.net ?? item.p15 ?? 0),
		vat: parseFloat(item.vat ?? 0),
		gross: parseFloat(item.gross ?? item.p16 ?? 0),
		buyerName: item.subjectTo?.name ?? item.buyerName ?? '',
		buyerNip: item.subjectTo?.issuedToIdentifier?.identifier ?? item.buyerNip ?? '',
		sellerName: item.subjectBy?.name ?? item.sellerName ?? '',
		sellerNip: item.subjectBy?.issuedToIdentifier?.identifier ?? item.sellerNip ?? '',
	}));
}

