<script lang="ts">
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(JSON.parse(JSON.stringify(data.settings)));

	let saving = $state(false);
	let successMsg = $state('');
	let errorMsg = $state('');

	const templatePreview = $derived(() => {
		const t = settings.invoiceNumberTemplate;
		const d = new Date();
		const y = d.getFullYear().toString();
		const m = (d.getMonth() + 1).toString();
		const mm = m.padStart(2, '0');
		return t
			.replace(/rrrr/g, y)
			.replace(/mm/g, mm)
			.replace(/m/g, m)
			.replace(/x/g, String(settings.nextInvoiceNumber));
	});

	async function save() {
		saving = true;
		successMsg = '';
		errorMsg = '';
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});
			if (!res.ok) {
				const err = await res.json();
				errorMsg = err.error ?? 'Błąd zapisu';
			} else {
				successMsg = 'Ustawienia zostały zapisane.';
				setTimeout(() => (successMsg = ''), 3000);
			}
		} catch {
			errorMsg = 'Błąd połączenia z serwerem';
		} finally {
			saving = false;
		}
	}
</script>

{#if successMsg}
	<div class="alert alert-success">{successMsg}</div>
{/if}
{#if errorMsg}
	<div class="alert alert-error">{errorMsg}</div>
{/if}

<div class="page-actions">
	<button class="btn btn-primary" onclick={save} disabled={saving}>
		<span class="mdi mdi-content-save"></span>
		{saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
	</button>
</div>

<h2 class="section-title">Numeracja faktur</h2>

<div class="form-group" style="max-width:400px">
	<label for="template">Szablon numeracji</label>
	<input id="template" type="text" bind:value={settings.invoiceNumberTemplate} class="inp" />
	<p class="hint">Tokeny: <code>x</code> = numer, <code>m</code> = miesiąc, <code>mm</code> = miesiąc 2-cyfrowy, <code>rrrr</code> = rok</p>
</div>

<div class="form-group" style="max-width:200px">
	<label for="nextNum">Następny numer sekwencyjny</label>
	<input id="nextNum" type="number" min={1} bind:value={settings.nextInvoiceNumber} class="inp" />
</div>

<div class="preview-box">
	<span class="mdi mdi-eye"></span>
	Podgląd: <strong>{templatePreview()}</strong>
</div>

<h2 class="section-title" style="margin-top:32px">Domyślne ustawienia faktury</h2>

<div class="form-group" style="max-width:200px">
	<label for="paymentDays">Domyślny termin płatności (dni)</label>
	<input id="paymentDays" type="number" min={0} max={365} bind:value={settings.defaultPaymentDays} class="inp" />
	<p class="hint">Termin płatności = data wystawienia + ta liczba dni</p>
</div>
