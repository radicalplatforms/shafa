<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarRegion from './regions/SidebarRegion.svelte';
	import PrimaryRegion from './regions/PrimaryRegion.svelte';
	import SupplementaryRegion from './regions/SupplementaryRegion.svelte';

	interface Props {
		filters?: Snippet;
		supplementary?: Snippet;
		children: Snippet;
		supplementaryHidden?: boolean;
	}

	let {
		filters,
		supplementary,
		children,
		supplementaryHidden = false,
	}: Props = $props();
</script>

<div class="app-layout" data-theme="radical-ui-dark">
	<SidebarRegion filters={filters} />

	<PrimaryRegion>
		{@render children()}
	</PrimaryRegion>

	<SupplementaryRegion hidden={supplementaryHidden}>
		{#if supplementary}
			{@render supplementary()}
		{/if}
	</SupplementaryRegion>
</div>

<style>
	.app-layout {
		display: grid;
		grid-template-columns: 250px 1fr 1fr;
		height: 100dvh;
		width: 100%;
		background: var(--color-base-100);
		color: var(--color-base-content);
		padding: var(--app-inset-y) var(--app-inset-x);
		gap: 25px;
	}

	@media (max-width: 1024px) {
		.app-layout {
			grid-template-columns: 220px minmax(0, 1fr);
		}
	}
</style>
