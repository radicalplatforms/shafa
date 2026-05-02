<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		wornDates: Date[];
	}

	let { wornDates }: Props = $props();

	let containerElement: HTMLDivElement;
	let visibleDays = $state(30);

	const DAY_WIDTH = 6; // 2px element + 4px gap

	onMount(() => {
		const updateVisibleDays = () => {
			if (!containerElement) return;

			const rect = containerElement.getBoundingClientRect();
			const availableWidth = rect.width;

			// Calculate how many days can fit, rounding down to ensure we don't overflow
			// Each day takes 6px (2px element + 4px gap), except the last one which doesn't need trailing gap
			const maxDays = Math.floor((availableWidth + 4) / DAY_WIDTH);
			visibleDays = Math.max(7, Math.min(maxDays, 90)); // Show at least 7 days, max 90
		};

		updateVisibleDays();

		const resizeObserver = new ResizeObserver(updateVisibleDays);
		resizeObserver.observe(containerElement);

		// Also listen to window resize for better responsiveness
		window.addEventListener('resize', updateVisibleDays);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateVisibleDays);
		};
	});

	const days = $derived.by(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const daysArray: Array<{ date: Date; isWorn: boolean }> = [];

		for (let i = visibleDays - 1; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			date.setHours(0, 0, 0, 0);

			const isWorn = wornDates.some((wornDate) => {
				const worn = new Date(wornDate);
				worn.setHours(0, 0, 0, 0);
				return worn.getTime() === date.getTime();
			});

			daysArray.push({ date, isWorn });
		}

		return daysArray;
	});
</script>

<div class="tuner" bind:this={containerElement}>
	<div class="tuner-track">
		{#each days as day, index (day.date.getTime())}
			<div class="day-marker" class:worn={day.isWorn}>
				{#if day.isWorn}
					<div class="worn-bar"></div>
				{:else}
					<div class="day-circle"></div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.tuner {
		width: 100%;
		min-width: 0;
		display: flex;
		align-items: end;
	}

	.tuner-track {
		display: flex;
		align-items: end;
		gap: 4px;
		min-width: 0;
		flex-wrap: nowrap;
	}

	.day-marker {
		flex-shrink: 0;
		width: 2px;
		height: 6px;
		display: flex;
		align-items: end;
		justify-content: end;
		position: relative;
	}

	.day-circle {
		width: 2px;
		height: 2px;
		border-radius: 50%;
		background-color: var(--color-neutral);
		flex-shrink: 0;
	}

	.worn-bar {
		width: 2px;
		height: 6px;
		border-radius: 1px;
		background-color: var(--color-success);
		flex-shrink: 0;
	}

	.day-marker.worn .day-circle {
		display: none;
	}

	.day-marker:not(.worn) .worn-bar {
		display: none;
	}
</style>
