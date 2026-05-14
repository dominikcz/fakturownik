<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types.js';
	import type { InvoiceCategory } from '$lib/types.js';

	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
	let formName = $state('');
	let formColor = $state('#2563eb');
	let formSymbol = $state('');
	let saving = $state(false);
	let errorMsg = $state('');

	function startNew() {
		editingId = null;
		formName = '';
		formColor = '#2563eb';
		formSymbol = '';
		errorMsg = '';
		showForm = true;
	}

	function startEdit(cat: InvoiceCategory) {
		editingId = cat.id;
		formName = cat.name;
		formColor = cat.color;
		formSymbol = cat.symbol;
		errorMsg = '';
		showForm = true;
	}

	function cancelForm() {
		showForm = false;
		errorMsg = '';
	}

	let showForm = $state(false);

	let symbolInput = $state<HTMLInputElement | null>(null);

	// Wykryj OS
	const platform = (() => {
		if (typeof navigator === 'undefined') return 'other';
		const ua = navigator.userAgent;
		if (/Win/i.test(ua)) return 'win';
		if (/Mac/i.test(ua)) return 'mac';
		return 'other';
	})();

	async function saveCategory() {
		if (!formName.trim()) { errorMsg = 'Podaj nazwę kategorii'; return; }
		if (!formSymbol.trim()) { errorMsg = 'Podaj symbol (np. emoji lub skrót)'; return; }
		saving = true;
		errorMsg = '';
		try {
			const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
			const method = editingId ? 'PUT' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: formName, color: formColor, symbol: formSymbol })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				errorMsg = err.error ?? 'Błąd zapisu';
				return;
			}
			await invalidateAll();
			showForm = false;
		} finally {
			saving = false;
		}
	}

	async function deleteCategory(id: string, name: string) {
		if (!confirm(`Usunąć kategorię "${name}"? Faktury z tą kategorią nie zostaną usunięte.`)) return;
		const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			alert('Błąd podczas usuwania kategorii.');
			return;
		}
		await invalidateAll();
	}

	// Predefined color palette
	const palette = [
		'#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
		'#0891b2', '#be185d', '#65a30d', '#ea580c', '#6b7280'
	];
</script>

<div class="categories-page">
	<div class="section-header">
		<h2>Kategorie faktur</h2>
		<button class="btn btn-primary" onclick={startNew}>
			<span class="mdi mdi-plus"></span> Nowa kategoria
		</button>
	</div>

	{#if showForm}
		<div class="form-card">
			<h3>{editingId ? 'Edytuj kategorię' : 'Nowa kategoria'}</h3>
			{#if errorMsg}
				<div class="alert alert-error">{errorMsg}</div>
			{/if}
			<div class="form-row">
				<div class="form-group">
					<label for="catSymbol">Symbol</label>
					<input
						id="catSymbol"
						type="text"
						class="inp symbol-inp"
						bind:value={formSymbol}
						bind:this={symbolInput}
						placeholder="🛒"
						maxlength={4}
					/>
				</div>
				<div class="form-group grow">
					<label for="catName">Nazwa kategorii</label>
					<input
						id="catName"
						type="text"
						class="inp"
						bind:value={formName}
						placeholder="np. Usługi IT"
						maxlength={60}
					/>
				</div>
			</div>
			{#if platform !== 'other'}
				<p class="field-hint">
					Emotki możesz wstawić wciskając
					{#if platform === 'win'}
						<kbd>Win</kbd>+<kbd>.</kbd>
					{:else}
						<kbd>⌃⌘</kbd>+<kbd>Space</kbd>
					{/if}
				</p>
			{/if}
			<div class="form-group">
				<label>Kolor</label>
				<div class="color-row">
					{#each palette as c}
						<button
							type="button"
							class="color-dot"
							class:selected={formColor === c}
							style="background:{c}"
							onclick={() => (formColor = c)}
							aria-label={c}
						></button>
					{/each}
					<input type="color" class="color-custom" bind:value={formColor} title="Własny kolor" />
				</div>
			</div>
			<div class="form-actions">
				<button class="btn btn-primary" onclick={saveCategory} disabled={saving}>
					{saving ? 'Zapis...' : 'Zapisz'}
				</button>
				<button class="btn btn-secondary" onclick={cancelForm} disabled={saving}>Anuluj</button>
			</div>
		</div>
	{/if}

	{#if data.categories.length === 0 && !showForm}
		<div class="empty-state">
			<span class="mdi mdi-tag-outline empty-icon"></span>
			<p>Brak kategorii. Dodaj pierwszą, aby przypisywać faktury do kategorii.</p>
		</div>
	{:else}
		<div class="categories-list">
			{#each data.categories as cat}
				<div class="category-row">
					<span class="cat-symbol" style="background:{cat.color}20; color:{cat.color}">{cat.symbol}</span>
					<span class="cat-name">{cat.name}</span>
					<span class="cat-color-dot" style="background:{cat.color}" title={cat.color}></span>
					<div class="cat-actions">
						<button class="btn btn-sm btn-ghost" onclick={() => startEdit(cat)} title="Edytuj">
							<span class="mdi mdi-pencil"></span>
						</button>
						<button class="btn btn-sm btn-ghost danger" onclick={() => deleteCategory(cat.id, cat.name)} title="Usuń">
							<span class="mdi mdi-delete-outline"></span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.categories-page { max-width: 600px; }

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.section-header h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}

	.form-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 24px;
	}
	.form-card h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 16px;
		color: #334155;
	}

	.form-row {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 14px;
	}
	.form-group.grow { flex: 1; }
	.form-group label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #64748b;
	}
	.inp {
		padding: 8px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		font-family: inherit;
		color: #111827;
		background: #fff;
		width: 100%;
		box-sizing: border-box;
	}
	.inp:focus { outline: 2px solid #2563eb; border-color: transparent; }
	.symbol-inp { width: 64px; text-align: center; }

	.field-hint {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: -8px 0 14px;
	}

	kbd {
		display: inline-block;
		padding: 1px 6px;
		font-size: 0.7rem;
		font-family: inherit;
		color: #374151;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-bottom-width: 2px;
		border-radius: 4px;
		line-height: 1.6;
	}

	.color-row {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.color-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition: transform 0.1s;
	}
	.color-dot:hover { transform: scale(1.15); }
	.color-dot.selected { border-color: #fff; box-shadow: 0 0 0 3px currentColor; }
	.color-custom {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid #d1d5db;
		cursor: pointer;
		padding: 0;
		overflow: hidden;
	}

	.form-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.alert-error {
		background: #fee2e2;
		color: #dc2626;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 0.875rem;
		margin-bottom: 12px;
	}

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.category-row {
		display: flex;
		align-items: center;
		gap: 12px;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 10px 14px;
	}
	.cat-symbol {
		font-size: 1.1rem;
		min-width: 36px;
		height: 36px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
	}
	.cat-name {
		flex: 1;
		font-size: 0.95rem;
		font-weight: 500;
		color: #1e293b;
	}
	.cat-color-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
	}
	.cat-actions {
		display: flex;
		gap: 4px;
	}

	.empty-state {
		text-align: center;
		padding: 48px 24px;
		color: #9ca3af;
	}
	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 12px;
	}
	.empty-state p { font-size: 0.95rem; }

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		border: none;
		text-decoration: none;
		transition: background 0.15s;
	}
	.btn:disabled { opacity: 0.6; cursor: not-allowed; }
	.btn-primary { background: #2563eb; color: #fff; }
	.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
	.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
	.btn-secondary:hover:not(:disabled) { background: #e2e8f0; }
	.btn-sm { padding: 5px 8px; font-size: 0.8rem; }
	.btn-ghost { background: transparent; color: #6b7280; }
	.btn-ghost:hover { background: #f3f4f6; color: #374151; }
	.btn-ghost.danger:hover { background: #fee2e2; color: #dc2626; }
</style>
