import { json } from '@sveltejs/kit';
import { listInvoices, saveInvoice, getSettings } from '$lib/server/data.js';
import { formatInvoiceNumber } from '$lib/server/numeracja.js';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types.js';
import type { Invoice } from '$lib/types.js';

export const GET: RequestHandler = () => {
	try {
		const invoices = listInvoices();
		return json(invoices);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const settings = getSettings();

		const now = new Date().toISOString();
		const issueDate = body.issueDate ?? new Date().toISOString().slice(0, 10);
		const sequenceNumber = body.sequenceNumber ?? settings.nextInvoiceNumber;
		const number = formatInvoiceNumber(
			settings.invoiceNumberTemplate,
			sequenceNumber,
			new Date(issueDate)
		);

		const invoice: Invoice = {
			id: uuidv4(),
			number,
			sequenceNumber,
			issueDate,
			saleDate: body.saleDate ?? issueDate,
			paymentDueDate: body.paymentDueDate ?? issueDate,
			paymentMethod: body.paymentMethod ?? 'transfer',
			bankAccount: body.bankAccount ?? settings.seller.bankAccount,
			seller: body.seller ?? {
				nip: settings.seller.nip,
				name: settings.seller.name,
				address: settings.seller.address,
				city: settings.seller.city,
				postalCode: settings.seller.postalCode
			},
			buyer: body.buyer,
			items: body.items ?? [],
			summary: body.summary ?? { netTotal: 0, vatTotal: 0, grossTotal: 0, byVatRate: [] },
			comments: body.comments,
			status: body.status ?? 'draft',
			createdAt: now,
			updatedAt: now
		};

		saveInvoice(invoice);

		// Inkrementuj nextInvoiceNumber tylko dla nowych faktur (nie kopiowanych z nadanym numerem)
		if (!body.sequenceNumber) {
			settings.nextInvoiceNumber = sequenceNumber + 1;
			const { saveSettings } = await import('$lib/server/data.js');
			saveSettings(settings);
		}

		return json(invoice, { status: 201 });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
