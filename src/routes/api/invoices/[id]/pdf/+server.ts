import { getInvoice } from '$lib/server/data.js';
import { generateInvoicePdf } from '$lib/server/pdf.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });

		const pdfBuffer = await generateInvoicePdf(invoice, invoice.ksefNumber);

		return new Response(pdfBuffer.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="faktura-${invoice.number.replace(/\//g, '-')}.pdf"`,
				'Content-Length': String(pdfBuffer.length)
			}
		});
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
