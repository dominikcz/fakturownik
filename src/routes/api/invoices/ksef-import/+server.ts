import { json } from '@sveltejs/kit';
import { getSettings, listInvoices, saveInvoice } from '$lib/server/data.js';
import { fetchKsefInvoiceXml, queryKsefInvoices } from '$lib/server/ksef.js';
import { parseKsefFaXml } from '$lib/server/xml.js';
import type { RequestHandler } from './$types.js';
import { randomUUID } from 'node:crypto';

export const GET: RequestHandler = async ({ url }) => {
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	if (!dateFrom || !dateTo) {
		return json({ error: 'Wymagane parametry: dateFrom, dateTo' }, { status: 400 });
	}
	try {
		const settings = getSettings();
		const invoices = await queryKsefInvoices(settings, dateFrom, dateTo);
		return json({ invoices });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, url }) => {
	const force = url.searchParams.get('force') === 'true';
	try {
		const body = await request.json() as { items: import('$lib/server/ksef.js').KsefInvoiceMeta[] };
		if (!Array.isArray(body.items) || body.items.length === 0) {
			return json({ error: 'Brak faktur do importu' }, { status: 400 });
		}

		const settings = getSettings();
		const existing = listInvoices();
		// Zbieramy wszystkie identyfikatory KSeF z istniejących faktur —
		// zarówno ksefNumber jak i ksefInvoiceRef, bo faktury wysłane lokalnie
		// mogą mieć w ksefNumber wartość ksefInvoiceRef (ref sesji), a nie
		// finalny numer KSeF nadany przez system.
		// Zbieramy wszystkie identyfikatory KSeF z istniejących faktur.
		// Faktury wysłane lokalnie mają ksefNumber = ksefInvoiceRef (session ref),
		// a nie finalny numer KSeF. Ten ostatni jest w upoXml jako <NumerKSeFDokumentu>.
		const existingKsefNrs = new Set<string>();
		for (const inv of existing) {
			if (inv.ksefNumber)     existingKsefNrs.add(inv.ksefNumber);
			if (inv.ksefInvoiceRef) existingKsefNrs.add(inv.ksefInvoiceRef);
			if (inv.upoXml) {
				const m = inv.upoXml.match(/<NumerKSeFDokumentu>([^<]+)<\/NumerKSeFDokumentu>/);
				if (m) existingKsefNrs.add(m[1]);
			}
		}

		const imported: string[] = [];
		const skipped: string[] = [];

		for (const meta of body.items) {
			if (!meta.ksefReferenceNumber) continue;
			if (!force && existingKsefNrs.has(meta.ksefReferenceNumber)) {
				skipped.push(meta.ksefReferenceNumber);
				continue;
			}

			// KSeF zwraca daty jako pełny datetime z TZ (np. "2026-06-30T22:13:37+00:00").
			// Bierzemy tylko część YYYY-MM-DD, żeby uniknąć przesunięcia o 1 dzień
			// przy konwersji na strefę polską (UTC+2 latem).
			const dateStr = (meta.invoicingDate || '').slice(0, 10);
			const paymentDays = settings.defaultPaymentDays ?? 14;
			const dueDate = dateStr
				? new Date(new Date(dateStr).getTime() + paymentDays * 86400000)
						.toISOString()
						.slice(0, 10)
				: dateStr;

			// Pobierz pełny XML faktury z KSeF i sparsuj pozycje
			let parsed: import('$lib/server/xml.js').ParsedKsefInvoice | null = null;
			try {
				const xml = await fetchKsefInvoiceXml(settings, meta.ksefReferenceNumber);
				parsed = parseKsefFaXml(xml);
			} catch (xmlErr) {
				console.warn(`Nie udało się pobrać XML dla ${meta.ksefReferenceNumber}:`, xmlErr);
			}

			const id = randomUUID();
			const invoice = {
				id,
				number: parsed?.number || meta.invoiceNumber,
				sequenceNumber: 0,
				issueDate: parsed?.issueDate || dateStr,
				saleDate: parsed?.saleDate || dateStr,
				placeOfIssue: parsed?.placeOfIssue || settings.seller.city || '',
				paymentDueDate: parsed?.paymentDueDate || dueDate,
				paymentMethod: (parsed?.paymentMethod || 'transfer') as 'transfer' | 'cash' | 'card',
				...(parsed?.bankAccount ? { bankAccount: parsed.bankAccount } : {}),
				seller: parsed?.seller
					? { ...parsed.seller, country: 'PL' as const }
					: {
							nip: meta.sellerNip,
							name: meta.sellerName,
							address: '',
							city: '',
							postalCode: '',
							country: 'PL' as const,
						},
				buyer: parsed?.buyer || {
					nip: meta.buyerNip,
					name: meta.buyerName,
					address: '',
					city: '',
					postalCode: '',
					country: 'PL' as const,
				},
				items: parsed?.items || [],
				summary: parsed?.summary || {
					netTotal: meta.net,
					vatTotal: meta.vat,
					grossTotal: meta.gross,
					byVatRate: [],
				},
				status: 'ksef_accepted' as const,
				ksefNumber: meta.ksefReferenceNumber,
				ksefImported: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			saveInvoice(invoice);
			existingKsefNrs.add(meta.ksefReferenceNumber);
			imported.push(meta.ksefReferenceNumber);
		}

		return json({ imported: imported.length, skipped: skipped.length });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
