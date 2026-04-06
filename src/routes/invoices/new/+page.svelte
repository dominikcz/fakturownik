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
			const res = await fetch('/api/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invoiceData)
			});
			if (!res.ok) {
				const err = await res.json();
				errorMsg = err.error ?? 'Błąd zapisu faktury';
				showError(errorMsg);
				return;
			}
			const invoice = await res.json();
			await goto(`/invoices/${invoice.id}`);
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
			<span>Nowa faktura</span>
		</div>
		<h1 class="page-title">Nowa faktura</h1>
	</div>

	<InvoiceForm
		invoice={data.baseInvoice}
		settings={data.settings}
		clients={data.clients}
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
		color: #1e293b;
	}
</style>
