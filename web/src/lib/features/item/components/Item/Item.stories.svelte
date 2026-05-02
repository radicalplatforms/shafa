<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Item from './Item.svelte';
	import type { Item as ItemType } from '$lib/types/item';

	const { Story } = defineMeta({
		title: 'Features/Item/Item',
		tags: ['autodocs'],
	});

	const createItem = (
		name: string,
		brand: string | null,
		imageUrl?: string,
		wornDates: Date[] = []
	): ItemType => ({
		id: '1',
		name,
		brand,
		imageUrl,
		wornDates,
	});

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const recentWornDates = [
		new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
		new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
		new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
		new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
		new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
	];

	const itemWithImage = createItem(
		'Black Heavyweight T-shirt',
		'Imogene + Willie',
		'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
		recentWornDates
	);

	const itemWithoutImage = createItem('White Cotton Shirt', 'Everlane', undefined, [
		new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
		new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
	]);

	const itemNoBrand = createItem('Denim Jeans', null, undefined, [
		new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
	]);

	const itemLongText = createItem(
		'This is a very long item name that should truncate properly when it exceeds the available space',
		'This is also a very long brand name that should truncate',
		undefined,
		[]
	);
</script>

<Story name="With Image and Brand">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<Item item={itemWithImage} onRemove={() => console.log('Remove clicked')} />
	</div>
</Story>

<Story name="Without Image">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<Item item={itemWithoutImage} onRemove={() => console.log('Remove clicked')} />
	</div>
</Story>

<Story name="No Brand">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<Item item={itemNoBrand} onRemove={() => console.log('Remove clicked')} />
	</div>
</Story>

<Story name="Without Remove Button">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<Item item={itemWithImage} />
	</div>
</Story>

<Story name="Long Text">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<Item item={itemLongText} onRemove={() => console.log('Remove clicked')} />
	</div>
</Story>

<Story name="Multiple Items">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<Item item={itemWithImage} onRemove={() => console.log('Remove clicked')} />
		<Item item={itemWithoutImage} onRemove={() => console.log('Remove clicked')} />
	</div>
</Story>

<Story name="Responsive">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<div style="max-width: 400px;">
			<Item item={itemWithImage} onRemove={() => console.log('Remove clicked')} />
		</div>
		<div style="max-width: 300px;">
			<Item item={itemWithoutImage} onRemove={() => console.log('Remove clicked')} />
		</div>
		<div style="max-width: 200px;">
			<Item item={itemNoBrand} onRemove={() => console.log('Remove clicked')} />
		</div>
	</div>
</Story>
