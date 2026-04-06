import type { RequestHandler } from './$types.js';
import { getInvoice } from '$lib/server/data.js';
import { buildFa3Xml } from '$lib/server/xml.js';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = ({ params }) => {
	const invoice = getInvoice(params.id);
	if (!invoice) error(404, 'Nie znaleziono faktury');

	const xml = buildFa3Xml(invoice);
	const filename = `faktura-${invoice.number.replace(/\//g, '-')}.xml`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
