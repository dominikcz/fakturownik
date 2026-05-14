import { json } from '@sveltejs/kit';
import { getCategories, saveCategories } from '$lib/server/data.js';
import type { RequestHandler } from './$types.js';
import type { InvoiceCategory } from '$lib/types.js';
import { randomUUID } from 'node:crypto';

export const GET: RequestHandler = () => {
	return json(getCategories());
};

export const POST: RequestHandler = async ({ request }) => {
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
	const newCategory: InvoiceCategory = {
		id: randomUUID(),
		name: body.name.trim(),
		color: body.color.trim(),
		symbol: body.symbol.trim()
	};
	categories.push(newCategory);
	saveCategories(categories);
	return json(newCategory, { status: 201 });
};
