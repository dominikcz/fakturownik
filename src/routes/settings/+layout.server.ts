import { getSettings } from '$lib/server/data.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = () => {
	return { settings: getSettings() };
};
