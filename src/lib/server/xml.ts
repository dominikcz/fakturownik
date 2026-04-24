import type { Invoice } from '$lib/types.js';

const FA3_NS = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
const ETD_NS = 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/';

// KSeF FA(3) P_12 values per §10.3
const VAT_RATE_MAP: Record<string, string> = {
	'23': '23',
	'8': '8',
	'5': '5',
	'0': '0 KR',  // domestic zero-rated
	'zw': 'zw',
	'np': 'np I'
};

function esc(v: string | number): string {
	return String(v)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function el(name: string, value: string | number | undefined | null): string {
	if (value === undefined || value === null) return '';
	return `<${name}>${esc(value)}</${name}>`;
}

/**
 * Buduje XML FA(3) z danych faktury.
 * Pola VAT są budowane ręcznie (para P_13_x / P_14_x) bo ksef-client ORDER_MAP
 * niepoprawnie grupuje wszystkie P_13_x przed P_14_x, a XSD wymaga par.
 */
export function buildFa3Xml(invoice: Invoice): string {
	const byRate = invoice.summary.byVatRate;
	const paymentFormMap: Record<string, string> = { transfer: '6', cash: '1', card: '3' };

	const sellerNip = invoice.seller.nip.replace(/\D/g, '');
	const buyerNip = invoice.buyer.nip?.replace(/\D/g, '') ?? '';
	const now = invoice.createdAt;

	// VAT pairs in schema-required order: (P_13_1,P_14_1), (P_13_2,P_14_2), ...
	const vatRateToGroup: Record<string, { p13: number; p14: number; p13field: string; p14field?: string }> = {
		'23': { p13: 1, p14: 1, p13field: 'P_13_1', p14field: 'P_14_1' },
		'8':  { p13: 2, p14: 2, p13field: 'P_13_2', p14field: 'P_14_2' },
		'5':  { p13: 3, p14: 3, p13field: 'P_13_3', p14field: 'P_14_3' },
		'0':  { p13: 6, p14: 6, p13field: 'P_13_6' },   // no P_14 for 0%
		'zw': { p13: 7, p14: 7, p13field: 'P_13_7' },   // no P_14 for zw
		'np': { p13: 8, p14: 8, p13field: 'P_13_8' },   // no P_14 for np
	};

	// Sort VAT rate groups by group number to keep consistent order
	const sortedRates = byRate
		.map((row) => ({ row, grp: vatRateToGroup[row.rate] }))
		.filter((x) => x.grp)
		.sort((a, b) => a.grp.p13 - b.grp.p13);

	const vatPairs = sortedRates.map(({ row, grp }) => {
		let pairs = el(grp.p13field, row.net.toFixed(2));
		if (grp.p14field && row.vat > 0) {
			pairs += el(grp.p14field, row.vat.toFixed(2));
		}
		return pairs;
	}).join('');

	// Invoice rows
	const rows = invoice.items.map((item, idx) => `
		<FaWiersz>
			${el('NrWierszaFa', String(idx + 1))}
			${el('P_7', item.description)}
			${el('P_8A', item.unit)}
			${el('P_8B', parseFloat(item.quantity.toFixed(6)).toString())}
			${el('P_9A', item.unitPriceNet.toFixed(2))}
			${el('P_11', item.netTotal.toFixed(2))}
			${el('P_12', VAT_RATE_MAP[item.vatRate] ?? item.vatRate)}
		</FaWiersz>`).join('');

	// Bank account
	const bankXml = invoice.bankAccount
		? `<RachunekBankowy><NrRB>${esc(invoice.bankAccount.replace(/\s/g, ''))}</NrRB></RachunekBankowy>`
		: '';

	// Comments
	const commentsXml = invoice.comments
		? `<DodatkowyOpis><Klucz>Uwagi</Klucz><Wartosc>${esc(invoice.comments)}</Wartosc></DodatkowyOpis>`
		: '';

	// Sale date (only when different from issue date)
	const saleDateXml = invoice.saleDate !== invoice.issueDate
		? el('P_6', invoice.saleDate)
		: '';

	return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="${FA3_NS}" xmlns:etd="${ETD_NS}">
	<Naglowek>
		<KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>
		<WariantFormularza>3</WariantFormularza>
		<DataWytworzeniaFa>${esc(now)}</DataWytworzeniaFa>
		<SystemInfo>Fakturownik v1.0</SystemInfo>
	</Naglowek>
	<Podmiot1>
		<DaneIdentyfikacyjne>
			<NIP>${esc(sellerNip)}</NIP>
			<Nazwa>${esc(invoice.seller.name)}</Nazwa>
		</DaneIdentyfikacyjne>
		<Adres>
			<KodKraju>PL</KodKraju>
			<AdresL1>${esc(invoice.seller.address)}</AdresL1>
			<AdresL2>${esc(invoice.seller.postalCode)} ${esc(invoice.seller.city)}</AdresL2>
		</Adres>
	</Podmiot1>
	<Podmiot2>
		<DaneIdentyfikacyjne>
			<NIP>${esc(buyerNip)}</NIP>
			<Nazwa>${esc(invoice.buyer.name)}</Nazwa>
		</DaneIdentyfikacyjne>
		<Adres>
			<KodKraju>${esc(invoice.buyer.country ?? 'PL')}</KodKraju>
			<AdresL1>${esc(invoice.buyer.address)}</AdresL1>
			<AdresL2>${esc(invoice.buyer.postalCode)} ${esc(invoice.buyer.city)}</AdresL2>
		</Adres>
		<JST>2</JST>
		<GV>2</GV>
	</Podmiot2>
	<Fa>
		<KodWaluty>PLN</KodWaluty>
		${el('P_1', invoice.issueDate)}
		${el('P_2', invoice.number)}
		${saleDateXml}
		${vatPairs}
		${el('P_15', invoice.summary.grossTotal.toFixed(2))}
		<Adnotacje>
			<P_16>2</P_16>
			<P_17>2</P_17>
			<P_18>2</P_18>
			<P_18A>2</P_18A>
			<Zwolnienie><P_19N>1</P_19N></Zwolnienie>
			<NoweSrodkiTransportu><P_22N>1</P_22N></NoweSrodkiTransportu>
			<P_23>2</P_23>
			<PMarzy><P_PMarzyN>1</P_PMarzyN></PMarzy>
		</Adnotacje>
		<RodzajFaktury>VAT</RodzajFaktury>
		${commentsXml}
		${rows}
		<Platnosc>
			<TerminPlatnosci><Termin>${esc(invoice.paymentDueDate)}</Termin></TerminPlatnosci>
			<FormaPlatnosci>${paymentFormMap[invoice.paymentMethod] ?? '6'}</FormaPlatnosci>
			${bankXml}
		</Platnosc>
	</Fa>
</Faktura>`;
}

