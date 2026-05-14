<script lang="ts">
	import InvoiceForm from '$lib/components/InvoiceForm.svelte';
	import { showError, showSuccess } from '$lib/toast.js';
	import type { PageData } from './$types.js';
	import { goto } from '$app/navigation';
	import type { Invoice, InvoiceCategory } from '$lib/types.js';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let errorMsg = $state('');

	const ksefLocked = $derived(
		!!data.invoice.ksefNumber ||
		data.invoice.status === 'sent_to_ksef' ||
		data.invoice.status === 'ksef_pending_upo' ||
		data.invoice.status === 'ksef_accepted'
	);

	// Pola tylko dla trybu ograniczonego (KSeF-locked)
	let restrictedCategoryId = $state(data.invoice.categoryId ?? '');

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

	async function saveRestricted() {
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/invoices/${data.invoice.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ categoryId: restrictedCategoryId || undefined })
			});
			if (!res.ok) {
				const err = await res.json();
				errorMsg = err.error ?? 'Błąd zapisu';
				showError(errorMsg);
				return;
			}
			showSuccess('Zapisano zmiany.');
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

	{#if ksefLocked}
		<div class="ksef-lock-notice">
			<span class="mdi mdi-lock-outline"></span>
			<div>
				<strong>Faktura została wysłana do KSeF</strong> – nie można edytować jej treści.
				Możesz zmienić tylko kategorię.
			</div>
		</div>

		{#if errorMsg}
			<div class="alert-error">{errorMsg}</div>
		{/if}

		<div class="restricted-form">
			{#if data.categories.length > 0}
				<div class="form-group">
					<label for="restrictedCategory">Kategoria</label>
					<select id="restrictedCategory" class="inp" bind:value={restrictedCategoryId}>
						<option value="">— brak kategorii —</option>
						{#each data.categories as cat}
							<option value={cat.id}>{cat.symbol} {cat.name}</option>
						{/each}
					</select>
				</div>
			{:else}
				<p class="muted">Brak zdefiniowanych kategorii. <a href="/settings/categories">Dodaj kategorie →</a></p>
			{/if}

			<div class="form-actions">
				<button class="btn btn-primary" onclick={saveRestricted} disabled={saving}>
					{saving ? 'Zapis...' : 'Zapisz'}
				</button>
				<a href="/invoices/{data.invoice.id}" class="btn btn-secondary">Anuluj</a>
			</div>
		</div>
	{:else}
		<InvoiceForm
			invoice={data.invoice}
			settings={data.settings}
			clients={data.clients}
			categories={data.categories}
			cancelHref="/invoices/{data.invoice.id}"
			onSave={handleSave}
			onError={(msg) => { errorMsg = msg; showError(msg); }}
			error={errorMsg}
			saving={saving}
		/>
	{/if}
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

	.ksef-lock-notice {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		background: #fef9c3;
		border: 1px solid #fde047;
		border-radius: 8px;
		padding: 14px 18px;
		margin-bottom: 24px;
		color: #713f12;
		font-size: 0.9rem;
	}
	.ksef-lock-notice .mdi {
		font-size: 1.3rem;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.restricted-form {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 24px;
		max-width: 420px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 20px;
	}
	.form-group label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #64748b;
	}
	.inp {
		padding: 8px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		font-family: inherit;
		color: #111827;
		background: #fff;
	}
	.inp:focus { outline: 2px solid #2563eb; border-color: transparent; }

	.form-actions {
		display: flex;
		gap: 8px;
	}

	.alert-error {
		background: #fee2e2;
		color: #dc2626;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 0.875rem;
		margin-bottom: 16px;
	}

	.muted { font-size: 0.9rem; color: #6b7280; margin-bottom: 20px; }
	.muted a { color: #2563eb; }

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		border: none;
		text-decoration: none;
		transition: background 0.15s;
	}
	.btn:disabled { opacity: 0.6; cursor: not-allowed; }
	.btn-primary { background: #2563eb; color: #fff; }
	.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
	.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
	.btn-secondary:hover { background: #e2e8f0; }
</style>

