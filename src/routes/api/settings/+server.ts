import { json } from '@sveltejs/kit';
import { getSettings, saveSettings } from '$lib/server/data.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => {
	try {
		const settings = getSettings();
		return json(settings);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const current = getSettings();
		const updated = { ...current, ...body };
		// certPem/keyPem zarządzane wyłącznie przez /api/settings/ksef-certs
		updated.ksef.certPem = current.ksef.certPem;
		updated.ksef.keyPem = current.ksef.keyPem;
		saveSettings(updated);
		return json(updated);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
