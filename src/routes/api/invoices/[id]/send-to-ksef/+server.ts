import { json } from '@sveltejs/kit';
import { getInvoice, saveInvoice, getSettings } from '$lib/server/data.js';
import { sendInvoiceToKsef } from '$lib/server/ksef.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });

		const settings = getSettings();
		const result = await sendInvoiceToKsef(invoice, settings);

		const updated = {
			...invoice,
			status: 'ksef_accepted' as const,
			ksefNumber: result.ksefNumber,
			ksefSessionRef: result.sessionRef,
			upoXml: result.upoXml,
			updatedAt: new Date().toISOString()
		};
		saveInvoice(updated);

		return json({ ksefNumber: result.ksefNumber, sessionRef: result.sessionRef });
	} catch (err) {
		// Ustaw status błędu
		const invoice = getInvoice(params.id);
		if (invoice) {
			saveInvoice({
				...invoice,
				status: 'ksef_error',
				ksefErrorMessage: String(err),
				updatedAt: new Date().toISOString()
			});
		}
		return json({ error: String(err) }, { status: 500 });
	}
};
