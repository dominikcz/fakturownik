import { json } from '@sveltejs/kit';
import { getClients, saveClients } from '$lib/server/data.js';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => {
	try {
		const clients = getClients();
		return json(clients);
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const clients = getClients();
		const newClient = {
			id: uuidv4(),
			country: 'PL',
			...body
		};
		clients.push(newClient);
		saveClients(clients);
		return json(newClient, { status: 201 });
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
};
