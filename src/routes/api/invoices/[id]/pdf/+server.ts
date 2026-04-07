import { getInvoice, getSettings } from '$lib/server/data.js';
import { generateInvoicePdf } from '$lib/server/pdf.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const invoice = getInvoice(params.id);
		if (!invoice) return json({ error: 'Nie znaleziono faktury' }, { status: 404 });

		const settings = getSettings();
		const pdfBuffer = await generateInvoicePdf(invoice, settings);

		const date = new Date(invoice.issueDate);
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const filename = `Faktura_${yyyy}-${mm}-${invoice.sequenceNumber}.pdf`;

		return new Response(pdfBuffer.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': String(pdfBuffer.length)
			}
		});
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
