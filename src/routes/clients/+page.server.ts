import { getClients } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { clients: getClients() };
};
