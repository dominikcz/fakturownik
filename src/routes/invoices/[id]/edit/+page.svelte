<script lang="ts">
	import InvoiceForm from '$lib/components/InvoiceForm.svelte';
	import { showError } from '$lib/toast.js';
	import type { PageData } from './$types.js';
	import { goto } from '$app/navigation';
	import type { Invoice } from '$lib/types.js';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let errorMsg = $state('');

	async function handleSave(invoiceData: Partial<Invoice>) {
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/invoices/${data.invoice.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invoiceData)
			});
			if (!res.ok) {
				const err = await res.json();
				errorMsg = err.error ?? 'Błąd zapisu';
				showError(errorMsg);
				return;
			}
			await goto(`/invoices/${data.invoice.id}`);
		} catch {
			errorMsg = 'Błąd połączenia z serwerem';
			showError(errorMsg);
		} finally {
			saving = false;
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/invoices">Faktury</a>
			<span class="mdi mdi-chevron-right"></span>
			<a href="/invoices/{data.invoice.id}">{data.invoice.number}</a>
			<span class="mdi mdi-chevron-right"></span>
			<span>Edycja</span>
		</div>
		<h1 class="page-title">Edycja faktury {data.invoice.number}</h1>
	</div>

	<InvoiceForm
		invoice={data.invoice}
		settings={data.settings}
		clients={data.clients}
		cancelHref="/invoices/{data.invoice.id}"
		onSave={handleSave}
		onError={(msg) => { errorMsg = msg; showError(msg); }}
		error={errorMsg}
		saving={saving}
	/>
</div>

<style>
	.page {
		max-width: 1100px;
	}
	.page-header {
		margin-bottom: 24px;
	}
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.85rem;
		color: #64748b;
		margin-bottom: 8px;
	}
	.breadcrumb a {
		color: #2563eb;
	}
	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}
</style>
