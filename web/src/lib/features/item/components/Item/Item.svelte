<script lang="ts">
	import type { Item as ItemType } from '$lib/types/item';
	import ItemTuner from './ItemTuner.svelte';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';

	interface Props {
		item: ItemType;
		onRemove?: () => void;
	}

	let { item, onRemove = undefined }: Props = $props();
</script>

<div class="item">
	{#if item.imageUrl}
		<img src={item.imageUrl} alt={item.name} class="thumbnail" />
	{:else}
		<div class="thumbnail"></div>
	{/if}

	<div class="descriptor">
		<div class="descriptor-title">{item.name}</div>
		{#if item.brand}
			<div class="descriptor-note">{item.brand}</div>
		{:else}
			<div class="descriptor-note"><i>Unbranded</i></div>
		{/if}
	</div>

	{#if onRemove}
		<ActionButton mode="remove" onClick={onRemove} aria-label="Remove item" />
	{/if}

	<div class="tuner">
		<ItemTuner wornDates={item.wornDates} />
	</div>
</div>

<style>
	.item {
		display: grid;
		grid-template-columns: 4rem 1fr auto;
		column-gap: 1.25rem;
		align-items: center;
	}

	.thumbnail {
		width: 4rem;
		height: 4rem;
		border-radius: var(--radius-box);
		background-color: var(--color-base-200);
		object-fit: cover;
	}

	.descriptor {
		min-width: 0;
	}

	.tuner {
		grid-column: 2 / -1;
		min-width: 0;
		overflow: hidden;
		margin-top: 0.05rem;
		margin-bottom: 0.3rem;
	}
</style>
