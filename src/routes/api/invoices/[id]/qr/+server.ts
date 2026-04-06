import { getInvoice, getSettings } from '$lib/server/data.js';
import { generateInvoiceQrDataUrl } from '$lib/server/qr.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });
		const settings = getSettings();
		const dataUrl = await generateInvoiceQrDataUrl(invoice, settings);
		return json({ dataUrl });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
