<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { NavItem } from '$lib/constants/nav';
	import SidebarNavigation from '../sidebar/SidebarNavigation.svelte';
	import SidebarNavigationItem from '../sidebar/SidebarNavigationItem.svelte';
	import { useClerkContext } from 'svelte-clerk/client';
	// import Toast from '$lib/components/ui/Toast.svelte';

	interface Props {
		filters?: Snippet;
	}

	let { filters }: Props = $props();

	const ctx = useClerkContext();
	const userFirstName = $derived(ctx.user?.firstName);

	const navItems: NavItem[] = [
		{ href: '/outfit', label: 'Outfits' },
		{ href: '/item', label: 'Items' },
	];
</script>

<aside class="sidebar">
	<SidebarNavigation items={navItems} />

	<div class="filters">
		{#if filters}
			{@render filters()}
		{/if}
	</div>

	<SidebarNavigationItem
		href="/profile"
		label={userFirstName ?? 'Settings'}
		isActive={true}
	/>

	<!-- <div>
		<Toast
			type="warning"
			title="Backend stability issues"
			description="We're having issues with our backend service provider. Please try again later."
		/>
	</div> -->
</aside>

<style>
	.sidebar {
		display: grid;
		grid-template-rows: auto 1fr;
		min-width: 0;
		gap: 20px;
	}
</style>
