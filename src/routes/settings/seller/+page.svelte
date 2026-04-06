<script lang="ts">
	import { untrack } from 'svelte';
	import { showError, showSuccess, showInfo } from '$lib/toast.js';
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(untrack(() => JSON.parse(JSON.stringify(data.settings))));

	let saving = $state(false);
	let nipLooking = $state(false);
	let nipLookupError = $state('');

	const sourceLabels: Record<string, string> = {
		gus: 'GUS REGON BIR',
		biala_lista: 'Białej Listy MF',
		vies: 'VIES (UE)'
	};

	async function lookupSellerNip() {
		const nip = settings.seller.nip?.replace(/\D/g, '');
		if (!nip || nip.length !== 10) {
			nipLookupError = 'Wpisz poprawny NIP (10 cyfr, myślniki są dozwolone)';
			return;
		}
		nipLooking = true;
		nipLookupError = '';
		try {
			const res = await fetch(`/api/nip-lookup?nip=${nip}`);
			if (res.ok) {
				const d = await res.json();
				settings.seller.name = d.name ?? settings.seller.name;
				settings.seller.address = d.address ?? settings.seller.address;
				settings.seller.postalCode = d.postalCode ?? settings.seller.postalCode;
				settings.seller.city = d.city ?? settings.seller.city;
				if (d.source) showInfo(`Dane uzupełnione z ${sourceLabels[d.source] ?? d.source}`);
			} else {
				nipLookupError = 'Nie znaleziono firmy o podanym NIP';
			}
		} catch {
			nipLookupError = 'Błąd połączenia';
		} finally {
			nipLooking = false;
		}
	}

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

<h2 class="section-title">Dane Twojej firmy</h2>

<div class="form-grid">
	<div class="form-group">
		<label for="nip">NIP *</label>
		<div class="nip-row">
			<input id="nip" type="text" bind:value={settings.seller.nip} class="inp" placeholder="000-000-00-00" maxlength={13} />
			<button type="button" class="btn btn-secondary" onclick={lookupSellerNip} disabled={nipLooking} title="Pobierz dane z Białej Listy">
				<span class="mdi {nipLooking ? 'mdi-loading mdi-spin' : 'mdi-magnify'}"></span>
				{nipLooking ? 'Szukam...' : 'Pobierz dane'}
			</button>
		</div>
		{#if nipLookupError}
			<p class="field-error">{nipLookupError}</p>
		{/if}
	</div>
	<div class="form-group col-2">
		<label for="name">Nazwa firmy *</label>
		<input id="name" type="text" bind:value={settings.seller.name} class="inp" />
	</div>
	<div class="form-group col-2">
		<label for="address">Ulica i numer *</label>
		<input id="address" type="text" bind:value={settings.seller.address} class="inp" />
	</div>
	<div class="form-group">
		<label for="postalCode">Kod pocztowy</label>
		<input id="postalCode" type="text" bind:value={settings.seller.postalCode} class="inp" placeholder="00-000" />
	</div>
	<div class="form-group">
		<label for="city">Miejscowość</label>
		<input id="city" type="text" bind:value={settings.seller.city} class="inp" />
	</div>
	<div class="form-group col-2">
		<label for="bankAccount">Numer konta bankowego (domyślny)</label>
		<input id="bankAccount" type="text" bind:value={settings.seller.bankAccount} class="inp" placeholder="PL00 0000 0000 0000 0000 0000 0000" />
	</div>
	<div class="form-group">
		<label for="email">E-mail</label>
		<input id="email" type="email" bind:value={settings.seller.email} class="inp" />
	</div>
	<div class="form-group">
		<label for="phone">Telefon</label>
		<input id="phone" type="tel" bind:value={settings.seller.phone} class="inp" />
	</div>
</div>
