<script lang="ts">
	import InvoicePreview from '$lib/components/InvoicePreview.svelte';
	import { showError, showSuccess } from '$lib/toast.js';
	import { untrack } from 'svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		draft: 'Szkic',
		issued: 'Wystawiona',
		sent_to_ksef: 'Wysłana do KSeF',
		ksef_pending_upo: 'Oczekuje na UPO',
		ksef_accepted: 'Przyjęta przez KSeF',
		ksef_error: 'Błąd KSeF'
	};

	const statusColors: Record<string, string> = {
		draft: '#6b7280',
		issued: '#2563eb',
		sent_to_ksef: '#d97706',
		ksef_pending_upo: '#7c3aed',
		ksef_accepted: '#059669',
		ksef_error: '#dc2626'
	};

	let ksefLoading = $state(false);
	let ksefValidationErrors = $state<{ code: string; message: string; element?: string }[]>([]);
	let upoLoading = $state(false);
	let invoice = $state(untrack(() => ({ ...data.invoice })));

	async function sendToKsef() {
		if (!confirm('Czy na pewno chcesz wysłać fakturę do KSeF?')) return;
		ksefLoading = true;
		ksefValidationErrors = [];
		try {
			const res = await fetch(`/api/invoices/${invoice.id}/send-to-ksef`, { method: 'POST' });
			const body = await res.json();
			if (!res.ok) {
				if (body.validationErrors?.length) {
					ksefValidationErrors = body.validationErrors;
					showError(`Walidacja XML nie powiodła się (${body.validationErrors.length} błędów)`);
				} else {
					showError(body.error ?? 'Błąd wysyłki do KSeF');
				}
			} else {
				showSuccess('Faktura wysłana do KSeF. Kliknij „Pobierz UPO" aby pobrać potwierdzenie odbioru.');
				invoice.status = 'ksef_pending_upo';
				invoice.ksefSessionRef = body.sessionRef;
			}
		} catch {
			showError('Błąd połączenia z serwerem');
		} finally {
			ksefLoading = false;
		}
	}

	async function fetchUpo() {
		upoLoading = true;
		try {
			const res = await fetch(`/api/invoices/${invoice.id}/fetch-upo`, { method: 'POST' });
			const body = await res.json();
			if (!res.ok) {
				if (body.ksefErrors?.length) {
					ksefValidationErrors = body.ksefErrors.map((e: { description: string; details?: string[] }) => ({
						code: 'SEMANTIC',
						message: e.description,
						element: e.details?.join('; ')
					}));
					showError(`KSeF odrzucił fakturę (${body.ksefErrors.length} ${body.ksefErrors.length === 1 ? 'błąd' : 'błędów'})`);
					invoice.status = 'ksef_error';
				} else {
					showError(body.error ?? 'Błąd pobierania UPO');
				}
			} else {
				showSuccess(`UPO pobrane! Numer KSeF: ${body.ksefNumber}`);
				invoice.status = 'ksef_accepted';
				invoice.ksefNumber = body.ksefNumber;
			}
		} catch {
			showError('Błąd połączenia z serwerem');
		} finally {
			upoLoading = false;
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
				{#if data.ksefVerificationUrl}
					<a
						href={data.ksefVerificationUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="ksef-verify-link"
					>
						<span class="mdi mdi-check-decagram"></span> Zweryfikuj w KSeF
					</a>
				{/if}
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
				<button class="btn btn-ghost" onclick={() => window.print()} title="Drukuj">
					<span class="mdi mdi-printer-outline"></span> Drukuj
				</button>
				<a
					href="/api/invoices/{invoice.id}/pdf"
					target="_blank"
					class="btn btn-ghost"
					title="Pobierz PDF"
				>
					<span class="mdi mdi-file-download-outline"></span> PDF
				</a>
				<a
					href="/api/invoices/{invoice.id}/xml"
					class="btn btn-ghost"
					title="Pobierz XML FA(3)"
				>
					<span class="mdi mdi-code-tags"></span> XML
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
				{#if invoice.status === 'ksef_pending_upo'}
					<button
						class="btn btn-primary"
						onclick={fetchUpo}
						disabled={upoLoading}
					>
						{#if upoLoading}
							<span class="mdi mdi-loading spin"></span>
						{:else}
							<span class="mdi mdi-file-check"></span>
						{/if}
						Pobierz UPO
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if ksefValidationErrors.length > 0}
		<div class="validation-errors">
			<div class="validation-errors-title">
				<span class="mdi mdi-alert-circle"></span>
				Walidacja XML nie powiodła się ({ksefValidationErrors.length} {ksefValidationErrors.length === 1 ? 'błąd' : 'błędy/ów'}):
			</div>
			<ul class="validation-errors-list">
				{#each ksefValidationErrors as issue}
					<li>
						<span class="issue-code">{issue.code}</span>
						<span class="issue-msg">{issue.message}</span>
						{#if issue.element}<span class="issue-el">&lt;{issue.element}&gt;</span>{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#if invoice.status === 'ksef_error' && invoice.ksefErrorMessage}
		<div class="alert alert-error">Ostatni błąd KSeF: {invoice.ksefErrorMessage}</div>
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

	.ksef-verify-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 6px;
		font-size: 0.8rem;
		color: #059669;
		text-decoration: none;
	}

	.ksef-verify-link:hover {
		text-decoration: underline;
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

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.spin { animation: spin 0.8s linear infinite; }

	.validation-errors {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		padding: 12px 16px;
		margin-bottom: 16px;
	}
	.validation-errors-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		font-size: 0.9rem;
		color: #dc2626;
		margin-bottom: 10px;
	}
	.validation-errors-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.validation-errors-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
		font-size: 0.85rem;
		color: #7f1d1d;
	}
	.issue-code {
		font-family: monospace;
		background: #fee2e2;
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 0.78rem;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.issue-el {
		font-family: monospace;
		color: #b91c1c;
		font-size: 0.78rem;
	}

	@media print {
		:global(.sidebar) { display: none !important; }
		:global(.main-content) { padding: 0 !important; }
		.page-header { display: none !important; }
		.validation-errors { display: none !important; }
	}
</style>
