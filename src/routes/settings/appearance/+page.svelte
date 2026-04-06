<script lang="ts">
	import { untrack } from 'svelte';
	import { showError, showSuccess } from '$lib/toast.js';
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(untrack(() => JSON.parse(JSON.stringify(data.settings))));

	let saving = $state(false);
	let logoUploading = $state(false);

	const fonts = [
		'Trebuchet MS',
		'Arial',
		'Calibri',
		'Georgia',
		'Times New Roman',
		'Verdana',
		'Tahoma'
	];

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

	async function uploadLogo(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		logoUploading = true;
		try {
			const formData = new FormData();
			formData.append('logo', file);
			const res = await fetch('/api/settings/logo', { method: 'POST', body: formData });
			if (res.ok) {
				const body = await res.json();
				settings.seller.logo = body.logo;
				showSuccess('Logo zostało przesłane.');
			} else {
				showError('Błąd przesyłania logo');
			}
		} catch {
			showError('Błąd przesyłania logo');
		} finally {
			logoUploading = false;
		}
	}

	function removeLogo() {
		settings.seller.logo = undefined;
	}
</script>

<div class="page-actions">
	<button class="btn btn-primary" onclick={save} disabled={saving}>
		<span class="mdi mdi-content-save"></span>
		{saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
	</button>
</div>

<h2 class="section-title">Wygląd faktur</h2>

<div class="form-group" style="max-width: 300px">
	<label for="font">Czcionka</label>
	<select id="font" bind:value={settings.defaultFont} class="inp">
		{#each fonts as f}
			<option value={f} style="font-family: {f}">{f}</option>
		{/each}
	</select>
</div>

<div class="form-group font-preview" style="font-family: {settings.defaultFont}, sans-serif">
	Podgląd czcionki: Faktura nr 1/4/2026
</div>

<div class="form-group" style="margin-top: 16px">
	<label class="checkbox-label">
		<input type="checkbox" bind:checked={settings.invoiceZebraStripes} />
		Naprzemienne tło wierszy pozycji (zebra)
	</label>
</div>

<div class="form-group" style="margin-top:24px">
	<p class="form-label">Logo firmy</p>
	{#if settings.seller.logo}
		<div class="logo-preview">
			<img src={settings.seller.logo} alt="Logo firmy" />
			<button class="btn btn-sm btn-danger" onclick={removeLogo}>
				<span class="mdi mdi-delete"></span> Usuń logo
			</button>
		</div>
	{:else}
		<p class="hint">Brak logo. Prześlij plik PNG/JPG (max 2 MB).</p>
	{/if}
	<label class="file-upload-btn">
		<span class="mdi mdi-upload"></span>
		{logoUploading ? 'Przesyłanie...' : 'Prześlij logo'}
		<input type="file" accept="image/*" onchange={uploadLogo} disabled={logoUploading} hidden />
	</label>
</div>

<style>
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		color: #374151;
		cursor: pointer;
	}
	.form-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 6px;
	}
</style>
