import { listInvoices } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const invoices = listInvoices().slice(0, 5);
	const allInvoices = listInvoices();

	const totalGross = allInvoices
		.filter((i) => i.status !== 'draft')
		.reduce((sum, i) => sum + i.summary.grossTotal, 0);

	const thisMonth = new Date();
	const monthInvoices = allInvoices.filter((i) => {
		const d = new Date(i.issueDate);
		return d.getFullYear() === thisMonth.getFullYear() && d.getMonth() === thisMonth.getMonth();
	});

	return {
		recentInvoices: invoices,
		stats: {
			total: allInvoices.length,
			totalGross,
			thisMonth: monthInvoices.length,
			drafts: allInvoices.filter((i) => i.status === 'draft').length
		}
	};
};
