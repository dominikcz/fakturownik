import { listInvoices, getCategories } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const invoices = listInvoices();
	const categories = getCategories();
	return { invoices, categories };
};
