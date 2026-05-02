<script lang="ts">
	import {
		IconCheck,
		IconX,
		IconAlertTriangle,
		IconInfoCircle,
		IconLoader2,
	} from '@tabler/icons-svelte';
	import type { Snippet } from 'svelte';

	type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

	interface IconConfig {
		icon: typeof IconCheck;
		size: number;
		offsetY: number;
	}

	interface Props {
		type?: ToastType;
		title: string;
		description?: string;
		showCloseButton?: boolean;
		showIcon?: boolean;
		action?: Snippet;
		onClose?: () => void;
	}

	let {
		type = 'default',
		title,
		description,
		showCloseButton = true,
		showIcon = true,
		action,
		onClose,
	}: Props = $props();

	const iconMap: Record<ToastType, IconConfig | null> = {
		default: null,
		success: { icon: IconCheck, size: 18, offsetY: 0 },
		error: { icon: IconX, size: 18, offsetY: 0.5 },
		warning: { icon: IconAlertTriangle, size: 16, offsetY: 1 },
		info: { icon: IconInfoCircle, size: 16, offsetY: 0.5 },
		loading: { icon: IconLoader2, size: 10, offsetY: 1 },
	};

	const iconConfig = $derived(iconMap[type]);
	const hasIcon = $derived(showIcon && iconConfig !== null);
</script>

<div class="toast" class:has-icon={hasIcon} data-type={type} role="status" aria-live="polite">
	{#if hasIcon && iconConfig}
		<div class="toast-icon" style:--icon-offset-y="{iconConfig.offsetY}px">
			<span class:loading={type === 'loading'}>
				<iconConfig.icon size={iconConfig.size} stroke={2} />
			</span>
		</div>
	{/if}

	<div class="toast-content">
		<div class="toast-title descriptor-title">{title}</div>
		{#if description}
			<div class="toast-description descriptor-note">{description}</div>
		{/if}
		{#if action}
			<div class="toast-action">
				{@render action()}
			</div>
		{/if}
	</div>

	{#if showCloseButton}
		<button
			type="button"
			class="toast-close transition-selector"
			onclick={onClose}
			aria-label="Dismiss"
		>
			<IconX size={12} stroke={3} />
		</button>
	{/if}
</div>

<style>
	.toast {
		--card-padding: 0.75rem;
		--icon-offset-y: 0px;
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 0.75rem;
		padding: var(--card-padding);
		padding-left: calc(var(--card-padding) + 0.3rem);
		padding-right: calc(var(--card-padding) + 1.5rem);
		background-color: var(--color-base-200);
		border: 1.5px solid var(--color-base-200);
		border-radius: var(--radius-box);
		color: var(--color-base-content);
		font-family: var(--font-sans);
		position: relative;
		max-width: 24rem;
		width: 100%;
	}

	.toast:not(.has-icon) {
		padding-left: calc(var(--card-padding) + 0.35rem);
	}

	.toast[data-type='success'] {
		border-color: color-mix(in srgb, var(--color-success) 20%, transparent);
	}

	.toast[data-type='error'] {
		border-color: color-mix(in srgb, var(--color-error) 20%, transparent);
	}

	.toast[data-type='warning'] {
		border-color: color-mix(in srgb, var(--color-warning) 20%, transparent);
	}

	.toast[data-type='info'] {
		border-color: color-mix(in srgb, var(--color-info) 20%, transparent);
	}

	.toast[data-type='loading'] {
		border-color: color-mix(in srgb, var(--color-neutral) 20%, transparent);
	}

	.toast-icon {
		flex-shrink: 0;
		width: var(--descriptor-title-line-height);
		height: var(--descriptor-title-line-height);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-neutral);
		transform: translateY(var(--icon-offset-y));
	}

	.toast-icon span {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.toast[data-type='success'] .toast-icon {
		color: var(--color-success);
	}

	.toast[data-type='error'] .toast-icon {
		color: var(--color-error);
	}

	.toast[data-type='warning'] .toast-icon {
		color: var(--color-warning);
	}

	.toast[data-type='info'] .toast-icon {
		color: var(--color-info);
	}

	.toast-icon span.loading {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.toast-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--descriptor-gap);
	}

	.toast-title {
		line-height: var(--descriptor-title-line-height);
		white-space: normal;
		text-overflow: clip;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.toast-description {
		white-space: normal;
		text-overflow: clip;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.toast-action {
		margin-top: 0.125rem;
	}

	.toast-action :global(button),
	.toast-action :global(a) {
		font-size: var(--descriptor-note-size);
		font-weight: 500;
		color: var(--color-secondary);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 200ms ease-out;
	}

	.toast-action :global(button:hover),
	.toast-action :global(a:hover) {
		opacity: 0.8;
	}

	.toast-close {
		position: absolute;
		top: var(--card-padding);
		right: var(--card-padding);
		width: var(--descriptor-title-line-height);
		height: var(--descriptor-title-line-height);
		padding: 0;
		background-color: transparent;
		border: none;
		color: var(--color-neutral);
		cursor: pointer;
		border-radius: var(--radius-selector);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.toast-close:hover {
		color: var(--color-neutral);
		background-color: var(--color-base-300);
	}

	.toast-close:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
