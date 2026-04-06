<script lang="ts">
	import { page } from '$app/stores';
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';

	let { children } = $props();

	const navLinks = [
		{ href: '/', label: 'Dashboard', icon: 'mdi-view-dashboard' },
		{ href: '/invoices', label: 'Faktury', icon: 'mdi-file-document-multiple' },
		{ href: '/clients', label: 'Kontrahenci', icon: 'mdi-account-group' },
		{ href: '/settings', label: 'Ustawienia', icon: 'mdi-cog' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Fakturownik</title>
	<link
		rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css"
	/>
</svelte:head>

<div class="app-shell">
	<nav class="sidebar">
		<div class="sidebar-logo">
			<span class="mdi mdi-receipt-text-outline"></span>
			<span class="logo-text">Fakturownik</span>
		</div>
		<ul class="nav-list">
			{#each navLinks as link}
				<li>
					<a href={link.href} class="nav-link" class:active={isActive(link.href)}>
						<span class="mdi {link.icon}"></span>
						<span>{link.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<main class="main-content">
		{@render children()}
	</main>
</div>

<SvelteToast />

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 220px;
		background: #1e293b;
		color: #f1f5f9;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}

	.sidebar-logo {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 20px 16px;
		font-size: 1.1rem;
		font-weight: 700;
		border-bottom: 1px solid #334155;
		color: #e2e8f0;
	}

	.sidebar-logo .mdi {
		font-size: 1.5rem;
		color: #3b82f6;
	}

	.nav-list {
		list-style: none;
		padding: 12px 0;
		flex: 1;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: 6px;
		margin: 2px 8px;
		font-size: 0.9rem;
		color: #94a3b8;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.nav-link:hover {
		background: #334155;
		color: #e2e8f0;
	}

	.nav-link.active {
		background: #2563eb;
		color: #fff;
	}

	.nav-link .mdi {
		font-size: 1.2rem;
	}

	.main-content {
		flex: 1;
		padding: 24px;
		min-width: 0;
	}
</style>
