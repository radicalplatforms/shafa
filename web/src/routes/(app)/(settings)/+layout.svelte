<script lang="ts">
	import type { Snippet } from 'svelte';
	import AppLayout from '$lib/components/layout/AppLayout.svelte';
	import SidebarNavigation from '$lib/components/layout/sidebar/SidebarNavigation.svelte';
	import type { NavItem } from '$lib/constants/nav';

	let { children }: { children: Snippet } = $props();

	const navItems: NavItem[] = [
		{ href: '/profile', label: 'Profile' },
		{ href: '/tags', label: 'Tags' },
	];
</script>

<AppLayout>
	{#snippet filters()}
		<SidebarNavigation items={navItems} />
	{/snippet}

	{@render children()}
</AppLayout>
