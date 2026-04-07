import { json } from '@sveltejs/kit';
import { getSettings, listInvoices, saveInvoice } from '$lib/server/data.js';
import { queryKsefInvoices } from '$lib/server/ksef.js';
import type { RequestHandler } from './$types.js';
import { randomUUID } from 'node:crypto';

export const GET: RequestHandler = async ({ url }) => {
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	if (!dateFrom || !dateTo) {
		return json({ error: 'Wymagane parametry: dateFrom, dateTo' }, { status: 400 });
	}
	try {
		const settings = getSettings();
		const invoices = await queryKsefInvoices(settings, dateFrom, dateTo);
		return json({ invoices });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as { items: import('$lib/server/ksef.js').KsefInvoiceMeta[] };
		if (!Array.isArray(body.items) || body.items.length === 0) {
			return json({ error: 'Brak faktur do importu' }, { status: 400 });
		}

		const settings = getSettings();
		const existing = listInvoices();
		const existingKsefNrs = new Set(existing.map((i) => i.ksefNumber).filter(Boolean));

		const imported: string[] = [];
		const skipped: string[] = [];

		for (const meta of body.items) {
			if (!meta.ksefReferenceNumber) continue;
			if (existingKsefNrs.has(meta.ksefReferenceNumber)) {
				skipped.push(meta.ksefReferenceNumber);
				continue;
			}

			const id = randomUUID();
			const invoice = {
				id,
				number: meta.invoiceNumber,
				sequenceNumber: 0,
				issueDate: meta.invoicingDate,
				saleDate: meta.invoicingDate,
				paymentDueDate: meta.invoicingDate,
				paymentMethod: 'transfer' as const,
				seller: {
					nip: meta.sellerNip,
					name: meta.sellerName,
					address: '',
					city: '',
					postalCode: '',
					country: 'PL'
				},
				buyer: {
					nip: meta.buyerNip,
					name: meta.buyerName,
					address: '',
					city: '',
					postalCode: '',
					country: 'PL'
				},
				items: [],
				summary: {
					netTotal: meta.net,
					vatTotal: meta.vat,
					grossTotal: meta.gross,
					byVatRate: []
				},
				status: 'ksef_accepted' as const,
				ksefNumber: meta.ksefReferenceNumber,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			saveInvoice(invoice);
			existingKsefNrs.add(meta.ksefReferenceNumber);
			imported.push(meta.ksefReferenceNumber);
		}

		return json({ imported: imported.length, skipped: skipped.length });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
