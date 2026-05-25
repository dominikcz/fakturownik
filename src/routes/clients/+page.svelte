<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let deleting = $state<string | null>(null);
	let errorMsg = $state('');

	const filtered = $derived(
		data.clients.filter(
			(c) =>
				!search ||
				c.name.toLowerCase().includes(search.toLowerCase()) ||
				c.nip.includes(search)
		)
	);

	async function deleteClient(id: string, name: string) {
		if (!confirm(`Czy na pewno usunąć kontrahenta "${name}"?`)) return;
		deleting = id;
		errorMsg = '';
		try {
			const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = await res.json();
				errorMsg = err.error ?? 'Błąd usuwania';
			} else {
				// odśwież stronę
				location.reload();
			}
		} catch {
			errorMsg = 'Błąd połączenia';
		} finally {
			deleting = null;
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Kontrahenci</h1>
		<a href="/clients/new" class="btn btn-primary">
			<span class="mdi mdi-plus"></span> Dodaj kontrahenta
		</a>
	</div>

	{#if errorMsg}
		<div class="alert alert-error">{errorMsg}</div>
	{/if}

	<div class="toolbar">
		<div class="search-box">
			<span class="mdi mdi-magnify"></span>
			<input type="text" placeholder="Szukaj po nazwie lub NIP..." bind:value={search} />
		</div>
	</div>

	{#if filtered.length === 0}
		<div class="empty-state">
			<span class="mdi mdi-account-group empty-icon"></span>
			{#if data.clients.length === 0}
				<p>Brak kontrahentów. <a href="/clients/new">Dodaj pierwszego</a>.</p>
			{:else}
				<p>Brak wyników dla podanego wyszukiwania.</p>
			{/if}
		</div>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>NIP</th>
						<th>Nazwa</th>
						<th>Adres</th>
						<th>Kraj</th>
						<th>Akcje</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as client}
						<tr>
							<td class="mono">{client.nip}</td>
							<td class="name-cell">{client.name}</td>
							<td>{client.address}, {client.postalCode} {client.city}</td>
							<td>{client.country}</td>
							<td>
								<div class="actions">
									<a href="/clients/{client.id}/edit" class="btn btn-sm btn-outline">
										<span class="mdi mdi-pencil"></span> Edytuj
									</a>
									<button
										class="btn btn-sm btn-danger"
										onclick={() => deleteClient(client.id, client.name)}
										disabled={deleting === client.id}									title="Usuń kontrahenta"									>
										<span class="mdi mdi-delete"></span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 1100px;
	}
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}
	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--clr-text);
	}
	.toolbar {
		margin-bottom: 16px;
	}
	.search-box {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--clr-surface);
		border: 1px solid var(--clr-border-input);
		border-radius: 6px;
		padding: 8px 12px;
		max-width: 400px;
	}
	.search-box input {
		border: none;
		outline: none;
		flex: 1;
		font-size: 0.9rem;
		background: transparent;
		color: var(--clr-text);
	}
	.table-wrap {
		background: var(--clr-surface);
		border-radius: 8px;
		border: 1px solid var(--clr-border);
		overflow: hidden;
	}
	.table {
		width: 100%;
		border-collapse: collapse;
	}
	.table th {
		background: var(--clr-surface-alt);
		padding: 12px 16px;
		text-align: left;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--clr-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--clr-border);
	}
	.table td {
		padding: 12px 16px;
		font-size: 0.9rem;
		border-bottom: 1px solid var(--clr-bg);
		vertical-align: middle;
		color: var(--clr-text);
	}
	.table tr:last-child td {
		border-bottom: none;
	}
	.mono {
		font-family: monospace;
		color: var(--clr-text-mono);
	}
	.name-cell {
		font-weight: 500;
	}
	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.empty-state {
		text-align: center;
		padding: 60px 20px;
		color: var(--clr-text-faint);
	}
	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 12px;
	}
	:global(.btn) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s;
	}
	:global(.btn-primary) {
		background: var(--clr-primary);
		color: #fff;
	}
	:global(.btn-primary:hover) {
		background: var(--clr-primary-hover);
	}
	:global(.btn-outline) {
		background: var(--clr-surface);
		color: var(--clr-text-2);
		border: 1px solid var(--clr-border-input);
	}
	:global(.btn-outline:hover) {
		background: var(--clr-surface-alt);
	}
	:global(.btn-danger) {
		background: var(--clr-surface);
		color: var(--clr-danger);
		border: 1px solid var(--clr-danger-border);
	}
	:global(.btn-danger:hover) {
		background: var(--clr-danger-bg);
	}
	:global(.btn-sm) {
		padding: 5px 10px;
		font-size: 0.8rem;
	}
	.alert {
		padding: 12px 16px;
		border-radius: 6px;
		margin-bottom: 12px;
		font-size: 0.9rem;
	}
	:global(.alert-error) {
		background: var(--clr-danger-bg);
		color: var(--clr-danger);
		border: 1px solid var(--clr-danger-border);
	}
</style>
