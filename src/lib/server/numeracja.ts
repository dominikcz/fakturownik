import type { Invoice } from '$lib/types.js';

/**
 * Statusy, które blokują numerację — tylko faktury faktycznie zatwierdzone.
 * 'ksef_error' traktujemy jak szkic (faktura nie trafiła do KSeF).
 */
export function isCommittedInvoice(inv: Invoice): boolean {
	return inv.status === 'issued'
		|| inv.status === 'sent_to_ksef'
		|| inv.status === 'ksef_pending_upo'
		|| inv.status === 'ksef_accepted';
}

/**
 * Formatuje numer faktury według szablonu.
 * Tokeny: x=numer sekwencyjny, m=miesiąc, mm=miesiąc z zerem, rrrr=rok
 */
export function formatInvoiceNumber(template: string, sequenceNum: number, date: Date): string {
	const year = date.getFullYear().toString();
	const month = (date.getMonth() + 1).toString();
	const monthPadded = month.padStart(2, '0');

	return template
		.replace(/rrrr/g, year)
		.replace(/mm/g, monthPadded)
		.replace(/m/g, month)
		.replace(/x/g, sequenceNum.toString());
}

/** Typ okresu rozliczeniowego wynikający ze szablonu numeracji. */
export type TemplatePeriod = 'month' | 'year' | 'none';

/** Zwraca typ okresu na podstawie szablonu. */
export function getTemplatePeriod(template: string): TemplatePeriod {
	if (/m/.test(template)) return 'month';
	if (/rrrr/.test(template)) return 'year';
	return 'none';
}

/** Klucz okresu dla danej daty (np. "2026-04", "2026" lub "" dla braku resetu). */
export function getPeriodKey(period: TemplatePeriod, date: Date): string {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	if (period === 'month') return `${year}-${String(month).padStart(2, '0')}`;
	if (period === 'year') return `${year}`;
	return '';
}

/** Klucz okresu faktury na podstawie jej issueDate. */
function invoicePeriodKey(period: TemplatePeriod, invoice: Invoice): string {
	return getPeriodKey(period, new Date(invoice.issueDate));
}

/**
 * Zwraca kolejny numer sekwencyjny dla danego okresu.
 * Bierze max spośród WSZYSTKICH faktur (łącznie ze szkicami),
 * żeby nowa faktura nie kolidowała z żadnym istniejącym numerem.
 * Walidacja duplikatów i blokad nadal działa tylko na fakturach zatwierdzonych.
 */
export function getNextSequenceForPeriod(
	invoices: Invoice[],
	template: string,
	issueDate: Date
): number {
	const period = getTemplatePeriod(template);
	const currentKey = getPeriodKey(period, issueDate);
	const inPeriod = invoices.filter(
		(inv) => invoicePeriodKey(period, inv) === currentKey
	);
	if (inPeriod.length === 0) return 1;
	return Math.max(...inPeriod.map((i) => i.sequenceNumber)) + 1;
}

/**
 * Sprawdza, czy sekwencja numerów faktur jest ciągła (bez dziur).
 * Zwraca tablicę błędów lub pustą tablicę jeśli wszystko OK.
 */
export function validateSequence(invoices: Invoice[]): string[] {
	const errors: string[] = [];
	if (invoices.length === 0) return errors;

	const sorted = [...invoices].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

	for (let i = 0; i < sorted.length; i++) {
		const expected = sorted[0].sequenceNumber + i;
		if (sorted[i].sequenceNumber !== expected) {
			errors.push(
				`Dziura w numeracji: brak numeru sekwencyjnego ${expected} (faktury: ${sorted[i - 1]?.sequenceNumber} → ${sorted[i].sequenceNumber})`
			);
		}
	}

	return errors;
}

/**
 * Zwraca kolejny numer sekwencyjny (max istniejący + 1 lub 1)
 */
export function getNextSequenceNumber(invoices: Invoice[]): number {
	if (invoices.length === 0) return 1;
	return Math.max(...invoices.map((i) => i.sequenceNumber)) + 1;
}
