<script lang="ts">
	import { untrack } from 'svelte';
	import { showError, showSuccess } from '$lib/toast.js';
	import { INVOICE_TEMPLATES } from '$lib/invoiceTemplates.js';
	import type { Settings } from '$lib/types.js';

	let { data }: { data: { settings: Settings } } = $props();
	let settings = $state<Settings>(untrack(() => JSON.parse(JSON.stringify(data.settings))));

	let saving = $state(false);
	let logoUploading = $state(false);

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

<div class="form-group">
	<p class="form-field-label">Szablon faktury</p>
	<div class="template-grid">
		{#each Object.entries(INVOICE_TEMPLATES) as [id, tpl]}
			<button
				type="button"
				class="template-card {settings.invoiceTemplate === id ? 'selected' : ''}"
				onclick={() => (settings.invoiceTemplate = id)}
			>
				<!-- Mini podgląd układu bloków -->
				<div class="template-preview">
					{#if tpl.layout === 'modern'}
						<!-- Nowoczesny: lewa meta + prawa logo -->
						<div class="tp-modern-header">
							<div class="tp-modern-left">
								<div class="tp-line" style="width:60%; background:#94a3b8"></div>
								<div class="tp-line" style="width:40%; background:#1e293b"></div>
							</div>
							<div class="tp-modern-logo" style="background:{tpl.accent}"></div>
						</div>
						<div class="tp-sep" style="border-color:{tpl.headerBorder}"></div>
						<div class="tp-parties-flat">
							<div class="tp-party"></div>
							<div class="tp-party"></div>
						</div>
						<div class="tp-th" style="background:{tpl.thBg}; height:6px"></div>
						<div class="tp-trows">
							<div class="tp-trow"></div>
							<div class="tp-trow" style="background:{tpl.metaBg}"></div>
						</div>
						<div class="tp-bar" style="background:{tpl.footerBg}"></div>
						<div class="tp-footer-2col">
							<div class="tp-footer-l">
								<div class="tp-line" style="width:80%; background:#94a3b8"></div>
								<div class="tp-line" style="width:60%; background:#1e293b"></div>
							</div>
							<div class="tp-footer-r" style="border-color:{tpl.accent}">
								<div class="tp-line" style="width:60%; background:{tpl.accent}; height:5px"></div>
							</div>
						</div>
					{:else}
						<!-- Klasyczny / Elegancki: logo+tytuł na górze -->
						<div class="tp-header" style="border-bottom: 2px solid {tpl.headerBorder}">
							<div class="tp-line" style="width:40%; background:#94a3b8"></div>
							<div class="tp-line" style="width:30%; background:{tpl.accent}; height:5px"></div>
						</div>
						<div class="tp-meta-strip" style="background:{tpl.metaBg}"></div>
						<div class="tp-parties-boxed">
							<div class="tp-party-box" style="border-color:{tpl.accent}20"></div>
							<div class="tp-party-box" style="border-color:{tpl.accent}20"></div>
						</div>
						<div class="tp-th" style="background:{tpl.thBg}; height:7px"></div>
						<div class="tp-trows">
							<div class="tp-trow"></div>
							<div class="tp-trow" style="background:{tpl.metaBg}"></div>
							<div class="tp-trow"></div>
						</div>
						<div class="tp-razem" style="border-top: 2px solid {tpl.footerBorder}; background:{tpl.footerBg}"></div>
						<div class="tp-box-right" style="border-color:{tpl.accent}; color:{tpl.accent}">PLN</div>
					{/if}
				</div>
				<div class="template-name">{tpl.label}</div>
				<div class="template-font">{tpl.font}</div>
			</button>
		{/each}
	</div>
</div>

<div class="form-group" style="margin-top: 16px">
	<label class="checkbox-label">
		<input type="checkbox" bind:checked={settings.invoiceZebraStripes} />
		Naprzemienne tło wierszy pozycji (zebra)
	</label>
</div>

<div class="form-group" style="margin-top: 8px">
	<label class="checkbox-label">
		<input type="checkbox" bind:checked={settings.showItemColumns} />
		Pokaż kolumny: Ilość, Jednostka, Cena jednostkowa
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
	.template-grid {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}

	.template-card {
		background: #fff;
		border: 2px solid #e2e8f0;
		border-radius: 10px;
		padding: 10px;
		cursor: pointer;
		width: 140px;
		text-align: center;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.template-card:hover { border-color: #94a3b8; }
	.template-card.selected {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px #2563eb30;
	}

	.template-preview {
		width: 100%;
		height: 110px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		padding: 6px;
		margin-bottom: 6px;
		box-sizing: border-box;
		overflow: hidden;
	}

	/* Shared atoms */
	.tp-line {
		height: 4px;
		border-radius: 2px;
		margin-bottom: 2px;
	}
	.tp-sep {
		border-bottom-width: 2px;
		border-bottom-style: solid;
		margin: 1px 0;
	}
	.tp-th {
		border-radius: 2px;
		height: 7px;
	}
	.tp-trows {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.tp-trow {
		height: 5px;
		background: #f1f5f9;
		border-radius: 1px;
	}
	.tp-bar {
		height: 8px;
		border-radius: 2px;
	}
	.tp-razem {
		height: 8px;
		border-radius: 2px;
	}

	/* Default layout thumbnails */
	.tp-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding-bottom: 3px;
		height: 16px;
		gap: 4px;
	}
	.tp-meta-strip {
		height: 8px;
		border-radius: 2px;
		margin-bottom: 2px;
	}
	.tp-parties-boxed {
		display: flex;
		gap: 3px;
		height: 14px;
		margin-bottom: 2px;
	}
	.tp-party-box {
		flex: 1;
		border: 1px solid #e2e8f0;
		border-radius: 2px;
	}
	.tp-box-right {
		align-self: flex-end;
		font-size: 6px;
		font-weight: 700;
		padding: 1px 4px;
		border: 1px solid;
		border-radius: 2px;
		margin-top: 2px;
	}

	/* Modern layout thumbnails */
	.tp-modern-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		height: 18px;
		margin-bottom: 2px;
	}
	.tp-modern-left {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.tp-modern-logo {
		width: 24px;
		height: 14px;
		border-radius: 2px;
	}
	.tp-parties-flat {
		display: flex;
		gap: 4px;
		height: 12px;
		margin-bottom: 2px;
	}
	.tp-party {
		flex: 1;
		background: #f1f5f9;
		border-radius: 1px;
	}
	.tp-footer-2col {
		display: flex;
		gap: 3px;
		height: 16px;
		margin-top: 2px;
	}
	.tp-footer-l {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		justify-content: center;
	}
	.tp-footer-r {
		width: 40px;
		border: 1px solid;
		border-radius: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
	}

	/* Labels */
	.template-name {
		font-size: 0.8rem;
		color: #1e293b;
		font-weight: 600;
		margin-top: 2px;
	}

	.template-font {
		font-size: 0.7rem;
		color: #94a3b8;
		margin-top: 1px;
	}

	.form-field-label {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 10px;
	}
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
