<script lang="ts">
	import { untrack } from 'svelte';
	import { showError, showSuccess } from '$lib/toast.js';
	import type { Settings, NipLookupSource } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(untrack(() => JSON.parse(JSON.stringify(data.settings))));

	let saving = $state(false);

	const sourceInfo: Record<NipLookupSource, { label: string; desc: string; icon: string }> = {
		gus: { label: 'GUS REGON BIR', desc: 'Wymaga klucza API', icon: 'mdi-database-search' },
		biala_lista: { label: 'Biała Lista MF', desc: 'Bez klucza, publiczne API', icon: 'mdi-format-list-checks' },
		vies: { label: 'VIES (UE)', desc: 'Europejski rejestr VAT', icon: 'mdi-earth' }
	};

	async function save() {
		saving = true;
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});
			if (!res.ok) {
				const err = await res.json();
				showError(err.error ?? 'Błąd zapisu');
			} else {
				showSuccess('Ustawienia zostały zapisane.');
			}
		} catch {
			showError('Błąd połączenia z serwerem');
		} finally {
			saving = false;
		}
	}
</script>

<div class="page-actions">
	<button class="btn btn-primary" onclick={save} disabled={saving}>
		<span class="mdi mdi-content-save"></span>
		{saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
	</button>
</div>

<h2 class="section-title">GUS REGON BIR – klucz API</h2>

<div class="form-group" style="max-width:500px">
	<label for="regonApiKey">Klucz API GUS REGON BIR</label>
	<input id="regonApiKey" type="text" bind:value={settings.regonApiKey} class="inp" placeholder="Zostaw puste aby pominąć REGON" />
	<p class="hint">
		Darmowy klucz po rejestracji na
		<a href="https://api.stat.gov.pl" target="_blank" rel="noreferrer">api.stat.gov.pl</a>.
		Zwraca nazwę firmy (dla JDG: pełną nazwę działalności) i adres siedziby.
	</p>
</div>

<h2 class="section-title" style="margin-top:32px">Kolejność źródeł wyszukiwania NIP</h2>
<p class="hint" style="margin-bottom:12px">Użyj strzałek, aby ustawić kolejność. Pierwsze źródło, które zwróci dane, zostanie użyte.</p>

<div class="order-list">
	{#each settings.nipLookupOrder as source, i (source)}
		<div class="order-item">
			<span class="order-num">{i + 1}</span>
			<span class="mdi {sourceInfo[source].icon} order-icon"></span>
			<div class="order-text">
				<strong>{sourceInfo[source].label}</strong>
				<span class="hint">{sourceInfo[source].desc}</span>
			</div>
			<div class="order-btns">
				<button
					type="button"
					class="btn btn-sm btn-secondary"
					disabled={i === 0}
					onclick={() => {
						const arr = [...settings.nipLookupOrder];
						[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
						settings.nipLookupOrder = arr;
					}}
					title="Przesuń wyżej"
				><span class="mdi mdi-chevron-up"></span></button>
				<button
					type="button"
					class="btn btn-sm btn-secondary"
					disabled={i === settings.nipLookupOrder.length - 1}
					onclick={() => {
						const arr = [...settings.nipLookupOrder];
						[arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
						settings.nipLookupOrder = arr;
					}}
					title="Przesuń niżej"
				><span class="mdi mdi-chevron-down"></span></button>
			</div>
		</div>
	{/each}
</div>
