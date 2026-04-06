<script lang="ts">
	import ClientForm from '$lib/components/ClientForm.svelte';
	import { goto } from '$app/navigation';

	let saving = $state(false);
	let errorMsg = $state('');

	async function handleSave(clientData: object) {
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/clients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(clientData)
			});
			if (!res.ok) {
				const err = await res.json();
				errorMsg = err.error ?? 'Błąd zapisu';
				return;
			}
			await goto('/clients');
		} catch {
			errorMsg = 'Błąd połączenia z serwerem';
		} finally {
			saving = false;
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/clients">Kontrahenci</a>
			<span class="mdi mdi-chevron-right"></span>
			<span>Nowy</span>
		</div>
		<h1 class="page-title">Nowy kontrahent</h1>
	</div>

	<ClientForm onSave={handleSave} saving={saving} error={errorMsg} />
</div>

<style>
	.page { max-width: 800px; }
	.page-header { margin-bottom: 24px; }
	.breadcrumb {
		display: flex; align-items: center; gap: 4px;
		font-size: 0.85rem; color: #64748b; margin-bottom: 8px;
	}
	.breadcrumb a { color: #2563eb; }
	.page-title { font-size: 1.5rem; font-weight: 700; color: #111827; }
</style>
