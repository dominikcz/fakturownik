import type { Invoice } from '$lib/types.js';

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
