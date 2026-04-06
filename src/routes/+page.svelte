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
						<th></th>
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
							</td>
							<td>
								<a href="/invoices/{invoice.id}" class="btn btn-sm btn-ghost">
									<span class="mdi mdi-eye"></span>
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
		color: #1e293b;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		margin-bottom: 32px;
	}

	.stat-card {
		background: #fff;
		border-radius: 10px;
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
	}

	.stat-icon {
		font-size: 2rem;
		color: #2563eb;
		opacity: 0.8;
	}

	.stat-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: #1e293b;
	}

	.stat-label {
		font-size: 0.8rem;
		color: #64748b;
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
		color: #1e293b;
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

	.btn-sm {
		padding: 4px 10px;
		font-size: 0.8rem;
	}

	.btn-ghost {
		background: transparent;
		color: #2563eb;
	}

	.btn-ghost:hover {
		background: #eff6ff;
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

	.view-all {
		text-align: right;
		margin-top: 12px;
		font-size: 0.875rem;
	}

	.view-all a {
		color: #2563eb;
	}
</style>
