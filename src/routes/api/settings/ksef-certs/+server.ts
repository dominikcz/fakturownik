import { json } from '@sveltejs/kit';
import { createPrivateKey } from 'node:crypto';
import { getSettings, saveSettings } from '$lib/server/data.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Nieprawidłowe dane formularza' }, { status: 400 });
	}

	const certFile = formData.get('cert');
	const keyFile = formData.get('key');
	const password = formData.get('password');

	if (!certFile || !(certFile instanceof File)) {
		return json({ error: 'Brak pliku certyfikatu' }, { status: 400 });
	}
	if (!keyFile || !(keyFile instanceof File)) {
		return json({ error: 'Brak pliku klucza' }, { status: 400 });
	}

	const certPem = await certFile.text();
	const keyRaw = await keyFile.text();

	// Weryfikacja podstawowa zawartości pliku certyfikatu
	if (!certPem.includes('-----BEGIN CERTIFICATE-----') && !certPem.includes('-----BEGIN')) {
		return json({ error: 'Plik certyfikatu nie wygląda na prawidłowy PEM' }, { status: 400 });
	}

	let keyPem: string;

	const passphrase = typeof password === 'string' && password.trim() ? password.trim() : undefined;

	if (passphrase) {
		// Odszyfrowanie klucza za pomocą hasła
		try {
			const keyObject = createPrivateKey({
				key: keyRaw,
				format: 'pem',
				passphrase
			});
			keyPem = keyObject.export({ type: 'pkcs8', format: 'pem' }) as string;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return json(
				{ error: `Nie udało się odszyfrować klucza. Sprawdź hasło. (${msg})` },
				{ status: 400 }
			);
		}
	} else {
		// Klucz nie jest zaszyfrowany – walidacja że jest prawidłowy PEM
		try {
			createPrivateKey({ key: keyRaw, format: 'pem' });
			keyPem = keyRaw;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return json(
				{ error: `Plik klucza nie jest prawidłowym PEM lub jest zaszyfrowany (podaj hasło). (${msg})` },
				{ status: 400 }
			);
		}
	}

	const settings = await getSettings();
	settings.ksef.certPem = certPem;
	settings.ksef.keyPem = keyPem;
	await saveSettings(settings);

	return json({ ok: true });
};

export const DELETE: RequestHandler = async () => {
	const settings = await getSettings();
	delete settings.ksef.certPem;
	delete settings.ksef.keyPem;
	await saveSettings(settings);
	return json({ ok: true });
};
