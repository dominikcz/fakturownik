<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const tabs = [
		{ href: '/settings/seller', label: 'Dane sprzedawcy', icon: 'mdi-domain' },
		{ href: '/settings/invoicing', label: 'Wystawianie faktur', icon: 'mdi-file-document' },
		{ href: '/settings/ksef', label: 'KSeF', icon: 'mdi-cloud-upload' },
		{ href: '/settings/gus', label: 'GUS REGON', icon: 'mdi-database-search' },
		{ href: '/settings/appearance', label: 'Wygląd', icon: 'mdi-palette' }
	];
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Ustawienia</h1>
	</div>

	<nav class="settings-nav">
		{#each tabs as tab}
			<a href={tab.href} class="settings-tab" class:active={$page.url.pathname === tab.href}>
				<span class="mdi {tab.icon}"></span>
				{tab.label}
			</a>
		{/each}
	</nav>

	<div class="settings-content">
		{@render children()}
	</div>
</div>

<style>
	.page { max-width: 900px; }
	.page-header {
		display: flex; justify-content: space-between;
		align-items: center; margin-bottom: 20px;
	}
	.page-title { font-size: 1.5rem; font-weight: 700; color: #111827; }

	.settings-nav {
		display: flex; gap: 4px;
		border-bottom: 1px solid #e5e7eb;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}
	.settings-tab {
		display: flex; align-items: center; gap: 6px;
		padding: 10px 16px; font-size: 0.9rem; color: #6b7280;
		border-bottom: 2px solid transparent; margin-bottom: -1px;
		text-decoration: none; transition: color 0.15s;
		font-family: inherit;
	}
	.settings-tab:hover { color: #374151; }
	.settings-tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }
</style>
