<script lang="ts">
	import type { Invoice, Settings } from '$lib/types.js';
	import { getTemplateConfig } from '$lib/invoiceTemplates.js';
	import { untrack } from 'svelte';

	interface Props {
		invoice: Invoice & { id?: string };
		settings: Settings;
		qrDataUrlOverride?: string;
	}

	let { invoice, settings, qrDataUrlOverride }: Props = $props();

	const tpl = $derived(getTemplateConfig(settings.invoiceTemplate));

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

	let qrDataUrl = $state(untrack(() => qrDataUrlOverride ?? ''));

	$effect(() => {
		if (!qrDataUrlOverride && invoice.id) {
			fetch(`/api/invoices/${invoice.id}/qr`)
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => { if (data?.dataUrl) qrDataUrl = data.dataUrl; })
				.catch(() => {});
		}
	});
</script>

<div class="invoice-preview"
	style="font-family: {tpl.font ?? settings.defaultFont ?? 'Trebuchet MS'};
	--inv-accent: {tpl.accent};
	--inv-th-bg: {tpl.thBg};
	--inv-th-color: {tpl.thColor};
	--inv-footer-bg: {tpl.footerBg};
	--inv-footer-border: {tpl.footerBorder};
	--inv-footer-color: {tpl.footerColor};
	--inv-header-border: {tpl.headerBorder};
	--inv-meta-bg: {tpl.metaBg};
	--inv-heading-font: {tpl.headingFont ?? tpl.font ?? 'inherit'};
	--inv-line-color: {tpl.lineColor ?? '#e2e8f0'};
	--inv-text-color: {tpl.layout === 'modern' ? '#1F2937' : tpl.layout === 'elegant' ? '#111827' : '#1e293b'}"
	class:no-outer-lines={tpl.headerStyle === 'side-meta'}
	class:elegant-layout={tpl.layout === 'elegant'}>
	<!-- Nagłówek -->
	{#if tpl.layout === 'modern'}
		<div class="modern-header">			<div class="modern-header-left">
				<div class="modern-meta-item">
					<div class="modern-meta-label">Data wystawienia</div>
					<div class="modern-meta-val">{invoice.issueDate}</div>
				</div>
				<div class="modern-meta-item">
					<div class="modern-meta-label">Numer faktury</div>
					<div class="modern-meta-val modern-invoice-number">{invoice.number}</div>
					{#if invoice.ksefNumber}
						<div class="ksef-number">Nr KSeF: {invoice.ksefNumber}</div>
					{/if}
				</div>
			</div>
			<div class="modern-header-right">
				{#if settings.seller.logo}
					<img src={settings.seller.logo} alt="Logo" class="logo" />
				{:else}
					<div class="modern-brand">{invoice.seller.name}</div>
				{/if}
			</div>
		</div>
	{:else if tpl.layout === 'elegant' || tpl.headerStyle === 'side-meta'}
		<div class="elegant-header">
			<div class="elegant-logo-area">
				{#if settings.seller.logo}
					<img src={settings.seller.logo} alt="Logo" class="logo" />
				{:else}
					<div class="elegant-brand">{invoice.seller.name}</div>
				{/if}
			</div>
			<div class="elegant-header-meta">
				{#if invoice.placeOfIssue}
					<div class="elegant-place-date">{(invoice.placeOfIssue.charAt(0).toUpperCase() + invoice.placeOfIssue.slice(1).toLowerCase())}, {invoice.issueDate}</div>
				{:else}
					<div class="elegant-meta-row">
						<span class="elegant-meta-label">Data wystawienia:</span>
						<span class="elegant-meta-value">{invoice.issueDate}</span>
					</div>
				{/if}
				<div class="elegant-meta-row">
					<span class="elegant-meta-label">Data sprzedaży:</span>
					<span class="elegant-meta-value">{invoice.saleDate}</span>
				</div>
				<div class="elegant-meta-row">
					<span class="elegant-meta-label">Termin płatności:</span>
					<span class="elegant-meta-value">{invoice.paymentDueDate}</span>
				</div>
				<div class="elegant-meta-row">
					<span class="elegant-meta-label">Forma płatności:</span>
					<span class="elegant-meta-value">{paymentMethodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="header">
			<div class="logo-area">
				{#if settings.seller.logo}
					<img src={settings.seller.logo} alt="Logo" class="logo" />
				{/if}
			</div>
			<div class="invoice-title">
				<h1>FAKTURA</h1>
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
	{/if}

	<!-- Sprzedawca i nabywca -->
	<div class="parties-grid" class:parties-flat={tpl.partyStyle === 'flat'}>
		<div class="party" class:party-flat={tpl.partyStyle === 'flat'}>
			<h3 class="party-title">Sprzedawca</h3>
			<div class="party-name">{invoice.seller.name}</div>
			<div class="party-info">{invoice.seller.address}</div>
			<div class="party-info">{invoice.seller.postalCode} {invoice.seller.city}</div>
			<div class="party-info">NIP: {invoice.seller.nip}</div>
			{#if tpl.layout === 'elegant'}
				{#if invoice.bankAccount}
					<div class="party-info">Nr konta: {invoice.bankAccount}</div>
				{/if}
				{#if settings.seller.email}
					<div class="party-info">E-mail: {settings.seller.email}</div>
				{/if}
			{/if}
		</div>
		<div class="party" class:party-flat={tpl.partyStyle === 'flat'}>
			<h3 class="party-title">Nabywca</h3>
			<div class="party-name">{invoice.buyer.name}</div>
			<div class="party-info">{invoice.buyer.address}</div>
			<div class="party-info">{invoice.buyer.postalCode} {invoice.buyer.city}</div>
			<div class="party-info">NIP: {invoice.buyer.nip}</div>
		</div>
	</div>

	<!-- Tytuł faktury (elegancki + klasyczny) -->
	{#if tpl.layout === 'elegant' || tpl.headerStyle === 'side-meta'}
		<div class="elegant-invoice-title">
			<div class="elegant-title-line">
				<span class="elegant-title-text">Faktura</span>
				<span class="elegant-title-text">{invoice.number}</span>
			</div>
			{#if invoice.ksefNumber}
				<div class="ksef-number">Nr KSeF: {invoice.ksefNumber}</div>
			{/if}
		</div>
	{/if}

	<!-- Tytuł sekcji pozycji -->
	{#if tpl.titleAccent}
		<div class="section-title-bar">
			<span class="section-title-arrow">&#9658;</span>
			FAKTURA VAT
		</div>
	{/if}

	<!-- Pozycje -->
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
			{#if tpl.layout !== 'elegant'}
				<!-- Podsumowanie per stawka VAT -->
				{#each invoice.summary.byVatRate as row}
					<tr class="vat-subtotal-row">
						<td colspan={settings.showItemColumns !== false ? 5 : 2} class="td-right vat-subtotal-empty"></td>
						<td class="td-center vat-subtotal">{vatRateLabels[row.rate] ?? row.rate}</td>
						<td class="td-right vat-subtotal">{fmt(row.net)}</td>
						<td class="td-right vat-subtotal">{fmt(row.vat)}</td>
						<td class="td-right vat-subtotal">{fmt(row.gross)}</td>
					</tr>
				{/each}
			{/if}
			<!-- Wiersz Razem -->
			<tr class="total-footer-row">
				<td colspan={settings.showItemColumns !== false ? 5 : 2} class="total-footer-empty"></td>
				<td class="td-right total-footer-val">Razem:</td>
				<td class="td-right total-footer-val">{fmt(invoice.summary.netTotal)}</td>
				<td class="td-right total-footer-val">{fmt(invoice.summary.vatTotal)}</td>
				<td class="td-right total-footer-val">{fmt(invoice.summary.grossTotal)}</td>
			</tr>
		</tfoot>
	</table>

	<!-- Osobna tabelka VAT dla elegant -->
	{#if tpl.layout === 'elegant'}
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
	{/if}

	<!-- Do zapłaty / Stopka -->
	{#if tpl.layout === 'modern'}
		<div class="total-bar">
			<span class="total-bar-label">WARTOŚĆ FAKTURY:</span>
			<span class="total-bar-value">{fmt(invoice.summary.grossTotal)} zł</span>
		</div>
		<div class="modern-footer">
			<div class="modern-footer-left">
				<div class="modern-footer-meta-item">
					<div class="modern-footer-label">Data sprzedaży</div>
					<div class="modern-footer-value">&#9658; {invoice.saleDate}</div>
				</div>
				{#if invoice.bankAccount && invoice.paymentMethod === 'transfer'}
					<div class="modern-footer-meta-item">
						<div class="modern-footer-label">Numer konta bankowego</div>
						<div class="modern-footer-value">&#9658; {invoice.bankAccount}</div>
					</div>
				{/if}
				<div class="modern-footer-meta-item">
					<div class="modern-footer-label">Forma płatności</div>
					<div class="modern-footer-value">&#9658; {paymentMethodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</div>
				</div>
			</div>
			<div class="modern-footer-right">
				<div class="modern-pay-label">PROSIMY O WPŁATĘ</div>
				<div class="modern-pay-amount">{fmt(invoice.summary.grossTotal)} zł</div>
				<div class="modern-pay-due-label">TERMIN PŁATNOŚCI:</div>
				<div class="modern-pay-due-date">{invoice.paymentDueDate}</div>
			</div>
		</div>
	{:else if tpl.layout === 'elegant'}
		<div class="elegant-payment">
			<span class="elegant-payment-label">Do zapłaty:</span>
			<span class="elegant-payment-amount">{fmt(invoice.summary.grossTotal)} zł</span>
		</div>
	{:else if tpl.totalStyle === 'bar'}
		<div class="total-bar">
			<span class="total-bar-label">WARTOŚĆ FAKTURY:</span>
			<span class="total-bar-value">{fmt(invoice.summary.grossTotal)} zł</span>
		</div>
	{:else}
		<div class="summary-section">
			<span class="total-label">Do zapłaty:</span>
			<span class="total-value">{fmt(invoice.summary.grossTotal)} PLN</span>
		</div>
	{/if}

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
		color: var(--inv-text-color, #1e293b);
		font-size: 0.9rem;
		line-height: 1.5;
		font-variant-numeric: lining-nums;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		border-bottom: 2px solid var(--inv-header-border);
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
		background: var(--inv-meta-bg);
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
		border: 1px solid var(--inv-line-color, #e2e8f0);
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
		table-layout: fixed;
	}

	.th-lp    { width: 30px; }
	.th-desc  { width: auto; }
	.th-unit  { width: 80px; }
	.th-qty   { width: 80px; }
	.th-price { width: 90px; }
	.th-vat   { width: 80px; }
	.th-net   { width: 90px; }
	.th-vatamt{ width: 90px; }
	.th-gross { width: 90px; }

	.items-table th {
		padding: 8px 8px;
		background: var(--inv-th-bg);
		color: var(--inv-th-color);
		font-weight: 600;
		font-size: 0.75rem;
		text-align: center;
		border: none;
	}

	.items-table td {
		padding: 7px 8px;
		border-bottom: 1px solid var(--inv-line-color, #e2e8f0);
	}

	.row-even td {
		background: #f8fafc;
	}

	.td-center { text-align: center; }
	.td-right { text-align: right; font-variant-numeric: lining-nums; }
	.td-bold { font-weight: 600; }

	/* VAT subtotal rows in tfoot */
	.vat-subtotal-row td {
		padding: 5px 8px;
		font-size: 0.82rem;
	}
	.items-table .vat-subtotal-empty {
		border: none;
		background: transparent;
	}
	.vat-subtotal {
		background: #f8fafc;
		border-bottom: 1px solid var(--inv-line-color, #e2e8f0);
		color: #374151;
	}

	/* Razem row */
	.total-footer-row td {
		padding: 7px 8px;
		font-weight: 700;
		font-size: 0.88rem;
	}
	.items-table .total-footer-empty {
		border-top: none;
		border-bottom: none;
		background: transparent;
		color: #1e293b;
		font-weight: 700;
	}
	.total-footer-val {
		background: var(--inv-footer-bg);
		border-top: 2px solid var(--inv-footer-border);
		color: var(--inv-footer-color, #1e293b);
	}

	/* Summary */
	.summary-section {
		display: flex;
		align-items: baseline;
		gap: 0.6em;
		margin-bottom: 20px;
	}

	.total-label {
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 500;
	}

	.total-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: #111827;
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

	/* === Modern layout === */
	.modern-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		border-bottom: 3px solid var(--inv-header-border);
		padding-bottom: 16px;
	}

	.modern-header-left {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.modern-header-right {
		display: flex;
		align-items: flex-start;
	}

	.modern-meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.modern-meta-label {
		font-size: 0.7rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.modern-meta-val {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
	}

	.modern-invoice-number {
		font-size: 1.4rem;
		font-weight: 800;
		color: #111827;
	}

	.modern-brand {
		font-size: 1.4rem;
		font-weight: 900;
		color: var(--inv-accent);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* Modern footer (bottom two-column section) */
	.modern-footer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-top: 24px;
	}

	.modern-footer-left {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.modern-footer-meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.modern-footer-label {
		font-size: 0.7rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.modern-footer-value {
		font-size: 0.95rem;
		font-weight: 700;
		color: #1e293b;
	}

	.modern-footer-right {
		border: 2px solid var(--inv-accent);
		border-radius: 6px;
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}

	.modern-pay-label {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--inv-accent);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.modern-pay-amount {
		font-size: 2rem;
		font-weight: 900;
		color: #1e293b;
		line-height: 1.1;
	}

	.modern-pay-due-label {
		font-size: 0.65rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-top: 6px;
	}

	.modern-pay-due-date {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1e293b;
	}

	.party-flat {
		border: none;
		border-radius: 0;
		padding: 0;
	}

	/* Section title accent (bar style) */
	.section-title-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
		font-weight: 700;
		color: #1e293b;
		letter-spacing: 0.04em;
		margin-bottom: 10px;
	}

	.section-title-arrow {
		color: var(--inv-accent);
		font-size: 0.8rem;
	}

	/* Full-width total bar */
	.total-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--inv-footer-bg);
		color: #fff;
		padding: 12px 16px;
		margin-bottom: 20px;
		font-weight: 700;
	}

	.total-bar-label {
		font-size: 0.95rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.total-bar-value {
		font-size: 1.2rem;
	}

	.qr-label {
		font-size: 0.7rem;
		color: #94a3b8;
		text-align: center;
		width: 80px;
	}

	/* === Elegant layout === */
	.elegant-title-text,
	.elegant-brand,
	.elegant-place-date {
		font-family: var(--inv-heading-font);
	}

	.invoice-preview .party-title {
		font-family: var(--inv-heading-font);
	}

	.elegant-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		padding-bottom: 16px;
	}

	.elegant-logo-area {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}

	.elegant-brand {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--inv-accent);
		letter-spacing: 0.04em;
	}

	.elegant-header-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.elegant-place-date {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 6px;
	}

	.elegant-meta-row {
		display: flex;
		gap: 8px;
		font-size: 0.82rem;
	}

	.elegant-meta-label {
		color: #64748b;
	}

	.elegant-meta-value {
		color: #1e293b;
		font-weight: 600;
	}

	.elegant-invoice-title {
		text-align: center;
		margin: 20px 0 20px;
		padding: 16px 0;
		border-top: 1px solid var(--inv-line-color, #e2e8f0);
		border-bottom: 1px solid var(--inv-line-color, #e2e8f0);
	}

	.elegant-title-line {
		display: flex;
		justify-content: center;
		align-items: baseline;
		gap: 0.5em;
	}

	.elegant-title-text {
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #111827;
	}

	.elegant-payment {
		display: flex;
		justify-content: flex-end;
		align-items: baseline;
		gap: 12px;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 2px solid var(--inv-accent);
	}

	.elegant-payment-label {
		font-size: 0.9rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 600;
	}

	.elegant-payment-amount {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--inv-accent);
	}

	@media print {
		.invoice-preview {
			border: none;
			padding: 0;
			max-width: none;
			background: #fff;
			display: inline-block;
			width: 100%;
		}
	}

	.no-outer-lines {
		border: none;
	}

	.no-outer-lines .comments-section {
		border-top: none;
	}

	.no-outer-lines .qr-section {
		border-top: none;
	}

	.no-outer-lines .elegant-invoice-title {
		border-top: none;
		border-bottom: none;
	}

	/* Elegant: no QR border */
	.elegant-layout .qr-section {
		border-top: none;
	}

	/* Osobna tabelka VAT */
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
		border-bottom: 1px solid var(--inv-line-color, #e2e8f0);
	}
</style>
