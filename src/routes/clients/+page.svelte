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
										disabled={deleting === client.id}
									>
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
		color: #111827;
	}
	.toolbar {
		margin-bottom: 16px;
	}
	.search-box {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 8px 12px;
		max-width: 400px;
	}
	.search-box input {
		border: none;
		outline: none;
		flex: 1;
		font-size: 0.9rem;
	}
	.table-wrap {
		background: #fff;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
		overflow: hidden;
	}
	.table {
		width: 100%;
		border-collapse: collapse;
	}
	.table th {
		background: #f9fafb;
		padding: 12px 16px;
		text-align: left;
		font-size: 0.8rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid #e5e7eb;
	}
	.table td {
		padding: 12px 16px;
		font-size: 0.9rem;
		border-bottom: 1px solid #f3f4f6;
		vertical-align: middle;
	}
	.table tr:last-child td {
		border-bottom: none;
	}
	.mono {
		font-family: monospace;
		color: #4b5563;
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
		color: #9ca3af;
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
		background: #2563eb;
		color: #fff;
	}
	:global(.btn-primary:hover) {
		background: #1d4ed8;
	}
	:global(.btn-outline) {
		background: #fff;
		color: #374151;
		border: 1px solid #d1d5db;
	}
	:global(.btn-outline:hover) {
		background: #f9fafb;
	}
	:global(.btn-danger) {
		background: #fff;
		color: #dc2626;
		border: 1px solid #fca5a5;
	}
	:global(.btn-danger:hover) {
		background: #fef2f2;
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
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fca5a5;
	}
</style>
