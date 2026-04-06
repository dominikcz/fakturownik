import { buildFakturaXml } from 'ksef-client';
import type { Invoice } from '$lib/types.js';

const VAT_RATE_MAP: Record<string, string> = {
	'23': 'PL_23',
	'8': 'PL_8',
	'5': 'PL_5',
	'0': 'PL_0',
	zw: 'ZW',
	np: 'NP'
};

/**
 * Buduje XML FA(3) z danych faktury.
 */
export function buildFa3Xml(invoice: Invoice): string {
	const issueDate = invoice.issueDate; // YYYY-MM-DD
	const saleDate = invoice.saleDate;

	// Grupowanie pozycji wg stawki VAT dla podsumowania
	const byRate = invoice.summary.byVatRate;

	// Pozycje faktury (FaWiersz)
	const faWiersze = invoice.items.map((item, idx) => ({
		NrWierszaFa: { _text: String(idx + 1) },
		P_7: { _text: item.description },
		P_8A: { _text: item.unit },
		P_8B: { _text: String(item.quantity) },
		P_9A: { _text: item.unitPriceNet.toFixed(2) },
		P_11: { _text: item.netTotal.toFixed(2) },
		P_12: { _text: VAT_RATE_MAP[item.vatRate] ?? item.vatRate }
	}));

	// Sumy wg stawek
	const vatFields: Record<string, { _text: string }> = {};
	for (const row of byRate) {
		const rate = row.rate;
		if (rate === '23') {
			vatFields['P_13_1'] = { _text: row.net.toFixed(2) };
			vatFields['P_14_1'] = { _text: row.vat.toFixed(2) };
		} else if (rate === '8') {
			vatFields['P_13_2'] = { _text: row.net.toFixed(2) };
			vatFields['P_14_2'] = { _text: row.vat.toFixed(2) };
		} else if (rate === '5') {
			vatFields['P_13_3'] = { _text: row.net.toFixed(2) };
			vatFields['P_14_3'] = { _text: row.vat.toFixed(2) };
		} else if (rate === '0') {
			vatFields['P_13_6'] = { _text: row.net.toFixed(2) };
		} else if (rate === 'zw') {
			vatFields['P_13_7'] = { _text: row.net.toFixed(2) };
		}
	}

	const paymentFormMap: Record<string, string> = {
		transfer: '6',
		cash: '1',
		card: '3'
	};

	const fakturaInput = {
		Naglowek: {
			KodFormularza: {
				_attributes: {
					kodSystemowy: 'FA (3)',
					wersjaSchemy: '1-0E'
				},
				_text: 'FA'
			},
			WariantFormularza: { _text: '3' },
			DataWytworzeniaFa: { _text: new Date().toISOString() },
			SystemInfo: { _text: 'Fakturownik v1.0' }
		},
		Podmiot1: {
			DaneIdentyfikacyjne: {
				NIP: { _text: invoice.seller.nip },
				Nazwa: { _text: invoice.seller.name }
			},
			Adres: {
				KodKraju: { _text: 'PL' },
				AdresL1: { _text: invoice.seller.address },
				AdresL2: { _text: `${invoice.seller.postalCode} ${invoice.seller.city}` }
			}
		},
		Podmiot2: {
			DaneIdentyfikacyjne: {
				NIP: { _text: invoice.buyer.nip },
				Nazwa: { _text: invoice.buyer.name }
			},
			Adres: {
				KodKraju: { _text: invoice.buyer.country ?? 'PL' },
				AdresL1: { _text: invoice.buyer.address },
				AdresL2: { _text: `${invoice.buyer.postalCode} ${invoice.buyer.city}` }
			}
		},
		Fa: {
			KodWaluty: { _text: 'PLN' },
			P_1: { _text: issueDate },
			P_1M: { _text: saleDate },
			P_2: { _text: invoice.number },
			P_6: { _text: saleDate },
			...vatFields,
			P_15: { _text: invoice.summary.grossTotal.toFixed(2) },
			Adnotacje: {
				P_16: { _text: '2' },
				P_17: { _text: '2' },
				P_18: { _text: '2' },
				P_19: { _text: '2' },
				P_23: { _text: '2' }
			},
			RodzajFaktury: { _text: 'VAT' },
			FaWiersze: {
				LiczbaWierszyFaktury: { _text: String(invoice.items.length) },
				WartoscWierszyFaktury1: { _text: invoice.summary.netTotal.toFixed(2) },
				WartoscWierszyFaktury2: { _text: invoice.summary.grossTotal.toFixed(2) },
				FaWiersz: faWiersze
			},
			Platnosc: {
				FormaPlatnosci: { _text: paymentFormMap[invoice.paymentMethod] ?? '6' },
				...(invoice.bankAccount
					? { RachunekBankowy: [{ NrRB: { _text: invoice.bankAccount } }] }
					: {}),
				TerminyPlatnosci: [
					{
						Termin: { _text: invoice.paymentDueDate }
					}
				]
			},
			...(invoice.comments ? { DodatkowyOpis: [{ Klucz: { _text: 'Uwagi' }, Wartosc: { _text: invoice.comments } }] } : {})
		}
	};

	return buildFakturaXml(fakturaInput, { schema: 'FA3', pretty: true });
}
