<script lang="ts">
	import type { PageData } from './$types.js';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		draft: 'Szkic',
		issued: 'Wystawiona',
		sent_to_ksef: 'Wysłana',
		ksef_pending_upo: 'Oczekuje na UPO',
		ksef_accepted: 'KSeF OK',
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

	let searchQuery = $state('');
	let deletingId = $state<string | null>(null);

	const filteredInvoices = $derived(
		data.invoices.filter(
			(inv) =>
				!searchQuery ||
				inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
				inv.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function formatAmount(amount: number): string {
		return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2 }).format(amount);
	}

	async function deleteInvoice(id: string, number: string) {
		if (!confirm(`Czy na pewno chcesz usunąć fakturę ${number}? Tej operacji nie można cofnąć.`)) return;
		deletingId = id;
		try {
			const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				alert(body.error ?? 'Błąd podczas usuwania faktury.');
			} else {
				await invalidateAll();
			}
		} finally {
			deletingId = null;
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Faktury</h1>
		<div class="header-actions">
			<a href="/invoices/ksef-import" class="btn btn-secondary">
				<span class="mdi mdi-cloud-download-outline"></span> Import z KSeF
			</a>
			<a href="/invoices/new" class="btn btn-primary">
				<span class="mdi mdi-plus"></span> Nowa faktura
			</a>
		</div>
	</div>

	<div class="toolbar">
		<div class="search-box">
			<span class="mdi mdi-magnify"></span>
			<input type="text" placeholder="Szukaj po numerze lub nabywcy..." bind:value={searchQuery} />
		</div>
	</div>

	{#if filteredInvoices.length === 0}
		<div class="empty-state">
			<span class="mdi mdi-file-document-outline empty-icon"></span>
			{#if data.invoices.length === 0}
				<p>Brak faktur. <a href="/invoices/new">Wystaw pierwszą fakturę</a>.</p>
			{:else}
				<p>Brak wyników dla podanego wyszukiwania.</p>
			{/if}
		</div>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>Numer</th>
						<th>Data wystawienia</th>
						<th>Nabywca</th>
						<th>Netto</th>
						<th>Brutto</th>
						<th>Status</th>
						<th>Akcje</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredInvoices as invoice}
						<tr>
							<td><a href="/invoices/{invoice.id}">{invoice.number}</a></td>
							<td>{invoice.issueDate}</td>
							<td>{invoice.buyer?.name ?? '—'}</td>
							<td class="amount">{formatAmount(invoice.summary.netTotal)} zł</td>
							<td class="amount">{formatAmount(invoice.summary.grossTotal)} zł</td>
							<td>
								<span
									class="badge"
									style="background: {statusColors[invoice.status] ?? '#6b7280'}20; color: {statusColors[invoice.status] ?? '#6b7280'}"
								>
									{statusLabels[invoice.status] ?? invoice.status}
								</span>
							</td>
							<td class="actions">
								<a href="/invoices/{invoice.id}" class="icon-btn" title="Podgląd">
									<span class="mdi mdi-eye"></span>
								</a>
								<a href="/invoices/{invoice.id}/edit" class="icon-btn" title="Edytuj">
									<span class="mdi mdi-pencil"></span>
								</a>
							<a href="/api/invoices/{invoice.id}/pdf" target="_blank" class="text-btn" title="Pobierz PDF">PDF</a>
							<a href="/api/invoices/{invoice.id}/xml" class="text-btn" title="Pobierz XML (FA3)">XML</a>
							<button
								class="icon-btn icon-btn-danger"
								title="Usuń fakturę"
								onclick={() => deleteInvoice(invoice.id, invoice.number)}
								disabled={deletingId === invoice.id}
							>
								{#if deletingId === invoice.id}
									<span class="mdi mdi-loading mdi-spin"></span>
								{:else}
									<span class="mdi mdi-delete-outline"></span>
								{/if}
							</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 1100px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.toolbar {
		margin-bottom: 16px;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 8px 12px;
		max-width: 360px;
	}

	.search-box .mdi {
		color: #94a3b8;
	}

	.search-box input {
		border: none;
		outline: none;
		flex: 1;
		font-size: 0.9rem;
		color: #374151;
		background: transparent;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		text-decoration: none;
		transition: background 0.15s;
	}

	.btn-primary {
		background: #2563eb;
		color: #fff;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	.btn-secondary {
		background: #f1f5f9;
		color: #374151;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover {
		background: #e2e8f0;
	}

	.table-wrap {
		background: #fff;
		border-radius: 10px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.table th {
		text-align: left;
		padding: 12px 16px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
	}

	.table td {
		padding: 12px 16px;
		border-bottom: 1px solid #f1f5f9;
		color: #374151;
	}

	.table tr:last-child td {
		border-bottom: none;
	}

	.table td a {
		color: #2563eb;
		font-weight: 500;
	}

	.table td a.text-btn {
		color: #2563eb;
		font-weight: 700;
	}

	.amount {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.actions {
		display: flex;
		gap: 4px;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 5px;
		color: #64748b;
		background: transparent;
		transition: background 0.15s, color 0.15s;
		font-size: 1.2rem;
	}

	.icon-btn:hover {
		background: #f1f5f9;
		color: #2563eb;
	}

	.icon-btn-danger:hover {
		background: #fee2e2;
		color: #dc2626;
	}



	.text-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 30px;
		padding: 0 6px;
		border-radius: 5px;
		color: #64748b;
		background: transparent;
		font-size: 0.78rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.15s, color 0.15s;
	}
	.text-btn:hover {
		background: #f1f5f9;
		color: #2563eb;
	}

	.empty-state {
		text-align: center;
		padding: 48px 24px;
		background: #fff;
		border-radius: 10px;
		color: #64748b;
	}

	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 12px;
		opacity: 0.4;
	}

	.empty-state a {
		color: #2563eb;
	}
</style>
