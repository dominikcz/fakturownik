import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import type { NipLookupResult, NipLookupSource } from '$lib/types.js';
import { getSettings } from '$lib/server/data.js';

// --- helpers ---------------------------------------------------------------

function parseAddress(raw: string): { address: string; postalCode: string; city: string } {
	const postalMatch = raw.match(/(\d{2}-\d{3})\s+(.+)$/);
	if (postalMatch) {
		return {
			postalCode: postalMatch[1],
			city: postalMatch[2].trim(),
			address: raw.replace(/,?\s*\d{2}-\d{3}\s+.+$/, '').trim()
		};
	}
	return { address: raw, postalCode: '', city: '' };
}

/** Wyciąga wartość najprostszego tagu XML (bez atrybutów zagnieżdżonych) */
function xmlTag(xml: string, tag: string): string {
	const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
	return match ? match[1].trim() : '';
}

// --- GUS REGON BIR ---------------------------------------------------------

async function lookupViaRegonBir(nip: string, apiKey: string): Promise<Omit<NipLookupResult, 'source'> | null> {
	const isTestKey = apiKey === 'abcde12345abcde12345';
	const baseUrl = isTestKey
		? 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc'
		: 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';

	// 1. Logowanie → SID
	const loginBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Body>
    <ns:Zaloguj><ns:pKluczUzytkownika>${apiKey}</ns:pKluczUzytkownika></ns:Zaloguj>
  </soap:Body>
</soap:Envelope>`;

	const loginRes = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'text/xml;charset=UTF-8',
			SOAPAction: '"http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj"'
		},
		body: loginBody,
		signal: AbortSignal.timeout(10000)
	});
	if (!loginRes.ok) return null;

	const loginXml = await loginRes.text();
	const sid = xmlTag(loginXml, 'ZalogujResult');
	if (!sid) return null;

	const setCookie = loginRes.headers.get('set-cookie') ?? '';
	const sessionMatch = setCookie.match(/ASP\.NET_SessionId=([^;]+)/);
	const cookie = sessionMatch ? `ASP.NET_SessionId=${sessionMatch[1]}` : '';

	// 2. Wyszukaj po NIP
	const searchBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns="http://CIS/BIR/PUBL/2014/07"
  xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
  <soap:Header>
    <dat:ZalogujResult>${sid}</dat:ZalogujResult>
  </soap:Header>
  <soap:Body>
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <dat:Krs></dat:Krs><dat:Krsy></dat:Krsy>
        <dat:Nip>${nip}</dat:Nip><dat:Nipy></dat:Nipy>
        <dat:Regon></dat:Regon><dat:Regony9zn></dat:Regony9zn><dat:Regony14zn></dat:Regony14zn>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  </soap:Body>
</soap:Envelope>`;

	const searchHeaders: Record<string, string> = {
		'Content-Type': 'text/xml;charset=UTF-8',
		SOAPAction: '"http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty"'
	};
	if (cookie) searchHeaders['Cookie'] = cookie;

	const searchRes = await fetch(baseUrl, {
		method: 'POST',
		headers: searchHeaders,
		body: searchBody,
		signal: AbortSignal.timeout(10000)
	});
	if (!searchRes.ok) return null;

	const searchXml = await searchRes.text();
	const encodedResult = xmlTag(searchXml, 'DaneSzukajPodmiotyResult');
	if (!encodedResult) return null;

	// Wynik jest XML-em zakodowanym jako encje HTML wewnątrz SOAP
	const innerXml = encodedResult
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");

	const nazwa = xmlTag(innerXml, 'Nazwa');
	if (!nazwa) return null;

	const kodPocztowy = xmlTag(innerXml, 'KodPocztowy');
	const miejscowosc = xmlTag(innerXml, 'Miejscowosc');
	const ulica = xmlTag(innerXml, 'Ulica');
	const nrNieruchomosci = xmlTag(innerXml, 'NrNieruchomosci');
	const nrLokalu = xmlTag(innerXml, 'NrLokalu');

	let address = ulica || miejscowosc;
	if (nrNieruchomosci) address += ` ${nrNieruchomosci}`;
	if (nrLokalu) address += `/${nrLokalu}`;

	// Normalizuj kod pocztowy: "12345" → "12-345"
	const postalCode =
		kodPocztowy.length === 5 && !kodPocztowy.includes('-')
			? `${kodPocztowy.slice(0, 2)}-${kodPocztowy.slice(2)}`
			: kodPocztowy;

	return { nip, name: nazwa, address, postalCode, city: miejscowosc, country: 'PL' } as Omit<NipLookupResult, 'source'>;
}

// --- Biala Lista ------------------------------------------------------------

async function lookupViaBialaLista(nip: string): Promise<Omit<NipLookupResult, 'source'> | null> {
	const today = new Date().toISOString().split('T')[0];
	const response = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(8000)
	});
	if (!response.ok) return null;

	const data = await response.json();
	const subject = data?.result?.subject;
	if (!subject) return null;

	// Dla JDG residenceAddress to adres domowy – zawsze preferuj workingAddress
	const rawAddress = subject.workingAddress ?? subject.residenceAddress ?? '';
	const { address, postalCode, city } = parseAddress(rawAddress);
	return { nip: subject.nip ?? nip, name: subject.name ?? '', address, postalCode, city, country: 'PL' };
}

// --- VIES -------------------------------------------------------------------

async function lookupViaVies(nip: string): Promise<Omit<NipLookupResult, 'source'> | null> {
	const response = await fetch(
		`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/PL/vat/${nip}`,
		{ headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
	);
	if (!response.ok) return null;

	const data = await response.json();
	if (!data?.isValid) return null;

	const { address, postalCode, city } = parseAddress(data.address ?? '');
	return { nip, name: data.name ?? '', address, postalCode, city, country: 'PL' } as Omit<NipLookupResult, 'source'>;
}

// --- Handler ----------------------------------------------------------------

export const GET: RequestHandler = async ({ url }) => {
	const nip = url.searchParams.get('nip')?.replace(/\D/g, '');
	if (!nip || nip.length !== 10) {
		return json({ error: 'Nieprawidłowy NIP' }, { status: 400 });
	}

	const settings = await getSettings();
	const order: NipLookupSource[] = settings.nipLookupOrder ?? ['gus', 'biala_lista', 'vies'];

	const lookups: Record<NipLookupSource, () => Promise<Omit<NipLookupResult, 'source'> | null>> = {
		gus: () =>
			settings.regonApiKey
				? lookupViaRegonBir(nip, settings.regonApiKey!)
				: Promise.resolve(null),
		biala_lista: () => lookupViaBialaLista(nip),
		vies: () => lookupViaVies(nip)
	};

	for (const source of order) {
		try {
			const result = await lookups[source]();
			if (result) return json({ ...result, source });
		} catch {
			// próbuj kolejne źródło
		}
	}

	return json({ error: 'Nie znaleziono danych dla podanego NIP' }, { status: 404 });
};
