export interface SellerInfo {
	nip: string;
	name: string;
	address: string;
	city: string;
	postalCode: string;
	bankAccount?: string;
	email?: string;
	phone?: string;
	logo?: string; // base64 lub ścieżka
}

export interface KsefEnvCert {
	certPem: string;
	keyPem: string;
	certFileName?: string;
}

export interface KsefSettings {
	environment: 'TEST' | 'DEMO' | 'PRD';
	certs?: { TEST?: KsefEnvCert; DEMO?: KsefEnvCert; PRD?: KsefEnvCert };
	certPath?: string;
	keyPath?: string;
	certPem?: string;
	keyPem?: string;
	nip?: string;
}

export interface Settings {
	seller: SellerInfo;
	invoiceNumberTemplate: string;
	defaultFont: string;
	invoiceZebraStripes: boolean;
	ksef: KsefSettings;
	nextInvoiceNumber: number;
	defaultPaymentDays: number;
	regonApiKey?: string;
	nipLookupOrder: NipLookupSource[];
}

export type NipLookupSource = 'gus' | 'biala_lista' | 'vies';

export interface Client {
	id: string;
	nip: string;
	name: string;
	address: string;
	city: string;
	postalCode: string;
	country: string;
	email?: string;
	phone?: string;
	nipEu?: string;
}

export type VatRate = '23' | '8' | '5' | '0' | 'zw' | 'np';
export type PaymentMethod = 'transfer' | 'cash' | 'card';
export type InvoiceStatus =
	| 'draft'
	| 'issued'
	| 'sent_to_ksef'
	| 'ksef_pending_upo'
	| 'ksef_accepted'
	| 'ksef_error';

export interface InvoiceItem {
	description: string;
	quantity: number;
	unit: string;
	unitPriceNet: number;
	vatRate: VatRate;
	netTotal: number;
	vatTotal: number;
	grossTotal: number;
}

export interface VatSummaryRow {
	rate: string;
	net: number;
	vat: number;
	gross: number;
}

export interface InvoiceSummary {
	netTotal: number;
	vatTotal: number;
	grossTotal: number;
	byVatRate: VatSummaryRow[];
}

export interface InvoiceParty {
	nip: string;
	name: string;
	address: string;
	city: string;
	postalCode: string;
	country?: string;
	nipEu?: string;
}

export interface Invoice {
	id: string;
	number: string;
	sequenceNumber: number;
	issueDate: string;
	saleDate: string;
	paymentDueDate: string;
	paymentMethod: PaymentMethod;
	bankAccount?: string;
	seller: InvoiceParty;
	buyer: InvoiceParty & { country: string };
	items: InvoiceItem[];
	summary: InvoiceSummary;
	comments?: string;
	status: InvoiceStatus;
	ksefNumber?: string;
	ksefSessionRef?: string;
	ksefInvoiceRef?: string;
	upoXml?: string;
	ksefErrorMessage?: string;
	createdAt: string;
	updatedAt: string;
}

export interface NipLookupResult {
	nip: string;
	name: string;
	address: string;
	city: string;
	postalCode: string;
	country: string;
	source: NipLookupSource;
}
