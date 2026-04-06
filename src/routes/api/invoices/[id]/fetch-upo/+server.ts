import { json } from '@sveltejs/kit';
import { getInvoice, saveInvoice, getSettings } from '$lib/server/data.js';
import { fetchUpoForInvoice, KsefSessionInvoiceError } from '$lib/server/ksef.js';
import { KsefApiError } from 'ksef-client';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });

		const settings = getSettings();
		const result = await fetchUpoForInvoice(invoice, settings);

		const updated = {
			...invoice,
			status: 'ksef_accepted' as const,
			ksefNumber: result.ksefNumber,
			upoXml: result.upoXml,
			updatedAt: new Date().toISOString()
		};
		saveInvoice(updated);

		return json({ ksefNumber: result.ksefNumber });
	} catch (err) {
		const invoice = getInvoice(params.id);
		if (err instanceof KsefSessionInvoiceError) {
			if (invoice) {
				saveInvoice({
					...invoice,
					status: 'ksef_error',
					ksefErrorMessage: err.errors.map(e => e.description).join('; '),
					updatedAt: new Date().toISOString()
				});
			}
			return json({
				error: 'KSeF odrzucił fakturę',
				ksefErrors: err.errors
			}, { status: 422 });
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
