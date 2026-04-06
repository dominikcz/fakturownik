<script lang="ts">
	import type { Invoice, Settings } from '$lib/types.js';

	interface Props {
		invoice: Invoice & { id?: string };
		settings: Settings;
	}

	let { invoice, settings }: Props = $props();

	const vatRateLabels: Record<string, string> = {
		'23': '23%',
		'8': '8%',
		'5': '5%',
		'0': '0%',
		zw: 'ZW',
		np: 'NP'
	};

	const paymentMethodLabels: Record<string, string> = {
		transfer: 'Przelew bankowy',
		cash: 'Gotówka',
		card: 'Karta płatnicza'
	};

	function fmt(n: number) {
		return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
	}

	let qrDataUrl = $state('');

	$effect(() => {
		if (invoice.id) {
			fetch(`/api/invoices/${invoice.id}/qr`)
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => { if (data?.dataUrl) qrDataUrl = data.dataUrl; })
				.catch(() => {});
		}
	});
</script>

<div class="invoice-preview" style="font-family: {settings.defaultFont ?? 'Trebuchet MS'}, sans-serif">
	<!-- Nagłówek -->
	<div class="header">
		<div class="logo-area">
			{#if settings.seller.logo}
				<img src={settings.seller.logo} alt="Logo" class="logo" />
			{/if}
		</div>
		<div class="invoice-title">
			<h1>FAKTURA VAT</h1>
			<div class="invoice-number">{invoice.number}</div>
			{#if invoice.ksefNumber}
				<div class="ksef-number">Nr KSeF: {invoice.ksefNumber}</div>
			{/if}
		</div>
	</div>

	<!-- Daty i dane -->
	<div class="meta-grid">
		<div class="meta-item">
			<span class="meta-label">Data wystawienia:</span>
			<span class="meta-value">{invoice.issueDate}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Data sprzedaży:</span>
			<span class="meta-value">{invoice.saleDate}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Termin płatności:</span>
			<span class="meta-value">{invoice.paymentDueDate}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Forma płatności:</span>
			<span class="meta-value">{paymentMethodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</span>
		</div>
		{#if invoice.bankAccount && invoice.paymentMethod === 'transfer'}
			<div class="meta-item meta-wide">
				<span class="meta-label">Numer konta:</span>
				<span class="meta-value">{invoice.bankAccount}</span>
			</div>
		{/if}
	</div>

	<!-- Sprzedawca i nabywca -->
	<div class="parties-grid">
		<div class="party">
			<h3 class="party-title">Sprzedawca</h3>
			<div class="party-name">{invoice.seller.name}</div>
			<div class="party-info">{invoice.seller.address}</div>
			<div class="party-info">{invoice.seller.postalCode} {invoice.seller.city}</div>
			<div class="party-info">NIP: {invoice.seller.nip}</div>
		</div>
		<div class="party">
			<h3 class="party-title">Nabywca</h3>
			<div class="party-name">{invoice.buyer.name}</div>
			<div class="party-info">{invoice.buyer.address}</div>
			<div class="party-info">{invoice.buyer.postalCode} {invoice.buyer.city}</div>
			<div class="party-info">NIP: {invoice.buyer.nip}</div>
		</div>
	</div>

	<!-- Pozycje -->
	<table class="items-table">
		<thead>
			<tr>
				<th class="th-lp">Lp.</th>
				<th class="th-desc">Nazwa towaru / usługi</th>
				<th class="th-qty">Ilość</th>
				<th class="th-unit">J.m.</th>
				<th class="th-price">Cena netto</th>
				<th class="th-vat">VAT</th>
				<th class="th-net">Wartość netto</th>
				<th class="th-vatamt">Kwota VAT</th>
				<th class="th-gross">Wartość brutto</th>
			</tr>
		</thead>
		<tbody>
			{#each invoice.items as item, idx}
				<tr class:row-even={idx % 2 === 1}>
					<td class="td-center">{idx + 1}</td>
					<td>{item.description}</td>
					<td class="td-right">{item.quantity}</td>
					<td class="td-center">{item.unit}</td>
					<td class="td-right">{fmt(item.unitPriceNet)}</td>
					<td class="td-center">{vatRateLabels[item.vatRate] ?? item.vatRate}</td>
					<td class="td-right">{fmt(item.netTotal)}</td>
					<td class="td-right">{fmt(item.vatTotal)}</td>
					<td class="td-right td-bold">{fmt(item.grossTotal)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Podsumowanie VAT -->
	<div class="summary-section">
		<div class="vat-summary">
			<h3>Podsumowanie VAT</h3>
			<table class="vat-table">
				<thead>
					<tr>
						<th>Stawka VAT</th>
						<th>Netto</th>
						<th>VAT</th>
						<th>Brutto</th>
					</tr>
				</thead>
				<tbody>
					{#each invoice.summary.byVatRate as row}
						<tr>
							<td>{vatRateLabels[row.rate] ?? row.rate}</td>
							<td class="td-right">{fmt(row.net)}</td>
							<td class="td-right">{fmt(row.vat)}</td>
							<td class="td-right">{fmt(row.gross)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="total-row">
						<th>RAZEM</th>
						<th class="td-right">{fmt(invoice.summary.netTotal)}</th>
						<th class="td-right">{fmt(invoice.summary.vatTotal)}</th>
						<th class="td-right">{fmt(invoice.summary.grossTotal)}</th>
					</tr>
				</tfoot>
			</table>
		</div>
		<div class="total-box">
			<div class="total-label">Do zapłaty:</div>
			<div class="total-value">{fmt(invoice.summary.grossTotal)} PLN</div>
		</div>
	</div>

	<!-- Uwagi -->
	{#if invoice.comments}
		<div class="comments-section">
			<h3>Uwagi</h3>
			<p>{invoice.comments}</p>
		</div>
	{/if}

	<!-- QR -->
	{#if qrDataUrl}
		<div class="qr-section">
			<img src={qrDataUrl} alt="Kod QR faktury" class="qr-img" />
			<div class="qr-label">
				{#if invoice.ksefNumber}
					Weryfikacja KSeF
				{:else}
					Dane faktury
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.invoice-preview {
		background: #fff;
		padding: 40px;
		max-width: 860px;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		color: #1e293b;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		border-bottom: 2px solid #1e293b;
		padding-bottom: 16px;
	}

	.logo {
		max-height: 60px;
		max-width: 200px;
		object-fit: contain;
	}

	.invoice-title {
		text-align: right;
	}

	.invoice-title h1 {
		font-size: 1.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #1e293b;
	}

	.invoice-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin-top: 4px;
	}

	.ksef-number {
		font-size: 0.75rem;
		color: #64748b;
		margin-top: 2px;
	}

	.meta-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 24px;
		margin-bottom: 20px;
		background: #f8fafc;
		padding: 12px 16px;
		border-radius: 6px;
	}

	.meta-item {
		display: flex;
		gap: 6px;
		font-size: 0.85rem;
	}

	.meta-wide {
		flex-basis: 100%;
	}

	.meta-label {
		color: #64748b;
		font-weight: 500;
	}

	.meta-value {
		color: #1e293b;
		font-weight: 600;
	}

	.parties-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin-bottom: 24px;
	}

	.party {
		padding: 14px;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
	}

	.party-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 8px;
	}

	.party-name {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 4px;
	}

	.party-info {
		font-size: 0.85rem;
		color: #374151;
	}

	/* Items table */
	.items-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 20px;
		font-size: 0.85rem;
	}

	.items-table th {
		padding: 8px 8px;
		background: #1e293b;
		color: #f1f5f9;
		font-weight: 600;
		font-size: 0.75rem;
		text-align: left;
		border: none;
	}

	.items-table td {
		padding: 7px 8px;
		border-bottom: 1px solid #e2e8f0;
	}

	.row-even td {
		background: #f8fafc;
	}

	.td-center { text-align: center; }
	.td-right { text-align: right; font-variant-numeric: tabular-nums; }
	.td-bold { font-weight: 600; }

	/* Summary */
	.summary-section {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 20px;
		margin-bottom: 20px;
	}

	.vat-summary {
		flex: 1;
		max-width: 420px;
	}

	.vat-summary h3 {
		font-size: 0.8rem;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 8px;
	}

	.vat-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.vat-table th,
	.vat-table td {
		padding: 6px 8px;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}

	.vat-table th {
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		background: #f8fafc;
	}

	.total-row th {
		background: #1e293b;
		color: #f1f5f9;
		border-bottom: none;
		padding: 8px;
	}

	.total-box {
		border: 2px solid #2563eb;
		border-radius: 8px;
		padding: 16px 24px;
		text-align: center;
		min-width: 180px;
	}

	.total-label {
		font-size: 0.8rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.total-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #2563eb;
		margin-top: 4px;
	}

	.comments-section {
		border-top: 1px solid #e2e8f0;
		padding-top: 16px;
	}

	.comments-section h3 {
		font-size: 0.8rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		margin-bottom: 6px;
	}

	.comments-section p {
		font-size: 0.9rem;
		color: #374151;
	}

	.qr-section {
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.qr-img {
		width: 80px;
		height: 80px;
		image-rendering: pixelated;
	}

	.qr-label {
		font-size: 0.7rem;
		color: #94a3b8;
		text-align: center;
		width: 80px;
	}

	@media print {
		.invoice-preview {
			border: none;
			padding: 0;
		}
	}
</style>
