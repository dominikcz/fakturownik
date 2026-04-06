<script lang="ts">
	import { untrack } from 'svelte';
	import { showError, showSuccess } from '$lib/toast.js';
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(untrack(() => JSON.parse(JSON.stringify(data.settings))));

	let certTab = $state<'TEST' | 'DEMO' | 'PRD'>('TEST');

	let saving = $state(false);

	// Stan uploadu certyfikatu
	let certFile = $state<File | null>(null);
	let keyFile = $state<File | null>(null);
	let keyPassword = $state('');
	let showPassword = $state(false);
	let uploading = $state(false);

	const ksefEnvs = [
		{ value: 'TEST', label: 'TEST (środowisko testowe)' },
		{ value: 'DEMO', label: 'DEMO (środowisko demonstracyjne)' },
		{ value: 'PRD', label: 'PRD (produkcja)' }
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

	async function uploadCerts() {
		if (!certFile || !keyFile) return;
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('cert', certFile);
			fd.append('key', keyFile);
			fd.append('environment', certTab);
			if (keyPassword) fd.append('password', keyPassword);
			const res = await fetch('/api/settings/ksef-certs', { method: 'POST', body: fd });
			const result = await res.json();
			if (!res.ok) {
				showError(result.error ?? 'Błąd wgrywania');
			} else {
				showSuccess('Certyfikat i klucz zostały wgrane.');
				settings.ksef.certs ??= {};
				settings.ksef.certs[certTab] = { certPem: 'loaded', keyPem: 'loaded', certFileName: certFile.name };
				certFile = null;
				keyFile = null;
				keyPassword = '';
			}
		} catch {
			showError('Błąd połączenia z serwerem');
		} finally {
			uploading = false;
		}
	}

	async function removeCerts() {
		if (!confirm('Usunąć wgrany certyfikat i klucz?')) return;
		const res = await fetch(`/api/settings/ksef-certs?environment=${certTab}`, { method: 'DELETE' });
		if (res.ok) {
			if (settings.ksef.certs) {
				delete settings.ksef.certs[certTab];
				settings.ksef.certs = { ...settings.ksef.certs };
			}
			// Wyczyść też legacy pola jeśli środowisko się zgadza
			if (certTab === settings.ksef.environment) {
				delete settings.ksef.certPem;
				delete settings.ksef.keyPem;
				delete settings.ksef.certPath;
				delete settings.ksef.keyPath;
			}
		}
	}

	function onCertChange(e: Event) {
		certFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}
	function onKeyChange(e: Event) {
		keyFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}

	function hasEnvCerts(env: 'TEST' | 'DEMO' | 'PRD') {
		return !!(settings.ksef.certs?.[env]?.certPem || (env === settings.ksef.environment && (settings.ksef.certPem || settings.ksef.certPath)));
	}
</script>

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

<div class="env-tabs">
	{#each ['TEST', 'DEMO', 'PRD'] as env}
		<button
			type="button"
			class="env-tab {certTab === env ? 'active' : ''}"
			onclick={() => { certTab = env as 'TEST' | 'DEMO' | 'PRD'; certFile = null; keyFile = null; keyPassword = ''; }}
		>{env}{#if env === settings.ksef.environment}<span class="env-tab-active-dot" title="aktywne środowisko"></span>{/if}</button>
	{/each}
</div>

<div class="cert-status" class:cert-ok={hasEnvCerts(certTab)} class:cert-missing={!hasEnvCerts(certTab)}>
	<span class="mdi {hasEnvCerts(certTab) ? 'mdi-check-circle' : 'mdi-alert-circle'}"></span>
	{#if hasEnvCerts(certTab)}
		Certyfikat ({certTab}) jest wgrany.
		{#if settings.ksef.certs?.[certTab]?.certFileName}
			<span class="cert-filename">{settings.ksef.certs?.[certTab]?.certFileName}</span>
		{/if}
		<button class="btn-link" onclick={removeCerts}>Usuń</button>
	{:else}
		Brak certyfikatu ({certTab}) – wgraj pliki poniżej.
	{/if}
</div>

<div class="info-box" style="margin-bottom:16px">
	<span class="mdi mdi-certificate"></span>
	<div>
		{#if certTab === 'TEST'}
			Zaloguj się do <a class="info-link" href="https://ap-test.ksef.mf.gov.pl/" target="_blank" rel="noreferrer">ap-test.ksef.mf.gov.pl</a>
			i wygeneruj certyfikat (sekcja „Certyfikaty").
		{:else if certTab === 'DEMO'}
			Zaloguj się do <a class="info-link" href="https://ap-demo.ksef.mf.gov.pl/" target="_blank" rel="noreferrer">ap-demo.ksef.mf.gov.pl</a>
			i wygeneruj certyfikat (sekcja „Certyfikaty").
		{:else}
			Zaloguj się do <a class="info-link" href="https://ap.ksef.mf.gov.pl/" target="_blank" rel="noreferrer">ap.ksef.mf.gov.pl</a>
			i wygeneruj certyfikat (sekcja „Certyfikaty").
		{/if}
		Otrzymasz dwa pliki: <code>cert.crt</code> i <code>cert.key</code>.
		Zaszyfrowany klucz możesz wgrać z hasłem – aplikacja odszyfruje go automatycznie.
	</div>
</div>

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
			{uploading ? 'Wgrywanie...' : `Wgraj certyfikat i klucz (${certTab})`}
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
	.cert-filename {
		font-size: 0.85em;
		font-weight: 400;
		opacity: 0.8;
		font-family: monospace;
		margin-left: 4px;
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
	.env-tabs {
		display: flex;
		gap: 0;
		margin-bottom: 1rem;
		border-bottom: 2px solid #dee2e6;
	}
	.env-tab {
		padding: 0.5rem 1.25rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.9rem;
		color: #6c757d;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		transition: color 0.15s;
	}
	.env-tab:hover { color: #333; }
	.env-tab.active {
		color: #0d6efd;
		border-bottom-color: #0d6efd;
		font-weight: 500;
	}
	.env-tab-active-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		margin-left: 5px;
		vertical-align: middle;
		margin-bottom: 1px;
	}
	:global(.info-box a.info-link) {
		color: #0d47a1;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	:global(.info-box a.info-link:hover) {
		color: #1565c0;
		text-decoration-thickness: 2px;
	}
</style>
