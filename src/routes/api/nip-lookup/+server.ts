import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import type { NipLookupResult, NipLookupSource } from '$lib/types.js';
import { getSettings } from '$lib/server/data.js';
import Bir from 'bir1';

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

// --- GUS REGON BIR ---------------------------------------------------------

async function lookupViaRegonBir(nip: string, apiKey: string): Promise<Omit<NipLookupResult, 'source'> | null> {
	const bir = new Bir({ key: apiKey });
	const result = await bir.search({ nip });
	if (!result?.Nazwa) return null;

	let address = result.Ulica || result.Miejscowosc || '';
	if (result.NrNieruchomosci) address += ` ${result.NrNieruchomosci}`;
	if (result.NrLokalu) address += `/${result.NrLokalu}`;

	const raw = result.KodPocztowy ?? '';
	const postalCode =
		raw.length === 5 && !raw.includes('-') ? `${raw.slice(0, 2)}-${raw.slice(2)}` : raw;

	return {
		nip,
		name: result.Nazwa,
		address,
		postalCode,
		city: result.Miejscowosc ?? '',
		country: 'PL'
	};
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
