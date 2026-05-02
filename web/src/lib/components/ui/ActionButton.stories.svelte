<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ActionButton from './ActionButton.svelte';

	const { Story } = defineMeta({
		title: 'Components/UI/ActionButton',
		component: ActionButton,
		tags: ['autodocs'],
	});
</script>

<script lang="ts">
	type State = { mode: 'add' | 'remove'; focused: boolean };
	const states: State[] = [
		{ mode: 'add', focused: false },
		{ mode: 'add', focused: true },
		{ mode: 'remove', focused: false },
		{ mode: 'remove', focused: true },
	];
	let stateIndex = $state(0);
	let current = $derived(states[stateIndex]);

	function cycle() {
		stateIndex = (stateIndex + 1) % states.length;
	}
</script>

<Story name="States" asChild>
	<div class="states">
		<div class="column">
			<span class="label">Add</span>
			<ActionButton mode="add" />
			<ActionButton mode="add" focused />
			<ActionButton mode="add" disabled />
		</div>
		<div class="column">
			<span class="label">Remove</span>
			<ActionButton mode="remove" />
			<ActionButton mode="remove" focused />
			<ActionButton mode="remove" disabled />
		</div>
		<div class="column labels">
			<span class="label">&nbsp;</span>
			<span class="note">Default</span>
			<span class="note">Focused</span>
			<span class="note">Disabled</span>
		</div>
	</div>
</Story>

<Story name="Interactive" asChild>
	<div class="interactive">
		<ActionButton mode={current.mode} focused={current.focused} onClick={cycle} />
	</div>
</Story>

<style>
	.states {
		display: flex;
		gap: 1.5rem;
		padding: 2rem;
	}

	.column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.column.labels {
		align-items: flex-start;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-base-content);
	}

	.note {
		font-size: 0.75rem;
		color: var(--color-neutral);
		line-height: 1.3125rem;
	}

	.interactive {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}
</style>
