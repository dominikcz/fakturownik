import { json } from '@sveltejs/kit';
import { getInvoice, saveInvoice } from '$lib/server/data.js';
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
		const updated = { ...invoice, ...body, id: params.id, updatedAt: new Date().toISOString() };
		saveInvoice(updated);
		return json(updated);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
