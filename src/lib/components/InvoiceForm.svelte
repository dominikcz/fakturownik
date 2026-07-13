<script lang="ts">
	import type { Invoice, InvoiceItem, Client, Settings, VatRate, PaymentMethod, InvoiceCategory } from '$lib/types.js';
	import { untrack } from 'svelte';
	import NipLookup from './NipLookup.svelte';
	import type { NipLookupResult } from '$lib/types.js';

	interface Props {
		invoice?: Partial<Invoice>;
		settings: Settings;
		clients: Client[];
		categories?: InvoiceCategory[];
		onSave: (invoice: Partial<Invoice>) => void | Promise<void>;
		onError?: (msg: string) => void;
		saving?: boolean;
		error?: string;
		cancelHref?: string;
	}

	let { invoice = {}, settings, clients, categories = [], onSave, onError, saving = false, error = '', cancelHref = '/invoices' }: Props = $props();

	const today = new Date().toISOString().slice(0, 10);

	function addDays(dateStr: string, days: number): string {
		const d = new Date(dateStr);
		d.setDate(d.getDate() + days);
		return d.toISOString().slice(0, 10);
	}

	const paymentDays = untrack(() => settings.defaultPaymentDays ?? 14);
	const dueDateDefault = addDays(today, paymentDays);

	// Pola nagłówkowe
	let sequenceNumber = $state(untrack(() => invoice.sequenceNumber ?? settings.nextInvoiceNumber));
	let issueDate = $state(untrack(() => invoice.issueDate ?? today));
	let saleDate = $state(untrack(() => invoice.saleDate ?? today));
	let paymentDueDate = $state(untrack(() => invoice.paymentDueDate ?? dueDateDefault));
	let paymentMethod = $state<PaymentMethod>(untrack(() => invoice.paymentMethod ?? 'transfer'));
	let bankAccount = $state(untrack(() => formatIban(invoice.bankAccount ?? settings.seller.bankAccount ?? '')));
	let comments = $state(untrack(() => invoice.comments ?? ''));
	let placeOfIssue = $state(untrack(() => invoice.placeOfIssue ?? settings.seller.city ?? ''));
	let status = $state(untrack(() => invoice.status ?? 'draft'));
	let categoryId = $state(untrack(() => invoice.categoryId ?? ''));

	// Gdy zmienia się data wystawienia → aktualizuj datę sprzedaży (jeśli była równa) i termin płatności
	let prevIssueDate = untrack(() => issueDate);
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
	let buyerNip = $state(untrack(() => invoice.buyer?.nip ?? ''));
	let buyerName = $state(untrack(() => invoice.buyer?.name ?? ''));
	let buyerAddress = $state(untrack(() => invoice.buyer?.address ?? ''));
	let buyerCity = $state(untrack(() => invoice.buyer?.city ?? ''));
	let buyerPostalCode = $state(untrack(() => invoice.buyer?.postalCode ?? ''));
	let buyerCountry = $state(untrack(() => invoice.buyer?.country ?? 'PL'));
	let buyerEmail = $state(untrack(() => invoice.buyer?.email ?? ''));
	let buyerPhone = $state(untrack(() => invoice.buyer?.phone ?? ''));

	// Pozycje faktury
	let items = $state<InvoiceItem[]>(untrack(() =>
		invoice.items?.length
			? invoice.items.map((i) => ({ ...i }))
			: [createEmptyItem()]
	));

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
		// buyerNip celowo nie jest nadpisywany - zachowujemy format wpisany przez użytkownika
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
		buyerEmail = client.email ?? '';
		buyerPhone = client.phone ?? '';
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
			placeOfIssue: placeOfIssue || undefined,
			status: status as Invoice['status'],
			categoryId: categoryId || undefined,
			seller: {
				nip: settings.seller.nip,
				name: settings.seller.name,
				address: settings.seller.address,
				city: settings.seller.city,
				postalCode: settings.seller.postalCode,
				...(settings.showSellerEmail && settings.seller.email ? { email: settings.seller.email } : {}),
				...(settings.showSellerPhone && settings.seller.phone ? { phone: settings.seller.phone } : {})
			},
			buyer: {
				nip: buyerNip,
				name: buyerName,
				address: buyerAddress,
				city: buyerCity,
				postalCode: buyerPostalCode,
				country: buyerCountry,
				...(buyerEmail ? { email: buyerEmail } : {}),
				...(buyerPhone ? { phone: buyerPhone } : {})
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
					<label for="paymentMethod">Metoda płatności</label>
					<select id="paymentMethod" bind:value={paymentMethod} class="inp">
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
				<label for="invoiceStatus">Status</label>
				<select id="invoiceStatus" bind:value={status} class="inp">
					<option value="draft">Szkic</option>
					<option value="issued">Wystawiona</option>
				</select>
			</div>
			{#if categories.length > 0}
				<div class="form-group">
					<label for="invoiceCategory">Kategoria</label>
					<select id="invoiceCategory" bind:value={categoryId} class="inp">
						<option value="">— brak kategorii —</option>
						{#each categories as cat}
							<option value={cat.id}>{cat.symbol} {cat.name}</option>
						{/each}
					</select>
				</div>
			{/if}
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
				<p class="form-sublabel">Wybierz z listy kontrahentów</p>
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
			<p class="form-sublabel">NIP nabywcy</p>
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
		<div class="form-row">
			<div class="form-group flex-1">
				<label for="buyerEmail">E-mail</label>
				<input id="buyerEmail" type="email" bind:value={buyerEmail} class="inp" />
			</div>
			<div class="form-group flex-1">
				<label for="buyerPhone">Telefon</label>
				<input id="buyerPhone" type="tel" bind:value={buyerPhone} class="inp" />
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
								min={settings.integerQuantities ? 1 : 0}
								step="1"
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
		<legend>Dodatkowe informacje</legend>
		<div class="form-group">
			<label for="placeOfIssue">Miejsce wystawienia</label>
			<input id="placeOfIssue" type="text" bind:value={placeOfIssue} class="inp" placeholder="np. Kraków" style="max-width:220px" />
		</div>
		<div class="form-group">
			<label for="comments">Uwagi</label>
			<textarea id="comments" bind:value={comments} class="inp" rows={3} placeholder="Dodatkowe informacje…"></textarea>
		</div>
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
		color: var(--clr-text-2);
	}

	.inp {
		padding: 7px 10px;
		border: 1px solid var(--clr-border-input);
		border-radius: 6px;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
		background: var(--clr-surface);
		color: var(--clr-text);
	}

	.inp:focus {
		border-color: var(--clr-primary);
		box-shadow: 0 0 0 2px var(--clr-primary-ring);
	}

	textarea.inp {
		resize: vertical;
	}

	.seller-info {
		margin-top: 10px;
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--clr-text-2);
	}

	.edit-link {
		color: var(--clr-link);
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
		background: var(--clr-surface);
		border: 1px solid var(--clr-border-mid);
		border-radius: 6px;
		box-shadow: 0 4px 12px var(--clr-shadow-md);
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
		border-bottom: 1px solid var(--clr-border-subtle);
	}

	.client-option:hover {
		background: var(--clr-surface-raised);
	}

	.client-name {
		font-weight: 500;
		color: var(--clr-text-heading);
	}

	.client-nip {
		font-size: 0.8rem;
		color: var(--clr-text-muted);
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
		color: var(--clr-text);
		text-transform: uppercase;
		border-bottom: 2px solid var(--clr-border-mid);
		text-align: left;
		background: var(--clr-surface-raised);
	}

	.items-table td {
		padding: 6px 4px;
		border-bottom: 1px solid var(--clr-border-subtle);
		vertical-align: middle;
	}

	.col-lp { width: 36px; }
	.col-desc { min-width: 200px; }
	.col-qty { width: 90px; }
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

	.form-sublabel {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--clr-text-2);
		margin-bottom: 4px;
	}

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
		background: var(--clr-danger-bg);
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
		border: 1px dashed var(--clr-primary);
		color: var(--clr-primary);
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	.add-item-btn:hover {
		background: var(--clr-primary-bg);
	}

	/* Summary */
	.summary-wrap {
		display: flex;
		justify-content: flex-end;
	}

	.summary-box {
		background: var(--clr-surface);
		border: 1px solid var(--clr-border-mid);
		border-radius: 8px;
		padding: 16px;
		min-width: 380px;
	}

	.summary-box h3 {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--clr-text-muted);
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
		color: var(--clr-text-muted);
		border-bottom: 1px solid var(--clr-border-mid);
	}

	.summary-table td {
		border-bottom: 1px solid var(--clr-border-subtle);
	}

	.total-row th {
		border-top: 2px solid var(--clr-border-mid);
		border-bottom: none !important;
		padding-top: 8px;
	}

	.total-amount {
		margin-top: 12px;
		font-size: 1rem;
		text-align: right;
		color: var(--clr-text-heading);
	}

	.total-amount strong {
		font-size: 1.2rem;
		color: var(--clr-primary);
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
		background: var(--clr-primary);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--clr-primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-ghost {
		background: transparent;
		color: var(--clr-text-2);
		border: 1px solid var(--clr-border-input);
	}

	.btn-ghost:hover {
		background: var(--clr-surface-raised);
	}

	.alert-error {
		background: var(--clr-danger-bg);
		border: 1px solid var(--clr-danger-border);
		color: var(--clr-danger);
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
