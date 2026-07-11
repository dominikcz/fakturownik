<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';
	import { version } from '../../package.json';

	let { children } = $props();

	let latestVersion = $state<string | null>(null);
	let gitAvailable = $state(false);
	let githubPage = $state('https://github.com/dominikcz/fakturownik');
	let updating = $state(false);
	let updateError = $state<string | null>(null);

	function compareVersions(a: string, b: string): number {
		const pa = a.replace(/^v/, '').split('.').map(Number);
		const pb = b.replace(/^v/, '').split('.').map(Number);
		for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
			const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
			if (diff !== 0) return diff;
		}
		return 0;
	}

	let hasUpdate = $derived(latestVersion !== null && compareVersions(latestVersion, version) > 0);

	async function checkForUpdate() {
		try {
			const res = await fetch('/api/update');
			if (res.ok) {
				const data = await res.json();
				latestVersion = data.latestVersion ?? null;
				gitAvailable = data.gitAvailable ?? false;
				githubPage = data.githubPage ?? githubPage;
			}
		} catch {
			// ignoruj błędy sprawdzania wersji
		}
	}

	async function doUpdate() {
		if (!gitAvailable) {
			window.location.href = githubPage;
			return;
		}
		updating = true;
		updateError = null;
		try {
			const res = await fetch('/api/update', { method: 'POST' });
			const data = await res.json();
			if (res.ok && data.success) {
				window.location.reload();
			} else {
				updateError = data.error ?? 'Nieznany błąd aktualizacji';
			}
		} catch (e) {
			updateError = String(e);
		} finally {
			updating = false;
		}
	}

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

	let isDark = $state(false);

	onMount(() => {
		checkForUpdate();
		isDark = document.documentElement.getAttribute('data-theme') === 'dark';

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		function onSystemChange(e: MediaQueryListEvent) {
			isDark = e.matches;
			document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
			try { localStorage.removeItem('theme'); } catch (_) {}
		}
		mq.addEventListener('change', onSystemChange);
		return () => mq.removeEventListener('change', onSystemChange);
	});

	function toggleTheme() {
		isDark = !isDark;
		const theme = isDark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		try { localStorage.setItem('theme', theme); } catch (_) {}
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
		<div class="logo-main">
			<span class="mdi mdi-receipt-text-outline"></span>
			<span class="logo-text">Fakturownik</span>
		</div>
		<div class="logo-version-row">
			<span class="logo-version">v{version}</span>
			{#if hasUpdate}
				<button
					class="update-btn"
					onclick={doUpdate}
					disabled={updating}
					title={gitAvailable ? `Aktualizuj do v${latestVersion}` : `Przejdź do GitHub aby pobrać v${latestVersion}`}
				>
					<span class="mdi {updating ? 'mdi-loading mdi-spin' : (gitAvailable ? 'mdi-update' : 'mdi-open-in-new')}"></span>
					{updating ? 'Aktualizuję...' : 'Aktualizuj'}
				</button>
			{/if}
		</div>
		{#if updateError}
			<span class="update-error" title={updateError}>Błąd aktualizacji</span>
		{/if}
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
		<button class="theme-toggle" onclick={toggleTheme} title={isDark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}>
			<span class="mdi {isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'}"></span>
			<span>{isDark ? 'Jasny motyw' : 'Ciemny motyw'}</span>
		</button>
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
		background: var(--clr-sidebar-bg);
		color: var(--clr-sidebar-text);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}

	.sidebar-logo {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 5px;
		padding: 20px 16px;
		font-size: 1.1rem;
		font-weight: 700;
		border-bottom: 1px solid var(--clr-sidebar-border);
		color: var(--clr-logo-text);
	}
	
	.logo-version-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.logo-version {
		font-size: 0.7rem;
		opacity: 0.7;
		margin-left: 0;
	}

	.update-btn {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 6px;
		font-size: 0.65rem;
		background: var(--clr-primary);
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.update-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.update-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.update-error {
		font-size: 0.65rem;
		color: #e74c3c;
		cursor: help;
	}

	.sidebar-logo .mdi {
		font-size: 1.5rem;
		color: var(--clr-primary);
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
		color: var(--clr-sidebar-muted);
		transition:
			background 0.15s,
			color 0.15s;
	}

	.nav-link:hover {
		background: var(--clr-sidebar-hover);
		color: var(--clr-sidebar-text);
	}

	.nav-link.active {
		background: var(--clr-sidebar-active);
		color: #fff;
	}

	.nav-link .mdi {
		font-size: 1.2rem;
	}

	.theme-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		width: calc(100% - 16px);
		margin: 8px 8px 12px;
		padding: 9px 12px;
		background: transparent;
		border: 1px solid var(--clr-sidebar-border);
		border-radius: 6px;
		color: var(--clr-sidebar-muted);
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.theme-toggle:hover {
		background: var(--clr-sidebar-hover);
		color: var(--clr-sidebar-text);
	}

	.theme-toggle .mdi {
		font-size: 1.1rem;
	}

	.main-content {
		flex: 1;
		padding: 24px;
		min-width: 0;
	}
</style>
