<script lang="ts">
	import type { NavItem } from '$lib/constants/nav';
	import { page } from '$app/state';
	import SidebarNavigationItem from './SidebarNavigationItem.svelte';

	interface Props {
		items: NavItem[];
	}

	let { items }: Props = $props();

	const currentPath = $derived(page.url.pathname);
</script>

<nav>
	<ul class="nav-list">
		{#each items as item}
			<li>
				<SidebarNavigationItem
					href={item.href}
					label={item.label}
					isActive={currentPath === item.href}
				/>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.nav-list {
		display: grid;
		gap: var(--nav-label-gap);
	}
</style>
