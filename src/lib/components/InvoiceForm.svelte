<script lang="ts">
	import type { Invoice, InvoiceItem, Client, Settings, VatRate, PaymentMethod } from '$lib/types.js';
	import NipLookup from './NipLookup.svelte';
	import type { NipLookupResult } from '$lib/types.js';

	interface Props {
		invoice?: Partial<Invoice>;
		settings: Settings;
		clients: Client[];
		onSave: (invoice: Partial<Invoice>) => void | Promise<void>;
		onError?: (msg: string) => void;
		saving?: boolean;
		error?: string;
		cancelHref?: string;
	}

	let { invoice = {}, settings, clients, onSave, onError, saving = false, error = '', cancelHref = '/invoices' }: Props = $props();

	const today = new Date().toISOString().slice(0, 10);

	function addDays(dateStr: string, days: number): string {
		const d = new Date(dateStr);
		d.setDate(d.getDate() + days);
		return d.toISOString().slice(0, 10);
	}

	const paymentDays = settings.defaultPaymentDays ?? 14;
	const dueDateDefault = addDays(today, paymentDays);

	// Pola nagłówkowe
	let sequenceNumber = $state(invoice.sequenceNumber ?? settings.nextInvoiceNumber);
	let issueDate = $state(invoice.issueDate ?? today);
	let saleDate = $state(invoice.saleDate ?? today);
	let paymentDueDate = $state(invoice.paymentDueDate ?? dueDateDefault);
	let paymentMethod = $state<PaymentMethod>(invoice.paymentMethod ?? 'transfer');
	let bankAccount = $state(formatIban(invoice.bankAccount ?? settings.seller.bankAccount ?? ''));
	let comments = $state(invoice.comments ?? '');
	let status = $state(invoice.status ?? 'draft');

	// Gdy zmienia się data wystawienia → aktualizuj datę sprzedaży (jeśli była równa) i termin płatności
	let prevIssueDate = issueDate;
	$effect(() => {
		if (issueDate !== prevIssueDate) {
			if (saleDate === prevIssueDate) saleDate = issueDate;
			paymentDueDate = addDays(issueDate, paymentDays);
			prevIssueDate = issueDate;
		}
	});

	function formatIban(value: string): string {
		const digits = value.replace(/\s/g, '');
		if (!digits) return '';
		// Format: XX XXXX XXXX XXXX XXXX XXXX XXXX (26 cyfr dla PL)
		return digits.replace(/(.{2})(.{4})(.{4})(.{4})(.{4})(.{4})(.{4})/, '$1 $2 $3 $4 $5 $6 $7').trim();
	}

	function onBankAccountInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const pos = input.selectionStart ?? 0;
		const raw = input.value.replace(/\s/g, '');
		const formatted = formatIban(raw);
		bankAccount = formatted;
		// Przywróć pozycję kursora z uwzględnieniem dodanych spacji
		const spacesBeforePos = (formatted.slice(0, pos + Math.floor(pos / 4)).match(/\s/g) ?? []).length;
		setTimeout(() => input.setSelectionRange(pos + spacesBeforePos, pos + spacesBeforePos), 0);
	}

	// Dane nabywcy
	let buyerNip = $state(invoice.buyer?.nip ?? '');
	let buyerName = $state(invoice.buyer?.name ?? '');
	let buyerAddress = $state(invoice.buyer?.address ?? '');
	let buyerCity = $state(invoice.buyer?.city ?? '');
	let buyerPostalCode = $state(invoice.buyer?.postalCode ?? '');
	let buyerCountry = $state(invoice.buyer?.country ?? 'PL');

	// Pozycje faktury
	let items = $state<InvoiceItem[]>(
		invoice.items?.length
			? invoice.items.map((i) => ({ ...i }))
			: [createEmptyItem()]
	);

	function createEmptyItem(): InvoiceItem {
		return {
			description: '',
			quantity: 1,
			unit: 'szt.',
			unitPriceNet: 0,
			vatRate: '23' as VatRate,
			netTotal: 0,
			vatTotal: 0,
			grossTotal: 0
		};
	}

	function recalcItem(item: InvoiceItem): InvoiceItem {
		const netTotal = Math.round(item.quantity * item.unitPriceNet * 100) / 100;
		const vatRateNum = ['23', '8', '5', '0'].includes(item.vatRate) ? Number(item.vatRate) : 0;
		const vatTotal = Math.round(netTotal * vatRateNum) / 100;
		const grossTotal = Math.round((netTotal + vatTotal) * 100) / 100;
		return { ...item, netTotal, vatTotal, grossTotal };
	}

	function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
		items[idx] = recalcItem({ ...items[idx], [field]: value });
	}

	function addItem() {
		items = [...items, createEmptyItem()];
	}

	function removeItem(idx: number) {
		if (items.length === 1) return;
		items = items.filter((_, i) => i !== idx);
	}

	const summary = $derived(() => {
		const byRate = new Map<string, { net: number; vat: number; gross: number }>();
		let netTotal = 0;
		let vatTotal = 0;
		let grossTotal = 0;
		for (const item of items) {
			netTotal += item.netTotal;
			vatTotal += item.vatTotal;
			grossTotal += item.grossTotal;
			const key = item.vatRate;
			const existing = byRate.get(key) ?? { net: 0, vat: 0, gross: 0 };
			byRate.set(key, {
				net: existing.net + item.netTotal,
				vat: existing.vat + item.vatTotal,
				gross: existing.gross + item.grossTotal
			});
		}
		return {
			netTotal: Math.round(netTotal * 100) / 100,
			vatTotal: Math.round(vatTotal * 100) / 100,
			grossTotal: Math.round(grossTotal * 100) / 100,
			byVatRate: Array.from(byRate.entries()).map(([rate, vals]) => ({ rate, ...vals }))
		};
	});

	function onBuyerNipResult(result: NipLookupResult) {
		// buyerNip celowo nie jest nadpisywany – zachowujemy format wpisany przez użytkownika
		buyerName = result.name;
		buyerAddress = result.address;
		buyerCity = result.city;
		buyerPostalCode = result.postalCode;
		buyerCountry = result.country;
	}

	function selectClient(client: Client) {
		buyerNip = client.nip;
		buyerName = client.name;
		buyerAddress = client.address;
		buyerCity = client.city;
		buyerPostalCode = client.postalCode;
		buyerCountry = client.country;
	}

	let clientSearch = $state('');
	const filteredClients = $derived(
		clients.filter(
			(c) =>
				!clientSearch ||
				c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
				c.nip.includes(clientSearch)
		)
	);

	let showClientDropdown = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();

		// Walidacja wyliczeń pozycji
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const recalced = recalcItem(item);
			const tol = 0.015;
			if (
				Math.abs(item.netTotal - recalced.netTotal) > tol ||
				Math.abs(item.vatTotal - recalced.vatTotal) > tol ||
				Math.abs(item.grossTotal - recalced.grossTotal) > tol
			) {
				// Nadpisz pozycję poprawioną wartością i zwróć błąd
				items[i] = recalced;
				onError?.(`Pozycja ${i + 1}: wyliczenia kwot nie zgadzają się i zostały poprawione automatycznie. Sprawdź i zapisz ponownie.`);
				return;
			}
		}

		const invoiceData: Partial<Invoice> = {
			sequenceNumber,
			issueDate,
			saleDate,
			paymentDueDate,
			paymentMethod,
			bankAccount: bankAccount || undefined,
			comments: comments || undefined,
			status: status as Invoice['status'],
			seller: {
				nip: settings.seller.nip,
				name: settings.seller.name,
				address: settings.seller.address,
				city: settings.seller.city,
				postalCode: settings.seller.postalCode
			},
			buyer: {
				nip: buyerNip,
				name: buyerName,
				address: buyerAddress,
				city: buyerCity,
				postalCode: buyerPostalCode,
				country: buyerCountry
			},
			items,
			summary: summary()
		};
		await onSave(invoiceData);
	}

	const vatRates: VatRate[] = ['23', '8', '5', '0', 'zw', 'np'];

	function fmt(n: number) {
		return n.toFixed(2);
	}
</script>

<form class="invoice-form" onsubmit={handleSubmit}>
	{#if error}
		<div class="alert alert-error">{error}</div>
	{/if}

	<!-- Nagłówek faktury -->
	<div class="form-grid-2">
		<fieldset class="fieldset">
			<legend>Dane faktury</legend>
			<div class="form-row">
				<div class="form-group">
					<label for="seqNum">Numer sekwencyjny</label>
					<input
						id="seqNum"
						type="number"
						min="1"
						bind:value={sequenceNumber}
						class="inp"
						required
					/>
				</div>
				<div class="form-group">
					<label>Metoda płatności</label>
					<select bind:value={paymentMethod} class="inp">
						<option value="transfer">Przelew</option>
						<option value="cash">Gotówka</option>
						<option value="card">Karta</option>
					</select>
				</div>
			</div>
			<div class="form-row">
				<div class="form-group">
					<label for="issueDate">Data wystawienia</label>
					<input id="issueDate" type="date" bind:value={issueDate} class="inp" required />
				</div>
				<div class="form-group">
					<label for="saleDate">Data sprzedaży</label>
					<input id="saleDate" type="date" bind:value={saleDate} class="inp" required />
				</div>
				<div class="form-group">
					<label for="dueDate">Termin płatności</label>
					<input id="dueDate" type="date" bind:value={paymentDueDate} class="inp" required />
				</div>
			</div>
			{#if paymentMethod === 'transfer'}
				<div class="form-group">
					<label for="bankAcc">Numer konta bankowego</label>
					<input id="bankAcc" type="text" value={bankAccount} oninput={onBankAccountInput} class="inp" placeholder="PL00 0000 0000 0000 0000 0000 0000" maxlength={35} />
				</div>
			{/if}
			<div class="form-group">
				<label>Status</label>
				<select bind:value={status} class="inp">
					<option value="draft">Szkic</option>
					<option value="issued">Wystawiona</option>
				</select>
			</div>
		</fieldset>

		<!-- Sprzedawca -->
		<fieldset class="fieldset">
			<legend>Sprzedawca</legend>
			<div class="seller-info">
				<div><strong>{settings.seller.name}</strong></div>
				<div>{settings.seller.address}</div>
				<div>{settings.seller.postalCode} {settings.seller.city}</div>
				<div>NIP: {settings.seller.nip}</div>
				{#if settings.seller.email}
					<div>{settings.seller.email}</div>
				{/if}
				<a href="/settings" class="edit-link">Edytuj dane sprzedawcy →</a>
			</div>
		</fieldset>
	</div>

	<!-- Nabywca -->
	<fieldset class="fieldset">
		<legend>Nabywca</legend>

		{#if clients.length > 0}
			<div class="form-group" style="margin-bottom:12px">
				<label>Wybierz z listy kontrahentów</label>
				<div class="client-select-wrap">
					<input
						type="text"
						placeholder="Szukaj po nazwie lub NIP…"
						bind:value={clientSearch}
						class="inp"
						onfocus={() => (showClientDropdown = true)}
						onblur={() => setTimeout(() => (showClientDropdown = false), 200)}
					/>
					{#if showClientDropdown && filteredClients.length > 0}
						<div class="client-dropdown">
							{#each filteredClients.slice(0, 8) as c}
								<button
									type="button"
									class="client-option"
									onmousedown={() => selectClient(c)}
								>
									<span class="client-name">{c.name}</span>
									<span class="client-nip">NIP: {c.nip}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<div class="form-group">
			<label>NIP nabywcy</label>
			<NipLookup bind:nip={buyerNip} onResult={onBuyerNipResult} />
		</div>

		<div class="form-row">
			<div class="form-group flex-1">
				<label for="buyerName">Nazwa firmy *</label>
				<input id="buyerName" type="text" bind:value={buyerName} required class="inp" />
			</div>
		</div>
		<div class="form-row">
			<div class="form-group flex-1">
				<label for="buyerAddress">Adres *</label>
				<input id="buyerAddress" type="text" bind:value={buyerAddress} required class="inp" />
			</div>
		</div>
		<div class="form-row">
			<div class="form-group">
				<label for="buyerPostal">Kod pocztowy *</label>
				<input id="buyerPostal" type="text" bind:value={buyerPostalCode} required class="inp" placeholder="00-000" />
			</div>
			<div class="form-group flex-1">
				<label for="buyerCity">Miejscowość *</label>
				<input id="buyerCity" type="text" bind:value={buyerCity} required class="inp" />
			</div>
			<div class="form-group">
				<label for="buyerCountry">Kraj</label>
				<input id="buyerCountry" type="text" bind:value={buyerCountry} class="inp" maxlength={2} />
			</div>
		</div>
	</fieldset>

	<!-- Pozycje faktury -->
	<fieldset class="fieldset">
		<legend>Pozycje faktury</legend>
		<div class="items-table-wrap">
			<table class="items-table">
				<thead>
					<tr>
						<th class="col-lp">Lp.</th>
						<th class="col-desc">Nazwa / opis</th>
						<th class="col-qty">Ilość</th>
						<th class="col-unit">J.m.</th>
						<th class="col-price">Cena netto</th>
						<th class="col-vat">VAT%</th>
						<th class="col-net">Netto</th>
						<th class="col-vatamt">Kwota VAT</th>
						<th class="col-gross">Brutto</th>
						<th class="col-del"></th>
					</tr>
				</thead>
				<tbody>
					{#each items as item, idx}
						<tr>
							<td class="col-lp td-center">{idx + 1}</td>
							<td class="col-desc">
								<input
									type="text"
									bind:value={item.description}
									class="inp inp-cell"
									placeholder="Nazwa towaru/usługi"
									required
								/>
							</td>
							<td class="col-qty">
								<input
									type="number"
									min="0.001"
									step="any"
									bind:value={item.quantity}
									oninput={() => updateItem(idx, 'quantity', item.quantity)}
									class="inp inp-cell inp-num"
									required
								/>
							</td>
							<td class="col-unit">
								<input
									type="text"
									bind:value={item.unit}
									class="inp inp-cell"
									placeholder="szt."
								/>
							</td>
							<td class="col-price">
								<input
									type="number"
									min="0"
									step="0.01"
									bind:value={item.unitPriceNet}
									oninput={() => updateItem(idx, 'unitPriceNet', item.unitPriceNet)}
									class="inp inp-cell inp-num"
									required
								/>
							</td>
							<td class="col-vat">
								<select
									bind:value={item.vatRate}
									onchange={() => updateItem(idx, 'vatRate', item.vatRate)}
									class="inp inp-cell"
								>
									{#each vatRates as rate}
										<option value={rate}>{rate}%</option>
									{/each}
								</select>
							</td>
							<td class="col-net td-right">{fmt(item.netTotal)}</td>
							<td class="col-vatamt td-right">{fmt(item.vatTotal)}</td>
							<td class="col-gross td-right">{fmt(item.grossTotal)}</td>
							<td class="col-del">
								<button
									type="button"
									class="del-btn"
									onclick={() => removeItem(idx)}
									disabled={items.length === 1}
									title="Usuń pozycję"
								>
									<span class="mdi mdi-trash-can-outline"></span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<button type="button" class="add-item-btn" onclick={addItem}>
			<span class="mdi mdi-plus"></span> Dodaj pozycję
		</button>
	</fieldset>

	<!-- Podsumowanie -->
	<div class="summary-wrap">
		<div class="summary-box">
			<h3>Podsumowanie VAT</h3>
			<table class="summary-table">
				<thead>
					<tr>
						<th>Stawka VAT</th>
						<th>Netto</th>
						<th>VAT</th>
						<th>Brutto</th>
					</tr>
				</thead>
				<tbody>
					{#each summary().byVatRate as row}
						<tr>
							<td>{row.rate}%</td>
							<td class="td-right">{fmt(row.net)}</td>
							<td class="td-right">{fmt(row.vat)}</td>
							<td class="td-right">{fmt(row.gross)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="total-row">
						<th>Razem</th>
						<th class="td-right">{fmt(summary().netTotal)}</th>
						<th class="td-right">{fmt(summary().vatTotal)}</th>
						<th class="td-right">{fmt(summary().grossTotal)}</th>
					</tr>
				</tfoot>
			</table>
			<div class="total-amount">
				Do zapłaty: <strong>{fmt(summary().grossTotal)} PLN</strong>
			</div>
		</div>
	</div>

	<!-- Uwagi -->
	<fieldset class="fieldset">
		<legend>Uwagi (opcjonalne)</legend>
		<textarea bind:value={comments} class="inp" rows={3} placeholder="Dodatkowe informacje…"></textarea>
	</fieldset>

	<!-- Akcje -->
	<div class="form-actions">
		<a href={cancelHref} class="btn btn-ghost">Anuluj</a>
		<button type="submit" class="btn btn-primary" disabled={saving}>
			{#if saving}<span class="mdi mdi-loading spin"></span>{/if}
			Zapisz fakturę
		</button>
	</div>
</form>

<style>
	.invoice-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1100px;
	}

	.form-grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.fieldset {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 16px;
		background: #fff;
	}

	.fieldset legend {
		font-size: 0.8rem;
		font-weight: 600;
		color: #64748b;
		padding: 0 6px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 12px;
	}

	.form-row {
		display: flex;
		gap: 12px;
		margin-top: 12px;
	}

	.form-row .form-group {
		margin-top: 0;
	}

	.flex-1 {
		flex: 1;
	}

	label {
		font-size: 0.78rem;
		font-weight: 600;
		color: #374151;
	}

	.inp {
		padding: 7px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
		background: #fff;
	}

	.inp:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 2px #2563eb20;
	}

	textarea.inp {
		resize: vertical;
	}

	.seller-info {
		margin-top: 10px;
		font-size: 0.9rem;
		line-height: 1.6;
		color: #374151;
	}

	.edit-link {
		color: #2563eb;
		font-size: 0.8rem;
		margin-top: 4px;
		display: inline-block;
	}

	/* Client dropdown */
	.client-select-wrap {
		position: relative;
	}

	.client-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 100;
		max-height: 240px;
		overflow-y: auto;
	}

	.client-option {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: transparent;
		border: none;
		width: 100%;
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
		border-bottom: 1px solid #f1f5f9;
	}

	.client-option:hover {
		background: #f8fafc;
	}

	.client-name {
		font-weight: 500;
		color: #1e293b;
	}

	.client-nip {
		font-size: 0.8rem;
		color: #64748b;
	}

	/* Items table */
	.items-table-wrap {
		overflow-x: auto;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.items-table th {
		padding: 8px 6px;
		font-size: 0.72rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		border-bottom: 2px solid #e2e8f0;
		text-align: left;
		background: #f8fafc;
	}

	.items-table td {
		padding: 6px 4px;
		border-bottom: 1px solid #f1f5f9;
		vertical-align: middle;
	}

	.col-lp { width: 36px; }
	.col-desc { min-width: 200px; }
	.col-qty { width: 70px; }
	.col-unit { width: 60px; }
	.col-price { width: 90px; }
	.col-vat { width: 70px; }
	.col-net { width: 80px; }
	.col-vatamt { width: 80px; }
	.col-gross { width: 90px; }
	.col-del { width: 36px; }

	.inp-cell {
		padding: 5px 6px;
		font-size: 0.875rem;
	}

	.inp-num {
		text-align: right;
	}

	.td-center { text-align: center; }
	.td-right { text-align: right; font-variant-numeric: tabular-nums; }

	.del-btn {
		background: transparent;
		border: none;
		color: #ef4444;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		font-size: 1rem;
		transition: background 0.15s;
	}

	.del-btn:hover:not(:disabled) {
		background: #fef2f2;
	}

	.del-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.add-item-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
		padding: 7px 14px;
		background: transparent;
		border: 1px dashed #2563eb;
		color: #2563eb;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	.add-item-btn:hover {
		background: #eff6ff;
	}

	/* Summary */
	.summary-wrap {
		display: flex;
		justify-content: flex-end;
	}

	.summary-box {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 16px;
		min-width: 380px;
	}

	.summary-box h3 {
		font-size: 0.85rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 10px;
	}

	.summary-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.summary-table th,
	.summary-table td {
		padding: 6px 8px;
		text-align: left;
	}

	.summary-table th {
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		border-bottom: 1px solid #e2e8f0;
	}

	.summary-table td {
		border-bottom: 1px solid #f1f5f9;
	}

	.total-row th {
		border-top: 2px solid #e2e8f0;
		border-bottom: none !important;
		padding-top: 8px;
	}

	.total-amount {
		margin-top: 12px;
		font-size: 1rem;
		text-align: right;
		color: #1e293b;
	}

	.total-amount strong {
		font-size: 1.2rem;
		color: #2563eb;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 20px;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s;
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

	.alert-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.spin { animation: spin 0.8s linear infinite; }
</style>
