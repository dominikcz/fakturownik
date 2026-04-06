import { json } from '@sveltejs/kit';
import { getSettings, saveSettings, DATA_DIR } from '$lib/server/data.js';
import fs from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('logo');
		if (!file || typeof file === 'string') {
			return json({ error: 'Brak pliku logo' }, { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
		const allowedExt = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'];
		if (!allowedExt.includes(ext)) {
			return json({ error: 'Niedozwolony format pliku' }, { status: 400 });
		}

		const logoPath = path.join(DATA_DIR, `logo.${ext}`);

		// Usuń stare pliki logo
		for (const e of allowedExt) {
			const p = path.join(DATA_DIR, `logo.${e}`);
			if (fs.existsSync(p)) fs.unlinkSync(p);
		}

		fs.writeFileSync(logoPath, Buffer.from(arrayBuffer));

		// Zapisz base64 w settings
		const base64 = Buffer.from(arrayBuffer).toString('base64');
		const dataUrl = `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${base64}`;

		const settings = getSettings();
		settings.seller.logo = dataUrl;
		saveSettings(settings);

		return json({ logo: dataUrl });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
