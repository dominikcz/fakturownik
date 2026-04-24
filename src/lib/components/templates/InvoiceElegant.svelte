<script lang="ts">
	import type { Invoice, Settings } from '$lib/types.js';
	import type { InvoiceTemplateConfig } from '$lib/invoiceTemplates.js';
	import { vatRateLabels, paymentMethodLabels, fmt } from '$lib/invoiceUtils.js';

	interface Props {
		invoice: Invoice & { id?: string };
		settings: Settings;
		tpl: InvoiceTemplateConfig;
		qrDataUrl: string;
		ksefVerificationUrl?: string;
	}

	let { invoice, settings, tpl, qrDataUrl, ksefVerificationUrl }: Props = $props();
</script>

<div class="invoice-preview"
	style="font-family: {tpl.font ?? "'Source Sans 3', Inter, sans-serif"};
	--inv-accent: {tpl.accent};
	--inv-th-bg: {tpl.thBg};
	--inv-th-color: {tpl.thColor};
	--inv-footer-bg: {tpl.footerBg};
	--inv-footer-border: {tpl.footerBorder};
	--inv-footer-color: {tpl.footerColor};
	--inv-line-color: {tpl.lineColor ?? '#EAE6DF'};
	--inv-heading-font: {tpl.headingFont ?? tpl.font ?? 'inherit'}">

	<!-- Nagłówek: logo po lewej, meta po prawej -->
	<div class="header">
		<div class="logo-area">
			{#if settings.seller.logo}
				<img src={settings.seller.logo} alt="Logo" class="logo" />
			{:else}
				<div class="brand">{invoice.seller.name}</div>
			{/if}
		</div>
		<div class="header-meta">
			{#if invoice.placeOfIssue}
				<div class="place-date">{invoice.placeOfIssue.charAt(0).toUpperCase() + invoice.placeOfIssue.slice(1).toLowerCase()}, {invoice.issueDate}</div>
			{:else}
				<div class="meta-row">
					<span class="meta-label">Data wystawienia:</span>
					<span class="meta-value">{invoice.issueDate}</span>
				</div>
			{/if}
			<div class="meta-row">
				<span class="meta-label">Data sprzedaży:</span>
				<span class="meta-value">{invoice.saleDate}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">Termin płatności:</span>
				<span class="meta-value">{invoice.paymentDueDate}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">Forma płatności:</span>
				<span class="meta-value">{paymentMethodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</span>
			</div>
		</div>
	</div>

	<!-- Strony -->
	<div class="parties-grid">
		<div class="party">
			<h3 class="party-title">Sprzedawca</h3>
			<div class="party-name">{invoice.seller.name}</div>
			<div class="party-info">{invoice.seller.address}</div>
			<div class="party-info">{invoice.seller.postalCode} {invoice.seller.city}</div>
			<div class="party-info">NIP: {invoice.seller.nip}</div>
			{#if invoice.bankAccount}
				<div class="party-info">Nr konta: {invoice.bankAccount}</div>
			{/if}
			{#if settings.seller.email}
				<div class="party-info">E-mail: {settings.seller.email}</div>
			{/if}
		</div>
		<div class="party">
			<h3 class="party-title">Nabywca</h3>
			<div class="party-name">{invoice.buyer.name}</div>
			<div class="party-info">{invoice.buyer.address}</div>
			<div class="party-info">{invoice.buyer.postalCode} {invoice.buyer.city}</div>
			<div class="party-info">NIP: {invoice.buyer.nip}</div>
		</div>
	</div>

	<!-- Tytuł faktury (z obramowaniem) -->
	<div class="invoice-title">
		<div class="title-line">
			<span class="title-text">Faktura</span>
			<span class="title-text">{invoice.number}</span>
		</div>
		{#if invoice.ksefNumber}
			<div class="ksef-number">Nr KSeF: {invoice.ksefNumber}</div>
		{/if}
	</div>

	<!-- Tabela pozycji (BEZ podsum VAT w tfoot) -->
	<table class="items-table">
		<thead>
			<tr>
				<th class="th-lp">L.p.</th>
				<th class="th-desc">Nazwa towaru / usługi</th>
				{#if settings.showItemColumns !== false}
					<th class="th-unit">J.m.</th>
					<th class="th-qty">Ilość</th>
					<th class="th-price">Cena netto</th>
				{/if}
				<th class="th-vat">VAT %</th>
				<th class="th-net">Wartość netto</th>
				<th class="th-vatamt">Wartość VAT</th>
				<th class="th-gross">Wartość brutto</th>
			</tr>
		</thead>
		<tbody>
			{#each invoice.items as item, idx}
				<tr class:row-even={settings.invoiceZebraStripes && idx % 2 === 1}>
					<td class="td-center">{idx + 1}</td>
					<td>{item.description}</td>
					{#if settings.showItemColumns !== false}
						<td class="td-center">{item.unit}</td>
						<td class="td-right">{item.quantity}</td>
						<td class="td-right">{fmt(item.unitPriceNet)}</td>
					{/if}
					<td class="td-center">{vatRateLabels[item.vatRate] ?? item.vatRate}</td>
					<td class="td-right">{fmt(item.netTotal)}</td>
					<td class="td-right">{fmt(item.vatTotal)}</td>
					<td class="td-right td-bold">{fmt(item.grossTotal)}</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<!-- Tylko wiersz Razem, bez podsum per stawkę VAT -->
			<tr class="total-footer-row">
				<td colspan={settings.showItemColumns !== false ? 5 : 2} class="total-footer-empty"></td>
				<td class="td-right total-footer-val">Razem:</td>
				<td class="td-right total-footer-val">{fmt(invoice.summary.netTotal)}</td>
				<td class="td-right total-footer-val">{fmt(invoice.summary.vatTotal)}</td>
				<td class="td-right total-footer-val">{fmt(invoice.summary.grossTotal)}</td>
			</tr>
		</tfoot>
	</table>

	<!-- Osobna tabelka podsumowania VAT (wyrównana do prawej) -->
	<div class="vat-summary-section">
		<table class="vat-summary-table">
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
						<td class="td-center">{vatRateLabels[row.rate] ?? row.rate}</td>
						<td class="td-right">{fmt(row.net)}</td>
						<td class="td-right">{fmt(row.vat)}</td>
						<td class="td-right">{fmt(row.gross)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Do zapłaty (wyrównane do prawej z akcentem) -->
	<div class="payment">
		<span class="payment-label">Do zapłaty:</span>
		<span class="payment-amount">{fmt(invoice.summary.grossTotal)} zł</span>
	</div>

	<!-- Uwagi -->
	{#if invoice.comments}
		<div class="comments-section">
			<h3>Uwagi</h3>
			<p>{invoice.comments}</p>
		</div>
	{/if}

	<!-- QR (bez górnej linii) -->
	{#if qrDataUrl}
		<div class="qr-section">
			<img src={qrDataUrl} alt="Kod QR faktury" class="qr-img" />
			<div class="qr-label">{invoice.ksefNumber ? 'Weryfikacja KSeF' : 'Dane faktury'}</div>
			{#if ksefVerificationUrl}
				<a href={ksefVerificationUrl} class="ksef-verify-link" target="_blank" rel="noopener noreferrer">{ksefVerificationUrl}</a>
			{/if}
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
		color: #111827;
		font-size: 0.9rem;
		line-height: 1.5;
		font-variant-numeric: lining-nums;
	}

	/* Nagłówek */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		padding-bottom: 16px;
	}

	.logo-area {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}

	.logo {
		max-height: 60px;
		max-width: 200px;
		object-fit: contain;
	}

	.brand {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--inv-accent);
		letter-spacing: 0.04em;
		font-family: var(--inv-heading-font);
	}

	.header-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.place-date {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 6px;
		font-family: var(--inv-heading-font);
	}

	.meta-row {
		display: flex;
		gap: 8px;
		font-size: 0.82rem;
	}

	.meta-label { color: #64748b; }
	.meta-value { color: #1e293b; font-weight: 600; }

	/* Strony */
	.parties-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin-bottom: 24px;
	}

	.party {
		padding: 0;
	}

	.party-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 8px;
		font-family: var(--inv-heading-font);
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

	/* Tytuł faktury z obramowaniem */
	.invoice-title {
		text-align: center;
		margin: 20px 0;
		padding: 16px 0;
		border-top: 1px solid var(--inv-line-color, #EAE6DF);
		border-bottom: 1px solid var(--inv-line-color, #EAE6DF);
	}

	.title-line {
		display: flex;
		justify-content: center;
		align-items: baseline;
		gap: 0.5em;
	}

	.title-text {
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #111827;
		font-family: var(--inv-heading-font);
	}

	.ksef-number {
		font-size: 0.75rem;
		color: #64748b;
		margin-top: 2px;
	}

	/* Tabela */
	.items-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 20px;
		font-size: 0.85rem;
		table-layout: fixed;
	}

	.th-lp    { width: 28px; }
	.th-desc  { width: auto; }
	.th-unit  { width: 44px; }
	.th-qty   { width: 44px; }
	.th-price { width: 80px; }
	.th-vat   { width: 44px; }
	.th-net   { width: 80px; }
	.th-vatamt{ width: 72px; }
	.th-gross { width: 84px; }

	.items-table th {
		padding: 8px;
		background: var(--inv-th-bg);
		color: var(--inv-th-color);
		font-weight: 600;
		font-size: 0.75rem;
		text-align: center;
		border: none;
	}

	.items-table td {
		padding: 7px 8px;
		border-bottom: 1px solid var(--inv-line-color, #EAE6DF);
	}

	.row-even td { background: #f8fafc; }
	.td-center { text-align: center; white-space: nowrap; }
	.td-right  { text-align: right; font-variant-numeric: lining-nums; white-space: nowrap; }
	.td-bold   { font-weight: 600; }

	.total-footer-row td { padding: 7px 8px; font-weight: 700; font-size: 0.88rem; }
	td.total-footer-empty {
		border-top: none;
		border-bottom: none;
		background: transparent;
	}
	.total-footer-val {
		background: var(--inv-footer-bg);
		border-top: 2px solid var(--inv-footer-border);
		color: var(--inv-footer-color, #111827);
	}

	/* Tabelka VAT */
	.vat-summary-section {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 16px;
	}

	.vat-summary-table {
		border-collapse: collapse;
		font-size: 0.82rem;
		min-width: 340px;
	}

	.vat-summary-table th {
		padding: 6px 10px;
		background: var(--inv-th-bg);
		color: var(--inv-th-color);
		font-weight: 600;
		text-align: center;
		border: none;
	}

	.vat-summary-table td {
		padding: 5px 10px;
		border-bottom: 1px solid var(--inv-line-color, #EAE6DF);
	}

	/* Do zapłaty */
	.payment {
		display: flex;
		justify-content: flex-end;
		align-items: baseline;
		gap: 12px;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 2px solid var(--inv-accent);
	}

	.payment-label {
		font-size: 0.9rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 600;
	}

	.payment-amount {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--inv-accent);
	}

	/* Uwagi */
	.comments-section {
		border-top: 1px solid var(--inv-line-color, #EAE6DF);
		padding-top: 16px;
		margin-top: 16px;
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

	/* QR (bez górnej linii) */
	.qr-section {
		margin-top: 16px;
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

	.ksef-verify-link {
		font-size: 0.65rem;
		color: var(--inv-accent, #3b82f6);
		text-align: center;
		word-break: break-all;
		max-width: 200px;
	}

	@media print {
		.invoice-preview {
			border: none;
			padding: 0;
			max-width: none;
			background: transparent;
			display: inline-block;
			width: 100%;
		}
	}
</style>
