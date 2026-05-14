import { getCategories } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	return { categories: getCategories() };
};
