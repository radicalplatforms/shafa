<script lang="ts">
	import AppLayout from '$lib/components/layout/AppLayout.svelte';
</script>

<AppLayout>
	{#snippet filters()}
	<section class="region-root">
		<div class="region-body">
			<div>
				Filters.
			</div>
			<div class="text-neutral max-w-80">
				Buttons that define what appears in the main view. Will be hidden on mobile. 
			</div>
		</div>
	</section>
	{/snippet}
	
	<section class="region-root">
		<div class="nav-title">
			Items
		</div>
		<div class="region-body">
			<div>
				Primary context.
			</div>
			<div class="text-neutral max-w-80">
				Content the user should be focused on. Should be able to perform all actions needed using this pane alone.
			</div>
		</div>
	</section>
</AppLayout>

<style>
	.region-root {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.region-body {
		font-size: var(--nav-label-size);
		font-weight: 300;
		line-height: var(--nav-label-line-height);
		letter-spacing: var(--nav-label-letter-spacing);
		color: var(--color-base-content);

		border-style: dashed;
		border-width: 1px;
		border-color: var(--color-neutral);
		border-radius: var(--radius-box);

		padding: 16px;
		display: flex;
		flex-direction: column;
		justify-content: center;

		flex: 1 1 0;
		min-height: 0;
	}
</style>
