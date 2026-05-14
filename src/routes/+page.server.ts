import { listInvoices, getCategories } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const invoices = listInvoices().slice(0, 5);
	const allInvoices = listInvoices();
	const categories = getCategories();

	const totalGross = allInvoices
		.filter((i) => i.status !== 'draft')
		.reduce((sum, i) => sum + i.summary.grossTotal, 0);

	const thisMonth = new Date();
	const monthInvoices = allInvoices.filter((i) => {
		const d = new Date(i.issueDate);
		return d.getFullYear() === thisMonth.getFullYear() && d.getMonth() === thisMonth.getMonth();
	});

	// Podsumowanie per kategoria (tylko wystawione)
	const issuedInvoices = allInvoices.filter((i) => i.status !== 'draft');
	const categoryStats = categories.map((cat) => {
		const catInvoices = issuedInvoices.filter((i) => i.categoryId === cat.id);
		return {
			id: cat.id,
			name: cat.name,
			color: cat.color,
			symbol: cat.symbol,
			count: catInvoices.length,
			grossTotal: catInvoices.reduce((s, i) => s + i.summary.grossTotal, 0),
			netTotal: catInvoices.reduce((s, i) => s + i.summary.netTotal, 0)
		};
	});

	// Faktury bez kategorii (wystawione)
	const uncategorizedInvoices = issuedInvoices.filter((i) => !i.categoryId);
	const uncategorized = {
		count: uncategorizedInvoices.length,
		grossTotal: uncategorizedInvoices.reduce((s, i) => s + i.summary.grossTotal, 0),
		netTotal: uncategorizedInvoices.reduce((s, i) => s + i.summary.netTotal, 0)
	};

	return {
		recentInvoices: invoices,
		categories,
		stats: {
			total: allInvoices.length,
			totalGross,
			thisMonth: monthInvoices.length,
			drafts: allInvoices.filter((i) => i.status === 'draft').length
		},
		categoryStats,
		uncategorized
	};
};
