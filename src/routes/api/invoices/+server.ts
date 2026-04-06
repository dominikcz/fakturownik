import { json } from '@sveltejs/kit';
import { listInvoices, saveInvoice, getSettings } from '$lib/server/data.js';
import {
	formatInvoiceNumber,
	getNextSequenceForPeriod,
	getTemplatePeriod,
	getPeriodKey,
	isCommittedInvoice
} from '$lib/server/numeracja.js';
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
		const invoices = listInvoices();

		const now = new Date().toISOString();
		const issueDate = body.issueDate ?? new Date().toISOString().slice(0, 10);
		const issueDateObj = new Date(issueDate);
		const template = settings.invoiceNumberTemplate;

		// Wyznacz numer sekwencyjny: użyj podanego lub wylicz następny dla okresu
		const sequenceNumber: number =
			body.sequenceNumber ?? getNextSequenceForPeriod(invoices, template, issueDateObj);

		const number = formatInvoiceNumber(template, sequenceNumber, issueDateObj);

		// Sprawdź duplikat numeru faktury (tylko wśród wystawionych — szkice mogą się dublować)
		const issuedInvoices = invoices.filter(isCommittedInvoice);
		if (issuedInvoices.some((inv) => inv.number === number)) {
			return json({ error: `Faktura o numerze „${number}" już istnieje.` }, { status: 409 });
		}

		// Sprawdź, czy numer sekwencyjny nie jest niższy niż max wystawionych w danym okresie
		const period = getTemplatePeriod(template);
		const currentKey = getPeriodKey(period, issueDateObj);
		const issuedInPeriod = issuedInvoices.filter(
			(inv) => getPeriodKey(period, new Date(inv.issueDate)) === currentKey
		);
		const maxInPeriod = issuedInPeriod.length > 0 ? Math.max(...issuedInPeriod.map((i) => i.sequenceNumber)) : 0;

		// Blokuj tylko jeśli faktura ma status zatwierdzony
		const newStatus: string = body.status ?? 'draft';
		if (isCommittedInvoice({ status: newStatus } as Invoice) && sequenceNumber <= maxInPeriod) {
			return json(
				{
					error: `Numer sekwencyjny ${sequenceNumber} jest niższy lub równy ostatniemu wystawionemu w tym okresie (${maxInPeriod}). Następny dostępny: ${maxInPeriod + 1}.`
				},
				{ status: 409 }
			);
		}

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

		// Zaktualizuj nextInvoiceNumber w settings jako wskazówkę dla UI
		settings.nextInvoiceNumber = sequenceNumber + 1;
		const { saveSettings } = await import('$lib/server/data.js');
		saveSettings(settings);

		return json(invoice, { status: 201 });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
