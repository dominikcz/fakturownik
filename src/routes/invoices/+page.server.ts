import { listInvoices } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const invoices = listInvoices();
	return { invoices };
};
