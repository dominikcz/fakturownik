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

// ---------------------------------------------------------------------------
// Parser FA(3) XML z KSeF → dane faktury
// ---------------------------------------------------------------------------

function unescapeXml(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

/** Zwraca tekst pierwszego wystąpienia tagu (ignoruje namespace prefix). */
function tagText(xml: string, tag: string): string {
	const re = new RegExp(`<(?:[^:>]+:)?${tag}(?:\\s[^>]*)?>([^<]*)</(?:[^:>]+:)?${tag}>`);
	const m = xml.match(re);
	return m ? unescapeXml(m[1].trim()) : '';
}

/** Zwraca zawartość pierwszego bloku tagu. */
function tagBlock(xml: string, tag: string): string {
	const re = new RegExp(`<(?:[^:>]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[^:>]+:)?${tag}>`);
	const m = xml.match(re);
	return m ? m[1] : '';
}

/** Zwraca zawartości wszystkich bloków tagu. */
function tagBlocks(xml: string, tag: string): string[] {
	const re = new RegExp(`<(?:[^:>]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[^:>]+:)?${tag}>`, 'g');
	const results: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(xml)) !== null) results.push(m[1]);
	return results;
}

const P12_TO_VAT_RATE: Record<string, string> = {
	'23': '23', '8': '8', '5': '5',
	'0 KR': '0', '0': '0',
	'zw': 'zw', 'np I': 'np', 'np': 'np',
};

const FORMA_PLATNOSCI: Record<string, string> = {
	'1': 'cash', '3': 'card', '6': 'transfer',
};

export interface ParsedKsefInvoice {
	number: string;
	issueDate: string;
	saleDate: string;
	placeOfIssue: string;
	paymentDueDate: string;
	paymentMethod: string;
	bankAccount: string;
	seller: { nip: string; name: string; address: string; city: string; postalCode: string };
	buyer: { nip: string; name: string; address: string; city: string; postalCode: string; country: string };
	items: Array<{
		description: string; unit: string; quantity: number;
		unitPriceNet: number; vatRate: string;
		netTotal: number; vatTotal: number; grossTotal: number;
	}>;
	summary: { netTotal: number; vatTotal: number; grossTotal: number; byVatRate: Array<{ rate: string; net: number; vat: number; gross: number }> };
}

/** Parsuje AdresL2 w formacie "KK-KKK Miasto" → { postalCode, city }. */
function parseAdresL2(s: string): { postalCode: string; city: string } {
	const m = s.match(/^(\d{2}-\d{3})\s+(.+)$/);
	return m ? { postalCode: m[1], city: m[2] } : { postalCode: '', city: s.trim() };
}

/** Formatuje 26-cyfrowy numer konta jako "34 1234 1234 1234 1234 1234 1234". */
function formatIban(raw: string): string {
	const digits = raw.replace(/\s/g, '');
	const m = digits.match(/^(.{2})(.{4})(.{4})(.{4})(.{4})(.{4})(.{4})$/);
	return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]} ${m[7]}` : raw;
}

export function parseKsefFaXml(xml: string): ParsedKsefInvoice {
	const faBlock    = tagBlock(xml, 'Fa');
	const p1Block    = tagBlock(xml, 'Podmiot1');
	const p2Block    = tagBlock(xml, 'Podmiot2');
	const platnoscBlock = tagBlock(faBlock, 'Platnosc');

	// Sprzedawca
	const s1id  = tagBlock(p1Block, 'DaneIdentyfikacyjne');
	const s1adr = tagBlock(p1Block, 'Adres');
	const { postalCode: sellerPC, city: sellerCity } = parseAdresL2(tagText(s1adr, 'AdresL2'));

	// Nabywca
	const s2id  = tagBlock(p2Block, 'DaneIdentyfikacyjne');
	const s2adr = tagBlock(p2Block, 'Adres');
	const { postalCode: buyerPC, city: buyerCity } = parseAdresL2(tagText(s2adr, 'AdresL2'));

	// Daty
	const issueDate      = tagText(faBlock, 'P_1').slice(0, 10);
	const saleDateRaw    = tagText(faBlock, 'P_6').slice(0, 10);
	const saleDate       = saleDateRaw || issueDate;
	const paymentDueDate = tagText(platnoscBlock, 'Termin').slice(0, 10);

	// Pozycje
	const items = tagBlocks(faBlock, 'FaWiersz').map((block) => {
		const vatRateRaw = tagText(block, 'P_12');
		const vatRate    = P12_TO_VAT_RATE[vatRateRaw] ?? vatRateRaw;
		const netTotal   = parseFloat(tagText(block, 'P_11')) || 0;
		const quantity   = parseFloat(tagText(block, 'P_8B')) || 1;
		const unitPriceNet = parseFloat(tagText(block, 'P_9A')) || (netTotal / quantity);
		const vatRateNum = parseFloat(vatRate);
		const vatTotal   = isNaN(vatRateNum) ? 0 : Math.round(netTotal * vatRateNum) / 100;
		return {
			description: tagText(block, 'P_7'),
			unit: tagText(block, 'P_8A') || 'szt.',
			quantity, unitPriceNet, vatRate,
			netTotal, vatTotal,
			grossTotal: parseFloat((netTotal + vatTotal).toFixed(2)),
		};
	});

	// Sumy
	const netTotal  = parseFloat(items.reduce((s, i) => s + i.netTotal, 0).toFixed(2));
	const vatTotal  = parseFloat(items.reduce((s, i) => s + i.vatTotal, 0).toFixed(2));
	const grossTotal = parseFloat(tagText(faBlock, 'P_15')) || parseFloat((netTotal + vatTotal).toFixed(2));

	// byVatRate
	const byVatRateMap = new Map<string, { net: number; vat: number; gross: number }>();
	for (const item of items) {
		const r = byVatRateMap.get(item.vatRate) ?? { net: 0, vat: 0, gross: 0 };
		r.net   = parseFloat((r.net   + item.netTotal).toFixed(2));
		r.vat   = parseFloat((r.vat   + item.vatTotal).toFixed(2));
		r.gross = parseFloat((r.gross + item.grossTotal).toFixed(2));
		byVatRateMap.set(item.vatRate, r);
	}
	const byVatRate = [...byVatRateMap.entries()].map(([rate, v]) => ({ rate, ...v }));

	return {
		number: tagText(faBlock, 'P_2'),
		issueDate, saleDate, paymentDueDate,
		placeOfIssue: tagText(faBlock, 'MiejsceWystawienia'),
		paymentMethod: FORMA_PLATNOSCI[tagText(platnoscBlock, 'FormaPlatnosci')] ?? 'transfer',
		bankAccount: formatIban(tagText(platnoscBlock, 'NrRB')),
		seller: {
			nip:        tagText(s1id, 'NIP'),
			name:       tagText(s1id, 'Nazwa') || tagText(s1id, 'PelnaNazwa'),
			address:    tagText(s1adr, 'AdresL1'),
			city:       sellerCity,
			postalCode: sellerPC,
		},
		buyer: {
			nip:        tagText(s2id, 'NIP'),
			name:       tagText(s2id, 'Nazwa') || tagText(s2id, 'PelnaNazwa'),
			address:    tagText(s2adr, 'AdresL1'),
			city:       buyerCity,
			postalCode: buyerPC,
			country:    tagText(s2adr, 'KodKraju') || 'PL',
		},
		items,
		summary: { netTotal, vatTotal, grossTotal, byVatRate },
	};
}

