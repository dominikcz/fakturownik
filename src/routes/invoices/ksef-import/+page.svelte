<script lang="ts">
	import type { PageData } from './$types.js';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	interface KsefMeta {
		ksefReferenceNumber: string;
		invoiceNumber: string;
		invoicingDate: string;
		net: number;
		vat: number;
		gross: number;
		sellerName: string;
		sellerNip: string;
		buyerName: string;
		buyerNip: string;
	}

	const today = new Date().toISOString().slice(0, 10);
	const firstOfMonth = today.slice(0, 8) + '01';

	let dateFrom = $state(firstOfMonth);
	let dateTo = $state(today);
	let loading = $state(false);
	let importing = $state(false);
	let error = $state('');
	let results = $state<KsefMeta[]>([]);
	let selected = $state<Set<string>>(new Set());
	let importDone = $state<{ imported: number; skipped: number } | null>(null);

	function toggleAll() {
		if (selected.size === results.length) {
			selected = new Set();
		} else {
			selected = new Set(results.map((r) => r.ksefReferenceNumber));
		}
	}

	function toggleOne(ref: string) {
		const next = new Set(selected);
		if (next.has(ref)) next.delete(ref);
		else next.add(ref);
		selected = next;
	}

	async function fetchList() {
		if (!dateFrom || !dateTo) return;
		loading = true;
		error = '';
		results = [];
		selected = new Set();
		importDone = null;
		try {
			const res = await fetch(
				`/api/invoices/ksef-import?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
			);
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Błąd pobierania listy z KSeF.';
			} else {
				results = body.invoices ?? [];
				if (results.length === 0) error = 'Brak faktur w podanym zakresie dat w KSeF.';
			}
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	}

	async function importSelected() {
		if (selected.size === 0) return;
		importing = true;
		error = '';
		importDone = null;
		try {
			const items = results.filter((r) => selected.has(r.ksefReferenceNumber));
			const res = await fetch('/api/invoices/ksef-import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items })
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Błąd importu.';
			} else {
				importDone = { imported: body.imported, skipped: body.skipped };
				selected = new Set();
				results = results.filter((r) => !items.some((i) => i.ksefReferenceNumber === r.ksefReferenceNumber));
			}
		} catch (e) {
			error = String(e);
		} finally {
			importing = false;
		}
	}

	function formatAmount(n: number): string {
		return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2 }).format(n);
	}
</script>

<div class="page">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/invoices" class="breadcrumb-link">Faktury</a>
			<span class="mdi mdi-chevron-right breadcrumb-sep"></span>
			<span>Import z KSeF</span>
		</div>
		<h1 class="page-title">Import faktur sprzedażowych z KSeF</h1>
	</div>

	{#if !data.hasKsefConfig}
		<div class="alert alert-warn">
			<span class="mdi mdi-alert-outline"></span>
			Brak konfiguracji KSeF. Przejdź do
			<a href="/settings/ksef">ustawień KSeF</a>, aby wgrać certyfikat i podać NIP.
		</div>
	{:else}
		<div class="env-badge env-{data.ksefEnv.toLowerCase()}">
			Środowisko: {data.ksefEnv}
		</div>

		<div class="filter-card">
			<div class="filter-row">
				<div class="field">
					<label for="dateFrom">Data od</label>
					<input id="dateFrom" type="date" bind:value={dateFrom} max={dateTo} />
				</div>
				<div class="field">
					<label for="dateTo">Data do</label>
					<input id="dateTo" type="date" bind:value={dateTo} min={dateFrom} max={today} />
				</div>
				<button class="btn btn-primary" onclick={fetchList} disabled={loading || !dateFrom || !dateTo}>
					{#if loading}
						<span class="mdi mdi-loading mdi-spin"></span> Pobieranie...
					{:else}
						<span class="mdi mdi-magnify"></span> Pobierz listę z KSeF
					{/if}
				</button>
			</div>
		</div>

		{#if error}
			<div class="alert alert-error">
				<span class="mdi mdi-alert-circle-outline"></span>
				{error}
			</div>
		{/if}

		{#if importDone}
			<div class="alert alert-success">
				<span class="mdi mdi-check-circle-outline"></span>
				Zaimportowano {importDone.imported} {importDone.imported === 1 ? 'fakturę' : 'faktur'}.
				{#if importDone.skipped > 0}
					Pominięto {importDone.skipped} (już istniały w systemie).
				{/if}
				<a href="/invoices">Przejdź do listy faktur</a>.
			</div>
		{/if}

		{#if results.length > 0}
			<div class="results-header">
				<span class="results-count">Znaleziono {results.length} faktur</span>
				<div class="results-actions">
					<button class="btn btn-ghost" onclick={toggleAll}>
						{selected.size === results.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
					</button>
					<button
						class="btn btn-primary"
						onclick={importSelected}
						disabled={selected.size === 0 || importing}
					>
						{#if importing}
							<span class="mdi mdi-loading mdi-spin"></span> Importowanie...
						{:else}
							<span class="mdi mdi-cloud-download-outline"></span>
							Importuj zaznaczone ({selected.size})
						{/if}
					</button>
				</div>
			</div>

			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th class="th-check"></th>
							<th>Nr KSeF</th>
							<th>Nr faktury</th>
							<th>Data</th>
							<th>Nabywca</th>
							<th class="amount">Netto</th>
							<th class="amount">VAT</th>
							<th class="amount">Brutto</th>
						</tr>
					</thead>
					<tbody>
						{#each results as item}
							<tr
								class:selected={selected.has(item.ksefReferenceNumber)}
								onclick={() => toggleOne(item.ksefReferenceNumber)}
							>
								<td class="td-check">
									<input
										type="checkbox"
										checked={selected.has(item.ksefReferenceNumber)}
										onchange={() => toggleOne(item.ksefReferenceNumber)}
										onclick={(e) => e.stopPropagation()}
									/>
								</td>
								<td class="ksef-ref">{item.ksefReferenceNumber}</td>
								<td>{item.invoiceNumber}</td>
								<td>{item.invoicingDate}</td>
								<td>
									<div>{item.buyerName || '—'}</div>
									{#if item.buyerNip}
										<div class="sub-nip">NIP: {item.buyerNip}</div>
									{/if}
								</td>
								<td class="amount">{formatAmount(item.net)} zł</td>
								<td class="amount">{formatAmount(item.vat)} zł</td>
								<td class="amount bold">{formatAmount(item.gross)} zł</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 1100px;
	}

	.page-header {
		margin-bottom: 20px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.82rem;
		color: #64748b;
		margin-bottom: 6px;
	}

	.breadcrumb-link {
		color: #2563eb;
		text-decoration: none;
	}

	.breadcrumb-link:hover { text-decoration: underline; }

	.breadcrumb-sep {
		font-size: 0.9rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.env-badge {
		display: inline-block;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		margin-bottom: 16px;
	}

	.env-test  { background: #fef3c7; color: #92400e; }
	.env-demo  { background: #dbeafe; color: #1e40af; }
	.env-prd   { background: #dcfce7; color: #166534; }

	.filter-card {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.filter-row {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #64748b;
	}

	.field input {
		padding: 8px 10px;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		font-size: 0.9rem;
		color: #374151;
		background: #fff;
	}

	.field input:focus {
		outline: none;
		border-color: #2563eb;
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
		cursor: pointer;
		transition: background 0.15s;
		text-decoration: none;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #2563eb;
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-ghost {
		background: transparent;
		color: #374151;
		border: 1px solid #e2e8f0;
	}

	.btn-ghost:hover:not(:disabled) {
		background: #f1f5f9;
	}

	.alert {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.9rem;
		margin-bottom: 16px;
	}

	.alert .mdi { flex-shrink: 0; font-size: 1.1rem; margin-top: 1px; }

	.alert a { color: inherit; font-weight: 600; }

	.alert-warn    { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
	.alert-error   { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
	.alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.results-count {
		font-size: 0.88rem;
		color: #64748b;
	}

	.results-actions {
		display: flex;
		gap: 8px;
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
		font-size: 0.88rem;
	}

	.table th {
		text-align: left;
		padding: 10px 14px;
		font-size: 0.72rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
	}

	.th-check { width: 36px; }

	.table td {
		padding: 10px 14px;
		border-bottom: 1px solid #f1f5f9;
		color: #374151;
		cursor: pointer;
	}

	.table tr:last-child td { border-bottom: none; }

	.table tr:hover td { background: #f8fafc; }

	.table tr.selected td { background: #eff6ff; }

	.td-check { text-align: center; }

	.ksef-ref {
		font-family: monospace;
		font-size: 0.78rem;
		color: #64748b;
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.amount {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.bold { font-weight: 600; }

	.sub-nip {
		font-size: 0.75rem;
		color: #94a3b8;
		margin-top: 1px;
	}
</style>
