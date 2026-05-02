<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ItemTuner from './ItemTuner.svelte';

	const { Story } = defineMeta({
		title: 'Features/Item/ItemTuner',
		tags: ['autodocs'],
	});

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const createWornDates = (daysAgo: number[]): Date[] => {
		return daysAgo.map((days) => {
			const date = new Date(today);
			date.setDate(date.getDate() - days);
			date.setHours(0, 0, 0, 0);
			return date;
		});
	};

	const frequentWorn = createWornDates([1, 2, 4, 5, 7, 9, 10, 12, 14, 15, 17, 18, 20, 22, 24]);
	const sparseWorn = createWornDates([3, 10, 20]);
	const recentWorn = createWornDates([1, 2, 3, 4, 5]);
	const noWorn: Date[] = [];
</script>

<Story name="Frequently Worn">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<ItemTuner wornDates={frequentWorn} />
	</div>
</Story>

<Story name="Sparsely Worn">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<ItemTuner wornDates={sparseWorn} />
	</div>
</Story>

<Story name="Recently Worn">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<ItemTuner wornDates={recentWorn} />
	</div>
</Story>

<Story name="Never Worn">
	<div style="width: 100%; max-width: 600px; padding: 1rem;">
		<ItemTuner wornDates={noWorn} />
	</div>
</Story>

<Story name="Responsive - Wide">
	<div style="width: 100%; max-width: 800px; padding: 1rem;">
		<ItemTuner wornDates={frequentWorn} />
	</div>
</Story>

<Story name="Responsive - Medium">
	<div style="width: 100%; max-width: 400px; padding: 1rem;">
		<ItemTuner wornDates={frequentWorn} />
	</div>
</Story>

<Story name="Responsive - Narrow">
	<div style="width: 100%; max-width: 200px; padding: 1rem;">
		<ItemTuner wornDates={frequentWorn} />
	</div>
</Story>
