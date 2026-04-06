import { getInvoice, getSettings } from '$lib/server/data.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const invoice = getInvoice(params.id);
	if (!invoice) error(404, 'Nie znaleziono faktury');
	const settings = getSettings();
	return { invoice, settings };
};
