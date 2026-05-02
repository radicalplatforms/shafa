<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from 'svelte-clerk';

	const { children }: { children: Snippet } = $props();
</script>

<ClerkProvider>
	<SignedIn>
		{@render children()}
	</SignedIn>
	<SignedOut>
		<RedirectToSignIn/>
	</SignedOut>
</ClerkProvider>
