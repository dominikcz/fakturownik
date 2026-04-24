import { json } from '@sveltejs/kit';
import { getInvoice, saveInvoice, getSettings } from '$lib/server/data.js';
import { sendInvoiceToKsef, KsefValidationError } from '$lib/server/ksef.js';
import { KsefApiError } from 'ksef-client';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });

		const settings = getSettings();
		const result = await sendInvoiceToKsef(invoice, settings);

		const updated = {
			...invoice,
			status: 'ksef_pending_upo' as const,
			ksefSessionRef: result.sessionRef,
			ksefInvoiceRef: result.invoiceRef,
			ksefInvoiceHash: result.invoiceHash,
			updatedAt: new Date().toISOString()
		};
		saveInvoice(updated);

		return json({ sessionRef: result.sessionRef, invoiceRef: result.invoiceRef });
	} catch (err) {
		const invoice = getInvoice(params.id);
		if (invoice) {
			saveInvoice({
				...invoice,
				status: 'ksef_error',
				ksefErrorMessage: err instanceof KsefValidationError
					? `Walidacja (${err.issues.length} błędów)`
					: String(err),
				updatedAt: new Date().toISOString()
			});
		}
		if (err instanceof KsefValidationError) {
			return json({ error: 'Walidacja XML nie powiodła się', validationErrors: err.issues }, { status: 422 });
		}
		if (err instanceof KsefApiError) {
			let details: unknown = err.responseBody;
			try {
				if (typeof details === 'string') details = JSON.parse(details);
			} catch { /* zostaw string */ }
			return json({
				error: String(err),
				ksefStatusCode: err.statusCode,
				ksefResponse: details
			}, { status: 500 });
		}
		return json({ error: String(err) }, { status: 500 });
	}
};
