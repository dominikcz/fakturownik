<script lang="ts">
	import type { Invoice, Settings } from '$lib/types.js';
	import { getTemplateConfig } from '$lib/invoiceTemplates.js';
	import { untrack } from 'svelte';
	import InvoiceClassic from './templates/InvoiceClassic.svelte';
	import InvoiceModern from './templates/InvoiceModern.svelte';
	import InvoiceElegant from './templates/InvoiceElegant.svelte';

	interface Props {
		invoice: Invoice & { id?: string };
		settings: Settings;
		qrDataUrlOverride?: string;
		ksefVerificationUrlOverride?: string;
	}

	let { invoice, settings, qrDataUrlOverride, ksefVerificationUrlOverride }: Props = $props();

	const tpl = $derived(getTemplateConfig(settings.invoiceTemplate));

	let qrDataUrl = $state(untrack(() => qrDataUrlOverride ?? ''));
	let ksefVerificationUrl = $state(untrack(() => ksefVerificationUrlOverride ?? ''));

	$effect(() => {
		if (!qrDataUrlOverride && invoice.id) {
			fetch(`/api/invoices/${invoice.id}/qr`)
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => {
					if (data?.dataUrl) qrDataUrl = data.dataUrl;
					if (data?.verificationUrl) ksefVerificationUrl = data.verificationUrl;
				})
				.catch(() => {});
		}
	});
</script>

{#if tpl.layout === 'modern'}
	<InvoiceModern {invoice} {settings} {tpl} {qrDataUrl} {ksefVerificationUrl} />
{:else if tpl.layout === 'elegant'}
	<InvoiceElegant {invoice} {settings} {tpl} {qrDataUrl} {ksefVerificationUrl} />
{:else}
	<InvoiceClassic {invoice} {settings} {tpl} {qrDataUrl} {ksefVerificationUrl} />
{/if}
