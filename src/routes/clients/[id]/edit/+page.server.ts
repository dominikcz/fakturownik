import { getClients } from '$lib/server/data.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const clients = getClients();
	const client = clients.find((c) => c.id === params.id);
	if (!client) error(404, 'Nie znaleziono kontrahenta');
	return { client };
};
