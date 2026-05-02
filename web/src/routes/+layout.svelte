<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Fonts from '$lib/components/structure/Fonts.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Fonts />

{@render children()}
