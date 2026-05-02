<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<main class="primary">
	{@render children()}
</main>

<style>
	.primary {
		min-width: 0;
	}
</style>
