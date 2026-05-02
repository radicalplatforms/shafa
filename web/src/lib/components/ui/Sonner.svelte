<script lang="ts">
	import { Toaster } from 'svelte-sonner';

	interface Props {
		position?:
			| 'top-left'
			| 'top-center'
			| 'top-right'
			| 'bottom-left'
			| 'bottom-center'
			| 'bottom-right';
		expand?: boolean;
		closeButton?: boolean;
		duration?: number;
		visibleToasts?: number;
	}

	let {
		position = 'bottom-center',
		expand = false,
		closeButton = true,
		duration = 4000,
		visibleToasts = 3,
	}: Props = $props();
</script>

<Toaster
	{position}
	{expand}
	{closeButton}
	{duration}
	{visibleToasts}
	toastOptions={{
		unstyled: true,
		classes: {
			toast: 'sonner-toast',
			title: 'sonner-title',
			description: 'sonner-description',
			actionButton: 'sonner-action',
			cancelButton: 'sonner-cancel',
			closeButton: 'sonner-close',
			loader: 'sonner-loader',
			icon: 'sonner-icon',
			success: 'sonner-success',
			error: 'sonner-error',
			warning: 'sonner-warning',
			info: 'sonner-info',
			default: 'sonner-default',
		},
	}}
/>

<style>
	:global([data-sonner-toaster]) {
		font-family: var(--font-sans);
	}

	:global([data-sonner-toast].sonner-toast) {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		padding-right: 2.5rem;
		background-color: var(--color-base-200);
		border: 1.5px solid var(--color-base-300);
		border-radius: var(--radius-box);
		color: var(--color-base-content);
		font-family: var(--font-sans);
		position: relative;
		max-width: 24rem;
		width: 100%;
	}

	:global([data-sonner-toast].sonner-success) {
		border-color: color-mix(in srgb, var(--color-success) 20%, transparent);
	}

	:global([data-sonner-toast].sonner-error) {
		border-color: color-mix(in srgb, var(--color-error) 20%, transparent);
	}

	:global([data-sonner-toast].sonner-warning) {
		border-color: color-mix(in srgb, var(--color-warning) 20%, transparent);
	}

	:global([data-sonner-toast].sonner-info) {
		border-color: color-mix(in srgb, var(--color-info) 20%, transparent);
	}

	:global([data-sonner-toast] [data-content]) {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--descriptor-gap);
	}

	:global([data-sonner-toast] .sonner-title) {
		font-size: var(--descriptor-title-size);
		font-weight: var(--descriptor-title-weight);
		line-height: var(--descriptor-title-line-height);
		letter-spacing: var(--descriptor-title-letter-spacing);
		color: var(--descriptor-title-color);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	:global([data-sonner-toast] .sonner-description) {
		font-size: var(--descriptor-note-size);
		font-weight: var(--descriptor-note-weight);
		line-height: var(--descriptor-note-line-height);
		letter-spacing: var(--descriptor-note-letter-spacing);
		color: var(--descriptor-note-color);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	:global([data-sonner-toast] .sonner-icon) {
		flex-shrink: 0;
		width: 1.125rem;
		height: calc(var(--descriptor-title-size) * var(--descriptor-title-line-height));
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-neutral);
	}

	:global([data-sonner-toast].sonner-success .sonner-icon) {
		color: var(--color-success);
	}

	:global([data-sonner-toast].sonner-error .sonner-icon) {
		color: var(--color-error);
	}

	:global([data-sonner-toast].sonner-warning .sonner-icon) {
		color: var(--color-warning);
	}

	:global([data-sonner-toast].sonner-info .sonner-icon) {
		color: var(--color-info);
	}

	:global([data-sonner-toast] .sonner-close) {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		background-color: transparent;
		border: none;
		color: var(--color-neutral);
		cursor: pointer;
		border-radius: var(--radius-selector);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			color 200ms ease-out,
			background-color 200ms ease-out;
	}

	:global([data-sonner-toast] .sonner-close:hover) {
		color: var(--color-base-content);
		background-color: var(--color-base-300);
	}

	:global([data-sonner-toast] .sonner-close:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	:global([data-sonner-toast] .sonner-action) {
		font-size: var(--descriptor-note-size);
		font-weight: 500;
		color: var(--color-secondary);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 200ms ease-out;
		margin-top: 0.125rem;
	}

	:global([data-sonner-toast] .sonner-action:hover) {
		opacity: 0.8;
	}

	:global([data-sonner-toast] .sonner-cancel) {
		font-size: var(--descriptor-note-size);
		font-weight: 400;
		color: var(--color-neutral);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	:global([data-sonner-toast] .sonner-cancel:hover) {
		color: var(--color-base-content);
	}

	:global([data-sonner-toast] .sonner-loader) {
		color: var(--color-neutral);
	}
</style>
