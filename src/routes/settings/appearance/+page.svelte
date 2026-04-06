<script lang="ts">
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(JSON.parse(JSON.stringify(data.settings)));

	let saving = $state(false);
	let successMsg = $state('');
	let errorMsg = $state('');
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
				successMsg = 'Logo zostało przesłane.';
				setTimeout(() => (successMsg = ''), 3000);
			} else {
				errorMsg = 'Błąd przesyłania logo';
			}
		} catch {
			errorMsg = 'Błąd przesyłania logo';
		} finally {
			logoUploading = false;
		}
	}

	function removeLogo() {
		settings.seller.logo = undefined;
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
	Podgląd czcionki: Faktura VAT nr 1/4/2026
</div>

<div class="form-group" style="margin-top:24px">
	<label>Logo firmy</label>
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
