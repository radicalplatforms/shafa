<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const link = document.createElement('link');
		link.rel = 'preload';
		link.as = 'font';
		link.type = 'font/woff2';
		link.crossOrigin = 'anonymous';
		link.href = '/fonts/test-founders-grotesk-regular.woff2';
		document.head.appendChild(link);
	});
</script>

