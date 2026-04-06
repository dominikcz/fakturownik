<script lang="ts">
	import InvoicePreview from '$lib/components/InvoicePreview.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		draft: 'Szkic',
		issued: 'Wystawiona',
		sent_to_ksef: 'Wysłana do KSeF',
		ksef_accepted: 'Przyjęta przez KSeF',
		ksef_error: 'Błąd KSeF'
	};

	const statusColors: Record<string, string> = {
		draft: '#6b7280',
		issued: '#2563eb',
		sent_to_ksef: '#d97706',
		ksef_accepted: '#059669',
		ksef_error: '#dc2626'
	};

	let ksefLoading = $state(false);
	let ksefError = $state('');
	let ksefSuccess = $state('');
	let invoice = $state({ ...data.invoice });

	async function sendToKsef() {
		if (!confirm('Czy na pewno chcesz wysłać fakturę do KSeF?')) return;
		ksefLoading = true;
		ksefError = '';
		ksefSuccess = '';
		try {
			const res = await fetch(`/api/invoices/${invoice.id}/send-to-ksef`, { method: 'POST' });
			const body = await res.json();
			if (!res.ok) {
				ksefError = body.error ?? 'Błąd wysyłki do KSeF';
			} else {
				ksefSuccess = `Wysłano! Numer KSeF: ${body.ksefNumber}`;
				invoice.status = 'ksef_accepted';
				invoice.ksefNumber = body.ksefNumber;
			}
		} catch {
			ksefError = 'Błąd połączenia z serwerem';
		} finally {
			ksefLoading = false;
		}
	}
</script>

<div class="page">
	<!-- Toolbar -->
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/invoices">Faktury</a>
			<span class="mdi mdi-chevron-right"></span>
			<span>{invoice.number}</span>
		</div>
		<div class="header-row">
			<div>
				<h1 class="page-title">Faktura {invoice.number}</h1>
				<span
					class="badge"
					style="background: {statusColors[invoice.status] ?? '#6b7280'}20; color: {statusColors[invoice.status] ?? '#6b7280'}"
				>
					{statusLabels[invoice.status] ?? invoice.status}
				</span>
			</div>
			<div class="actions">
				<a href="/invoices/{invoice.id}/edit" class="btn btn-ghost">
					<span class="mdi mdi-pencil"></span> Edytuj
				</a>
				<a
					href="/invoices/new?copyFrom={invoice.id}"
					class="btn btn-ghost"
					title="Wystaw podobną fakturę"
				>
					<span class="mdi mdi-content-copy"></span> Wystaw podobną
				</a>
				<a
					href="/api/invoices/{invoice.id}/pdf"
					target="_blank"
					class="btn btn-ghost"
					title="Pobierz PDF"
				>
					<span class="mdi mdi-file-pdf-box"></span> PDF
				</a>
				{#if invoice.status === 'draft' || invoice.status === 'issued' || invoice.status === 'ksef_error'}
					<button
						class="btn btn-primary"
						onclick={sendToKsef}
						disabled={ksefLoading}
					>
						{#if ksefLoading}
							<span class="mdi mdi-loading spin"></span>
						{:else}
							<span class="mdi mdi-send"></span>
						{/if}
						Wyślij do KSeF
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if ksefError}
		<div class="alert alert-error">{ksefError}</div>
	{/if}
	{#if !ksefError && invoice.status === 'ksef_error' && invoice.ksefErrorMessage}
		<div class="alert alert-error">Ostatni błąd KSeF: {invoice.ksefErrorMessage}</div>
	{/if}
	{#if ksefSuccess}
		<div class="alert alert-success">{ksefSuccess}</div>
	{/if}

	<!-- Podgląd faktury -->
	<InvoicePreview invoice={invoice} settings={data.settings} />
</div>

<style>
	.page {
		max-width: 900px;
	}

	.page-header {
		margin-bottom: 20px;
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

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.page-title {
		font-size: 1.4rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 6px;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.btn-primary {
		background: #2563eb;
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-ghost {
		background: transparent;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-ghost:hover {
		background: #f8fafc;
	}

	.badge {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 9999px;
		font-size: 0.78rem;
		font-weight: 500;
	}

	.alert-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 0.875rem;
		margin-bottom: 16px;
	}

	.alert-success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #059669;
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 0.875rem;
		margin-bottom: 16px;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.spin { animation: spin 0.8s linear infinite; }
</style>
