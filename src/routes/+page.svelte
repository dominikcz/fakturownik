<script lang="ts">
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

	function formatAmount(amount: number): string {
		return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2 }).format(amount);
	}

	const categoryMap = $derived(
		Object.fromEntries(data.categories.map((c) => [c.id, c]))
	);
</script>

<div class="page">
	<h1 class="page-title">Dashboard</h1>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon mdi mdi-file-document-multiple"></div>
			<div class="stat-body">
				<div class="stat-value">{data.stats.total}</div>
				<div class="stat-label">Wszystkich faktur</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon mdi mdi-calendar-month"></div>
			<div class="stat-body">
				<div class="stat-value">{data.stats.thisMonth}</div>
				<div class="stat-label">Faktury tego miesiąca</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon mdi mdi-currency-usd"></div>
			<div class="stat-body">
				<div class="stat-value">{formatAmount(data.stats.totalGross)} zł</div>
				<div class="stat-label">Łączna wartość brutto</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon mdi mdi-pencil-box-outline"></div>
			<div class="stat-body">
				<div class="stat-value">{data.stats.drafts}</div>
				<div class="stat-label">Szkice</div>
			</div>
		</div>
	</div>

	{#if data.categories.length > 0}
		<div class="section-header">
			<h2>Wartość faktur według kategorii</h2>
			<a href="/settings/categories" class="btn btn-ghost btn-sm">Zarządzaj kategoriami →</a>
		</div>
		<div class="category-grid">
			{#each data.categoryStats as cat}
				<div class="category-card" style="border-left: 4px solid {cat.color}">
					<div class="cat-header">
						<span class="cat-symbol" style="background:{cat.color}18; color:{cat.color}">{cat.symbol}</span>
						<span class="cat-name">{cat.name}</span>
						<span class="cat-count">{cat.count} {cat.count === 1 ? 'faktura' : cat.count < 5 ? 'faktury' : 'faktur'}</span>
					</div>
					<div class="cat-amount">{formatAmount(cat.grossTotal)} zł</div>
					<div class="cat-net">netto: {formatAmount(cat.netTotal)} zł</div>
				</div>
			{/each}
			{#if data.uncategorized.count > 0}
				<div class="category-card" style="border-left: 4px solid var(--clr-border-mid)">
					<div class="cat-header">
						<span class="cat-symbol" style="background: var(--clr-surface-raised); color: var(--clr-text-muted)">?</span>
						<span class="cat-name">Bez kategorii</span>
						<span class="cat-count">{data.uncategorized.count} {data.uncategorized.count === 1 ? 'faktura' : data.uncategorized.count < 5 ? 'faktury' : 'faktur'}</span>
					</div>
					<div class="cat-amount">{formatAmount(data.uncategorized.grossTotal)} zł</div>
					<div class="cat-net">netto: {formatAmount(data.uncategorized.netTotal)} zł</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="section-header">
		<h2>Ostatnie faktury</h2>
		<a href="/invoices/new" class="btn btn-primary">
			<span class="mdi mdi-plus"></span> Nowa faktura
		</a>
	</div>

	{#if data.recentInvoices.length === 0}
		<div class="empty-state">
			<span class="mdi mdi-file-document-outline empty-icon"></span>
			<p>Brak faktur. <a href="/invoices/new">Wystaw pierwszą fakturę</a>.</p>
		</div>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>Numer</th>
						<th>Data wystawienia</th>
						<th>Nabywca</th>
						<th>Kwota brutto</th>
						<th>Status</th>
						<th>Akcje</th>
					</tr>
				</thead>
				<tbody>
					{#each data.recentInvoices as invoice}
						<tr>
							<td><a href="/invoices/{invoice.id}">{invoice.number}</a></td>
							<td>{invoice.issueDate}</td>
							<td>{invoice.buyer?.name ?? '—'}</td>
							<td class="amount">{formatAmount(invoice.summary.grossTotal)} zł</td>
							<td>
								<span
									class="badge"
									style="background: {statusColors[invoice.status] ?? '#6b7280'}20; color: {statusColors[invoice.status] ?? '#6b7280'}"
								>
									{statusLabels[invoice.status] ?? invoice.status}
								</span>
								{#if invoice.categoryId && categoryMap[invoice.categoryId]}
									{@const cat = categoryMap[invoice.categoryId]}
									<span class="badge" style="background:{cat.color}18; color:{cat.color}; margin-left:4px">
										{cat.symbol} {cat.name}
									</span>
								{/if}
							</td>
							<td class="actions">
								<a href="/invoices/{invoice.id}" class="btn btn-sm btn-ghost" title="Podgląd">
									<span class="mdi mdi-eye"></span>
								</a>
								<a href="/invoices/new?copyFrom={invoice.id}" class="btn btn-sm btn-ghost" title="Kopiuj fakturę">
									<span class="mdi mdi-content-copy"></span>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="view-all">
			<a href="/invoices">Zobacz wszystkie faktury →</a>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 960px;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 24px;
		color: var(--clr-text-heading);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		margin-bottom: 32px;
	}

	.stat-card {
		background: var(--clr-surface);
		border-radius: 10px;
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		box-shadow: 0 1px 3px var(--clr-shadow);
	}

	.stat-icon {
		font-size: 2rem;
		color: var(--clr-primary);
		opacity: 0.8;
	}

	.stat-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--clr-text-heading);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--clr-text-muted);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.section-header h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--clr-text-heading);
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
		background: var(--clr-primary);
		color: #fff;
	}

	.btn-primary:hover {
		background: var(--clr-primary-hover);
	}

	.btn-sm {
		padding: 4px 10px;
		font-size: 0.8rem;
	}

	.btn-ghost {
		background: transparent;
		color: var(--clr-primary);
	}

	.btn-ghost:hover {
		background: var(--clr-primary-bg);
	}

	.table-wrap {
		background: var(--clr-surface);
		border-radius: 10px;
		overflow: hidden;
		box-shadow: 0 1px 3px var(--clr-shadow);
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
		color: var(--clr-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid var(--clr-border-mid);
		background: var(--clr-surface-raised);
	}

	.table td {
		padding: 12px 16px;
		border-bottom: 1px solid var(--clr-border-subtle);
		color: var(--clr-text-2);
	}

	.table tr:last-child td {
		border-bottom: none;
	}

	.table td a {
		color: var(--clr-link);
		font-weight: 500;
	}

	.amount {
		font-weight: 600;
		text-align: right;
	}

	.badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.empty-state {
		text-align: center;
		padding: 48px 24px;
		background: var(--clr-surface);
		border-radius: 10px;
		color: var(--clr-text-muted);
	}

	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 12px;
		opacity: 0.4;
	}

	.empty-state a {
		color: var(--clr-link);
	}

	.view-all {
		text-align: right;
		margin-top: 12px;
		font-size: 0.875rem;
	}

	.view-all a {
		color: var(--clr-link);
	}

	.actions {
		white-space: nowrap;
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 14px;
		margin-bottom: 32px;
	}

	.category-card {
		background: var(--clr-surface);
		border-radius: 8px;
		padding: 14px 16px;
		box-shadow: 0 1px 3px var(--clr-shadow);
	}

	.cat-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.cat-symbol {
		font-size: 1rem;
		min-width: 30px;
		height: 30px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
	}

	.cat-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--clr-text-heading);
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cat-count {
		font-size: 0.75rem;
		color: var(--clr-text-faint);
		white-space: nowrap;
	}

	.cat-amount {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--clr-text-heading);
	}

	.cat-net {
		font-size: 0.78rem;
		color: var(--clr-text-faint);
		margin-top: 2px;
	}
</style>
