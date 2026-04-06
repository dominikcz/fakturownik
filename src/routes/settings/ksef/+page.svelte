<script lang="ts">
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(JSON.parse(JSON.stringify(data.settings)));

	let saving = $state(false);
	let successMsg = $state('');
	let errorMsg = $state('');

	// Stan uploadu certyfikatu
	let certFile = $state<File | null>(null);
	let keyFile = $state<File | null>(null);
	let keyPassword = $state('');
	let showPassword = $state(false);
	let uploading = $state(false);
	let uploadMsg = $state('');
	let uploadError = $state('');

	const ksefEnvs = [
		{ value: 'TEST', label: 'TEST (środowisko testowe)' },
		{ value: 'DEMO', label: 'DEMO (środowisko demonstracyjne)' },
		{ value: 'PRD', label: 'PRD (produkcja)' }
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

	async function uploadCerts() {
		if (!certFile || !keyFile) return;
		uploading = true;
		uploadMsg = '';
		uploadError = '';
		try {
			const fd = new FormData();
			fd.append('cert', certFile);
			fd.append('key', keyFile);
			if (keyPassword) fd.append('password', keyPassword);
			const res = await fetch('/api/settings/ksef-certs', { method: 'POST', body: fd });
			const result = await res.json();
			if (!res.ok) {
				uploadError = result.error ?? 'Błąd wgrywania';
			} else {
				uploadMsg = 'Certyfikat i klucz zostały wgrane.';
				settings.ksef.certPem = 'loaded';
				settings.ksef.keyPem = 'loaded';
				certFile = null;
				keyFile = null;
				keyPassword = '';
				setTimeout(() => (uploadMsg = ''), 4000);
			}
		} catch {
			uploadError = 'Błąd połączenia z serwerem';
		} finally {
			uploading = false;
		}
	}

	async function removeCerts() {
		if (!confirm('Usunąć wgrany certyfikat i klucz?')) return;
		const res = await fetch('/api/settings/ksef-certs', { method: 'DELETE' });
		if (res.ok) {
			settings.ksef.certPem = undefined;
			settings.ksef.keyPem = undefined;
		}
	}

	function onCertChange(e: Event) {
		certFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}
	function onKeyChange(e: Event) {
		keyFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}

	const hasCerts = $derived(!!(settings.ksef.certPem || settings.ksef.certPath));
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

<h2 class="section-title">Integracja z KSeF</h2>

<div class="info-box" style="margin-bottom:20px">
	<span class="mdi mdi-information"></span>
	<div>Do autoryzacji w KSeF używany jest NIP z <a href="/settings/seller">danych sprzedawcy</a>.</div>
</div>

<div class="form-group" style="max-width:400px">
	<label for="ksefEnv">Środowisko</label>
	<select id="ksefEnv" bind:value={settings.ksef.environment} class="inp">
		{#each ksefEnvs as env}
			<option value={env.value}>{env.label}</option>
		{/each}
	</select>
</div>

<h2 class="section-title" style="margin-top:28px">Certyfikat KSeF</h2>

<div class="cert-status" class:cert-ok={hasCerts} class:cert-missing={!hasCerts}>
	<span class="mdi {hasCerts ? 'mdi-check-circle' : 'mdi-alert-circle'}"></span>
	{#if hasCerts}
		Certyfikat jest wgrany.
		<button class="btn-link" onclick={removeCerts}>Usuń</button>
	{:else}
		Brak certyfikatu – wgraj pliki poniżej.
	{/if}
</div>

<div class="info-box" style="margin-bottom:16px">
	<span class="mdi mdi-certificate"></span>
	<div>
		Zaloguj się do <a href="https://ksef.podatki.gov.pl" target="_blank" rel="noreferrer">ksef.podatki.gov.pl</a>
		i wygeneruj certyfikat (sekcja „Certyfikaty"). Otrzymasz dwa pliki: <code>cert.crt</code>
		i <code>cert.key</code>. Zaszyfrowany klucz możesz wgrać z hasłem – aplikacja odszyfruje go
		automatycznie.
	</div>
</div>

{#if uploadMsg}
	<div class="alert alert-success" style="margin-bottom:8px">{uploadMsg}</div>
{/if}
{#if uploadError}
	<div class="alert alert-error" style="margin-bottom:8px">{uploadError}</div>
{/if}

<div class="cert-upload-grid">
	<div class="form-group">
		<label for="certFile">Plik certyfikatu (<code>.crt</code> / <code>.pem</code>)</label>
		<input id="certFile" type="file" accept=".crt,.pem,.cer" onchange={onCertChange} class="inp inp-file" />
		{#if certFile}<span class="file-name">{certFile.name}</span>{/if}
	</div>

	<div class="form-group">
		<label for="keyFile">Plik klucza prywatnego (<code>.key</code> / <code>.pem</code>)</label>
		<input id="keyFile" type="file" accept=".key,.pem" onchange={onKeyChange} class="inp inp-file" />
		{#if keyFile}<span class="file-name">{keyFile.name}</span>{/if}
	</div>

	<div class="form-group">
		<label for="keyPassword">Hasło do klucza (jeśli zaszyfrowany)</label>
		<div class="password-wrap">
			<input id="keyPassword" type={showPassword ? 'text' : 'password'} bind:value={keyPassword} class="inp" placeholder="Pozostaw puste jeśli klucz nie ma hasła" autocomplete="off" />
			<button type="button" class="toggle-pw" onclick={() => (showPassword = !showPassword)} title={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}>
				<span class="mdi {showPassword ? 'mdi-eye-off' : 'mdi-eye'}"></span>
			</button>
		</div>
	</div>

	<div class="form-group upload-action">
		<button
			class="btn btn-primary"
			onclick={uploadCerts}
			disabled={uploading || !certFile || !keyFile}
		>
			<span class="mdi mdi-upload"></span>
			{uploading ? 'Wgrywanie...' : 'Wgraj certyfikat i klucz'}
		</button>
	</div>
</div>

<style>
	.cert-status {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 6px;
		font-weight: 500;
		margin-bottom: 16px;
	}
	.cert-ok {
		background: #d1fae5;
		color: #065f46;
	}
	.cert-missing {
		background: #fef3c7;
		color: #92400e;
	}
	.btn-link {
		background: none;
		border: none;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
		padding: 0 4px;
		font-size: inherit;
	}
	.cert-upload-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 24px;
		max-width: 760px;
	}
	.upload-action {
		grid-column: 1 / -1;
		display: flex;
		align-items: flex-end;
	}
	.inp-file {
		padding: 6px;
	}
	.file-name {
		font-size: 0.8em;
		color: #555;
		margin-top: 2px;
		display: block;
	}
	.password-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.password-wrap .inp {
		flex: 1;
		padding-right: 38px;
	}
	.toggle-pw {
		position: absolute;
		right: 6px;
		background: none;
		border: none;
		cursor: pointer;
		color: #666;
		padding: 4px;
		line-height: 1;
		font-size: 1.1rem;
	}
	.toggle-pw:hover {
		color: #333;
	}
</style>
