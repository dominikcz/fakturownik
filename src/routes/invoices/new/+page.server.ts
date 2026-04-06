import { getSettings, getClients, getInvoice, listInvoices } from '$lib/server/data.js';
import { getNextSequenceForPeriod } from '$lib/server/numeracja.js';
import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = ({ url }) => {
	const settings = getSettings();
	const clients = getClients();
	const invoices = listInvoices();
	const nextSeq = getNextSequenceForPeriod(
		invoices,
		settings.invoiceNumberTemplate,
		new Date()
	);
	// Zaktualizuj settings.nextInvoiceNumber tak żeby InvoiceForm dostał właściwą wartość
	const settingsWithNext = { ...settings, nextInvoiceNumber: nextSeq };

	const copyFrom = url.searchParams.get('copyFrom');

	let baseInvoice = undefined;
	if (copyFrom) {
		const source = getInvoice(copyFrom);
		if (!source) error(404, 'Nie znaleziono faktury źródłowej');
		baseInvoice = {
			...source,
			id: undefined,
			number: undefined,
			sequenceNumber: nextSeq,
			issueDate: new Date().toISOString().slice(0, 10),
			saleDate: new Date().toISOString().slice(0, 10),
			status: 'draft' as const,
			ksefNumber: undefined,
			ksefSessionRef: undefined,
			upoXml: undefined,
			createdAt: undefined,
			updatedAt: undefined
		};
	}

	return { settings: settingsWithNext, clients, baseInvoice };
};
