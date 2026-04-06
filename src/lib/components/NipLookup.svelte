<script lang="ts">
	import type { NipLookupResult } from '$lib/types.js';

	interface Props {
		nip: string;
		onResult: (result: NipLookupResult) => void;
	}

	let { nip = $bindable(), onResult }: Props = $props();

	let loading = $state(false);
	let error = $state('');
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	const sourceLabels: Record<string, string> = {
		gus: 'GUS REGON BIR',
		biala_lista: 'Białej Listy MF',
		vies: 'VIES (UE)'
	};

	function showToast(msg: string) {
		toast = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 4000);
	}

	async function lookup() {
		const clean = nip.replace(/\D/g, '');
		if (clean.length !== 10) {
			error = 'NIP musi mieć 10 cyfr (myślniki są dozwolone)';
			return;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/nip-lookup?nip=${clean}`);
			if (!res.ok) {
				const data = await res.json();
				error = data.error ?? 'Błąd wyszukiwania';
				return;
			}
			const result: NipLookupResult = await res.json();
			showToast(`Dane uzupełnione z ${sourceLabels[result.source] ?? result.source}`);
			onResult(result);
		} catch {
			error = 'Błąd połączenia z serwerem';
		} finally {
			loading = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			lookup();
		}
	}
</script>

<div class="nip-lookup">
	<div class="field-row">
		<div class="input-group">
			<input
				type="text"
				placeholder="000-000-00-00"
				bind:value={nip}
				onkeydown={onKeydown}
				maxlength={13}
				class="inp"
			/>
			<button type="button" class="lookup-btn" onclick={lookup} disabled={loading}>
				{#if loading}
					<span class="mdi mdi-loading spin"></span>
				{:else}
					<span class="mdi mdi-magnify"></span>
				{/if}
				Szukaj
			</button>
		</div>
	</div>
	{#if error}
		<p class="error">{error}</p>
	{/if}
	{#if toast}
		<p class="toast"><span class="mdi mdi-check-circle"></span> {toast}</p>
	{/if}
</div>

<style>
	.nip-lookup {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field-row {
		display: flex;
		gap: 8px;
	}

	.input-group {
		display: flex;
		gap: 8px;
		flex: 1;
	}

	.inp {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.inp:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 2px #2563eb20;
	}

	.lookup-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #2563eb;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s;
	}

	.lookup-btn:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.lookup-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: #dc2626;
		font-size: 0.8rem;
	}
	.toast {
		display: flex; align-items: center; gap: 6px;
		color: #15803d; font-size: 0.8rem;
		animation: fadeIn 0.2s ease;
	}
	@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.spin {
		animation: spin 0.8s linear infinite;
	}
</style>
