<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		hidden?: boolean;
		children?: Snippet;
	}

	let { hidden = false, children }: Props = $props();
</script>

<aside class="supplementary" data-hidden={hidden ? 'true' : 'false'}>
	{#if children}
		{@render children()}
	{/if}
</aside>

<style>
	.supplementary {
		min-width: 0;
	}

	.supplementary[data-hidden='true'] {
		display: none;
	}

	@media (max-width: 1024px) {
		.supplementary {
			display: none;
		}
	}
</style>
