<script lang="ts">
	import type { Client } from '$lib/types.js';
	import NipLookup from './NipLookup.svelte';
	import type { NipLookupResult } from '$lib/types.js';

	interface Props {
		client?: Partial<Client>;
		onSave: (client: Omit<Client, 'id'>) => void;
		saving?: boolean;
		error?: string;
	}

	import { untrack } from 'svelte';

	let { client = {}, onSave, saving = false, error = '' }: Props = $props();

	let nip = $state(untrack(() => client.nip ?? ''));
	let name = $state(untrack(() => client.name ?? ''));
	let address = $state(untrack(() => client.address ?? ''));
	let city = $state(untrack(() => client.city ?? ''));
	let postalCode = $state(untrack(() => client.postalCode ?? ''));
	let country = $state(untrack(() => client.country ?? 'PL'));
	let email = $state(untrack(() => client.email ?? ''));
	let phone = $state(untrack(() => client.phone ?? ''));
	let nipEu = $state(untrack(() => client.nipEu ?? ''));

	function onNipResult(result: NipLookupResult) {
		// nip celowo nie jest nadpisywany – zachowujemy format wpisany przez użytkownika
		name = result.name;
		address = result.address;
		city = result.city;
		postalCode = result.postalCode;
		country = result.country;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSave({ nip, name, address, city, postalCode, country, email: email || undefined, phone: phone || undefined, nipEu: nipEu || undefined });
	}
</script>

<form class="form" onsubmit={handleSubmit}>
	{#if error}
		<div class="alert alert-error">{error}</div>
	{/if}

	<fieldset class="fieldset">
		<legend>Dane podstawowe</legend>

		<div class="form-group">
			<label for="nip">NIP</label>
			<NipLookup bind:nip onResult={onNipResult} />
		</div>

		<div class="form-group">
			<label for="name">Nazwa firmy *</label>
			<input id="name" type="text" bind:value={name} required class="inp" />
		</div>

		<div class="form-group">
			<label for="address">Ulica i numer *</label>
			<input id="address" type="text" bind:value={address} required class="inp" />
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="postalCode">Kod pocztowy *</label>
				<input id="postalCode" type="text" bind:value={postalCode} required class="inp" placeholder="00-000" />
			</div>
			<div class="form-group flex-1">
				<label for="city">Miejscowość *</label>
				<input id="city" type="text" bind:value={city} required class="inp" />
			</div>
		</div>

		<div class="form-group">
			<label for="country">Kraj</label>
			<input id="country" type="text" bind:value={country} class="inp" placeholder="PL" maxlength={2} />
		</div>
	</fieldset>

	<fieldset class="fieldset">
		<legend>Dane kontaktowe (opcjonalne)</legend>

		<div class="form-row">
			<div class="form-group flex-1">
				<label for="email">E-mail</label>
				<input id="email" type="email" bind:value={email} class="inp" />
			</div>
			<div class="form-group flex-1">
				<label for="phone">Telefon</label>
				<input id="phone" type="tel" bind:value={phone} class="inp" />
			</div>
		</div>

		<div class="form-group">
			<label for="nipEu">NIP EU (dla transakcji UE)</label>
			<input id="nipEu" type="text" bind:value={nipEu} class="inp" placeholder="np. PL1234567890" />
		</div>
	</fieldset>

	<div class="form-actions">
		<a href="/clients" class="btn btn-ghost">Anuluj</a>
		<button type="submit" class="btn btn-primary" disabled={saving}>
			{#if saving}
				<span class="mdi mdi-loading spin"></span>
			{/if}
			Zapisz kontrahenta
		</button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.fieldset {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 16px;
		background: #fff;
	}

	.fieldset legend {
		font-size: 0.85rem;
		font-weight: 600;
		color: #64748b;
		padding: 0 6px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 12px;
	}

	.form-row {
		display: flex;
		gap: 12px;
		margin-top: 12px;
	}

	.form-row .form-group {
		margin-top: 0;
		flex: 1;
	}

	.flex-1 {
		flex: 1;
	}

	label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #374151;
	}

	.inp {
		padding: 8px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
	}

	.inp:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 2px #2563eb20;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 20px;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s;
	}

	.btn-primary {
		background: #2563eb;
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-ghost {
		background: transparent;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-ghost:hover {
		background: #f8fafc;
	}

	.alert-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.spin { animation: spin 0.8s linear infinite; }
</style>
