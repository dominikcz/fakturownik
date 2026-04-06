import { json } from '@sveltejs/kit';
import { getInvoice, saveInvoice, listInvoices, getSettings } from '$lib/server/data.js';
import {
	formatInvoiceNumber,
	getTemplatePeriod,
	getPeriodKey,
	isCommittedInvoice
} from '$lib/server/numeracja.js';
import { validateInvoiceForKsef, KsefValidationError } from '$lib/server/ksef.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });
		return json(invoice);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });

		const body = await request.json();
		const settings = getSettings();
		const template = settings.invoiceNumberTemplate;

		const sequenceNumber: number = body.sequenceNumber ?? invoice.sequenceNumber;
		const issueDate: string = body.issueDate ?? invoice.issueDate;
		const issueDateObj = new Date(issueDate);

		// Przelicz numer faktury jeśli zmienił się sequenceNumber lub data wystawienia
		const number = formatInvoiceNumber(template, sequenceNumber, issueDateObj);

		// Sprawdź duplikat numeru (z wyłączeniem bieżącej faktury, tylko wśród wystawionych)
		const invoices = listInvoices();
		const issuedOthers = invoices.filter((inv) => inv.id !== params.id && isCommittedInvoice(inv));
		if (issuedOthers.some((inv) => inv.number === number)) {
			return json({ error: `Faktura o numerze „${number}" już istnieje.` }, { status: 409 });
		}

		// Sprawdź czy numer sekwencyjny nie jest niższy niż max wystawionych w danym okresie
		const period = getTemplatePeriod(template);
		const currentKey = getPeriodKey(period, issueDateObj);
		const issuedInPeriod = issuedOthers.filter(
			(inv) => getPeriodKey(period, new Date(inv.issueDate)) === currentKey
		);
		const maxInPeriod = issuedInPeriod.length > 0 ? Math.max(...issuedInPeriod.map((i) => i.sequenceNumber)) : 0;

		// Blokuj tylko jeśli faktura ma status zatwierdzony
		const newStatus: string = body.status ?? invoice.status;
		if (isCommittedInvoice({ status: newStatus } as Invoice) && sequenceNumber <= maxInPeriod) {
			return json(
				{
					error: `Numer sekwencyjny ${sequenceNumber} jest niższy lub równy ostatniemu wystawionemu w tym okresie (${maxInPeriod}). Następny dostępny: ${maxInPeriod + 1}.`
				},
				{ status: 409 }
			);
		}

		const updated = {
			...invoice,
			...body,
			id: params.id,
			number,
			sequenceNumber,
			updatedAt: new Date().toISOString()
		};

		// Jeśli faktura miała błąd KSeF, resetuj stan i przeprowadź walidację
		if (invoice.status === 'ksef_error') {
			updated.status = 'draft';
			updated.ksefErrorMessage = undefined;
			updated.ksefSessionRef = undefined;
			updated.ksefInvoiceRef = undefined;
		}

		// Walidacja XML (dla wszystkich edytowanych faktur nie będących szkicami, oraz po resecie błędu)
		if (updated.status !== 'draft') {
			try {
				await validateInvoiceForKsef(updated);
			} catch (err) {
				if (err instanceof KsefValidationError) {
					return json({ error: 'Walidacja XML nie powiodła się', validationErrors: err.issues }, { status: 422 });
				}
				throw err;
			}
		}

		saveInvoice(updated);
		return json(updated);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
