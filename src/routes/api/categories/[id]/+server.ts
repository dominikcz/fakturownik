import { json } from '@sveltejs/kit';
import { getCategories, saveCategories } from '$lib/server/data.js';
import type { RequestHandler } from './$types.js';
import type { InvoiceCategory } from '$lib/types.js';

export const PUT: RequestHandler = async ({ params, request }) => {
	const { id } = params;
	const body = await request.json() as Partial<InvoiceCategory>;

	if (!body.name?.trim()) {
		return json({ error: 'Nazwa kategorii jest wymagana' }, { status: 400 });
	}
	if (!body.color?.trim()) {
		return json({ error: 'Kolor kategorii jest wymagany' }, { status: 400 });
	}
	if (!body.symbol?.trim()) {
		return json({ error: 'Symbol kategorii jest wymagany' }, { status: 400 });
	}

	const categories = getCategories();
	const idx = categories.findIndex((c) => c.id === id);
	if (idx === -1) {
		return json({ error: 'Nie znaleziono kategorii' }, { status: 404 });
	}
	categories[idx] = { id, name: body.name.trim(), color: body.color.trim(), symbol: body.symbol.trim() };
	saveCategories(categories);
	return json(categories[idx]);
};

export const DELETE: RequestHandler = ({ params }) => {
	const { id } = params;
	const categories = getCategories();
	const idx = categories.findIndex((c) => c.id === id);
	if (idx === -1) {
		return json({ error: 'Nie znaleziono kategorii' }, { status: 404 });
	}
	categories.splice(idx, 1);
	saveCategories(categories);
	return new Response(null, { status: 204 });
};
