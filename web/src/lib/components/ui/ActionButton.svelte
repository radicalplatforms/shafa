<script lang="ts">
	import { IconX, IconArrowUp } from '@tabler/icons-svelte';

	interface Props {
		mode?: 'add' | 'remove';
		focused?: boolean;
		disabled?: boolean;
		onClick?: () => void;
		'aria-label'?: string;
	}

	let {
		mode = 'add',
		focused = false,
		disabled = false,
		onClick,
		'aria-label': ariaLabel,
	}: Props = $props();

	const label = $derived(ariaLabel ?? (mode === 'add' ? 'Add entity' : 'Remove entity'));
</script>

<button
	type="button"
	class="action-button transition-selector"
	class:focused
	{disabled}
	aria-label={label}
	onclick={onClick}
>
	{#if mode === 'add'}
		<IconArrowUp size={18} stroke={2.5} />
	{:else}
		<IconX size={18} stroke={2.5} />
	{/if}
</button>

<style>
	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.3125rem;
		height: 1.3125rem;
		padding: 0;
		border: none;
		border-radius: var(--radius-selector);
		background-color: var(--color-base-300);
		color: var(--color-neutral);
		cursor: pointer;
		flex-shrink: 0;
	}

	.action-button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.action-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.action-button.focused:not(:disabled) {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
	}
</style>
