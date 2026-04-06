import { json } from '@sveltejs/kit';
import { getClients, saveClients } from '$lib/server/data.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = ({ params }) => {
	try {
		const clients = getClients();
		const client = clients.find((c) => c.id === params.id);
		if (!client) return json({ error: 'Nie znaleziono kontrahenta' }, { status: 404 });
		return json(client);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const clients = getClients();
		const idx = clients.findIndex((c) => c.id === params.id);
		if (idx === -1) return json({ error: 'Nie znaleziono kontrahenta' }, { status: 404 });
		clients[idx] = { ...clients[idx], ...body, id: params.id };
		saveClients(clients);
		return json(clients[idx]);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const DELETE: RequestHandler = ({ params }) => {
	try {
		const clients = getClients();
		const idx = clients.findIndex((c) => c.id === params.id);
		if (idx === -1) return json({ error: 'Nie znaleziono kontrahenta' }, { status: 404 });
		clients.splice(idx, 1);
		saveClients(clients);
		return new Response(null, { status: 204 });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
