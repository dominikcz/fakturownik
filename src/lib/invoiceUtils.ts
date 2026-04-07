export const vatRateLabels: Record<string, string> = {
	'23': '23%',
	'8': '8%',
	'5': '5%',
	'0': '0%',
	zw: 'ZW',
	np: 'NP'
};

export const paymentMethodLabels: Record<string, string> = {
	transfer: 'Przelew bankowy',
	cash: 'Gotówka',
	card: 'Karta płatnicza'
};

export function fmt(n: number): string {
	return new Intl.NumberFormat('pl-PL', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(n);
}
