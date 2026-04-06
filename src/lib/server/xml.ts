import { buildFakturaXml } from 'ksef-client';
import type { Invoice } from '$lib/types.js';

// KSeF FA(3) P_12 values per §10.3
const VAT_RATE_MAP: Record<string, string> = {
	'23': '23',
	'8': '8',
	'5': '5',
	'0': '0 KR',  // domestic zero-rated
	'zw': 'zw',
	'np': 'np I'
};

/**
 * Buduje XML FA(3) z danych faktury.
 */
export function buildFa3Xml(invoice: Invoice): string {
	const byRate = invoice.summary.byVatRate;

	// Sumy wg stawek VAT
	const vatFields: Record<string, string> = {};
	for (const row of byRate) {
		if (row.rate === '23') {
			vatFields['P_13_1'] = row.net.toFixed(2);
			vatFields['P_14_1'] = row.vat.toFixed(2);
		} else if (row.rate === '8') {
			vatFields['P_13_2'] = row.net.toFixed(2);
			vatFields['P_14_2'] = row.vat.toFixed(2);
		} else if (row.rate === '5') {
			vatFields['P_13_3'] = row.net.toFixed(2);
			vatFields['P_14_3'] = row.vat.toFixed(2);
		} else if (row.rate === '0') {
			vatFields['P_13_6'] = row.net.toFixed(2);
		} else if (row.rate === 'zw') {
			vatFields['P_13_7'] = row.net.toFixed(2);
		}
	}

	const paymentFormMap: Record<string, string> = {
		transfer: '6',
		cash: '1',
		card: '3'
	};

	const sellerNip = invoice.seller.nip.replace(/\D/g, '');
	const buyerNip = invoice.buyer.nip?.replace(/\D/g, '') ?? '';

	const fakturaInput = {
		Naglowek: {
			// Specjalny format rozpoznawany przez buildFakturaXml
			KodFormularza: { systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA' },
			WariantFormularza: '3',
			DataWytworzeniaFa: new Date().toISOString(),
			SystemInfo: 'Fakturownik v1.0'
		},
		Podmiot1: {
			DaneIdentyfikacyjne: {
				NIP: sellerNip,
				Nazwa: invoice.seller.name
			},
			Adres: {
				KodKraju: 'PL',
				AdresL1: invoice.seller.address,
				AdresL2: `${invoice.seller.postalCode} ${invoice.seller.city}`
			}
		},
		Podmiot2: {
			DaneIdentyfikacyjne: {
				NIP: buyerNip,
				Nazwa: invoice.buyer.name
			},
			Adres: {
				KodKraju: invoice.buyer.country ?? 'PL',
				AdresL1: invoice.buyer.address,
				AdresL2: `${invoice.buyer.postalCode} ${invoice.buyer.city}`
			},
			JST: '2',
			GV: '2'
		},
		Fa: {
			KodWaluty: 'PLN',
			P_1: invoice.issueDate,
			P_2: invoice.number,
			// P_6 = data sprzedaży/dostawy (gdy różna od daty wystawienia lub wspólna dla wszystkich pozycji)
			...(invoice.saleDate !== invoice.issueDate ? { P_6: invoice.saleDate } : {}),
			...vatFields,
			P_15: invoice.summary.grossTotal.toFixed(2),
			Adnotacje: {
				P_16: '2',  // nie - metoda kasowa
				P_17: '2',  // nie - samofakturowanie
				P_18: '2',  // nie - odwrotne obciążenie
				P_18A: '2', // nie - w walucie obcej
				Zwolnienie: { P_19N: '1' },           // brak zwolnienia z VAT
				NoweSrodkiTransportu: { P_22N: '1' }, // nie dot. nowych środków transportu
				P_23: '2',                             // nie - kody GTU
				PMarzy: { P_PMarzyN: '1' }            // nie - procedura marży
			},
			RodzajFaktury: 'VAT',
			FaWiersz: invoice.items.map((item, idx) => ({
				NrWierszaFa: String(idx + 1),
				P_7: item.description,
				P_8A: item.unit,
				P_8B: parseFloat(item.quantity.toFixed(6)).toString(),
				P_9A: item.unitPriceNet.toFixed(2),
				P_11: item.netTotal.toFixed(2),
				P_12: VAT_RATE_MAP[item.vatRate] ?? item.vatRate
			})),
			Platnosc: {
				TerminPlatnosci: [{ Termin: invoice.paymentDueDate }],
				FormaPlatnosci: paymentFormMap[invoice.paymentMethod] ?? '6',
				...(invoice.bankAccount
					? { RachunekBankowy: [{ NrRB: invoice.bankAccount.replace(/\s/g, '') }] }
					: {})
			},
			...(invoice.comments
				? { DodatkowyOpis: [{ Klucz: 'Uwagi', Wartosc: invoice.comments }] }
				: {})
		}
	};

	return buildFakturaXml(fakturaInput, { schema: 'FA3', pretty: true });
}

