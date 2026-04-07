import { getSettings } from '$lib/server/data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const settings = getSettings();
	const hasKsefConfig = !!(
		(settings.ksef.certs?.[settings.ksef.environment]?.certPem ||
			settings.ksef.certPem ||
			settings.ksef.certPath) &&
		(settings.ksef.nip || settings.seller.nip)
	);
	return { hasKsefConfig, ksefEnv: settings.ksef.environment };
};
