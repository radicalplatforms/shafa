<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Sonner from './Sonner.svelte';

	const { Story } = defineMeta({
		title: 'UI/Sonner',
		component: Sonner,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered',
			docs: {
				description: {
					component:
						'Toast notification component built on svelte-sonner. Provides feedback for user actions with multiple severity levels and customizable positioning.',
				},
			},
		},
		argTypes: {
			position: {
				control: 'select',
				options: [
					'top-left',
					'top-center',
					'top-right',
					'bottom-left',
					'bottom-center',
					'bottom-right',
				],
				description: 'Position of the toast container',
			},
			expand: {
				control: 'boolean',
				description: 'Whether toasts expand to show full content',
			},
			closeButton: {
				control: 'boolean',
				description: 'Show close button on toasts (default: true)',
			},
			duration: {
				control: 'number',
				description: 'Duration in milliseconds before toast auto-dismisses',
			},
			visibleToasts: {
				control: 'number',
				description: 'Maximum number of visible toasts',
			},
		},
	});
</script>

<script lang="ts">
	import { toast } from 'svelte-sonner';
</script>

<Story name="Default" asChild>
	<div class="demo-container">
		<button class="btn btn-primary" onclick={() => toast('Copied outfit ID to clipboard')}>
			Default Toast
		</button>
		<Sonner />
	</div>
</Story>

<Story name="With Description" asChild>
	<div class="demo-container">
		<button
			class="btn btn-primary"
			onclick={() =>
				toast('Sync in progress...', {
					description: 'Your recent item edits are moving from local storage to the server.',
				})}
		>
			Toast with Description
		</button>
		<Sonner />
	</div>
</Story>

<Story name="Success" asChild>
	<div class="demo-container">
		<button
			class="btn btn-success"
			onclick={() =>
				toast.success('Item saved', {
					description: 'Your changes have been saved successfully.',
				})}
		>
			Success Toast
		</button>
		<Sonner />
	</div>
</Story>

<Story name="Error" asChild>
	<div class="demo-container">
		<button
			class="btn btn-error"
			onclick={() =>
				toast.error('Upload failed', {
					description: 'Your outfit photo could not reach the server due to a connection issue.',
				})}
		>
			Error Toast
		</button>
		<Sonner />
	</div>
</Story>

<Story name="Warning" asChild>
	<div class="demo-container">
		<button
			class="btn btn-warning"
			onclick={() =>
				toast.warning('Backend stability issues', {
					description: "We're having issues with our backend service provider. Please try again later.",
				})}
		>
			Warning Toast
		</button>
		<Sonner />
	</div>
</Story>

<Story name="Info" asChild>
	<div class="demo-container">
		<button
			class="btn btn-info"
			onclick={() =>
				toast.info('New feature available', {
					description: 'Check out the new outfit recommendations in your wardrobe.',
				})}
		>
			Info Toast
		</button>
		<Sonner />
	</div>
</Story>

<Story name="With Action" asChild>
	<div class="demo-container">
		<button
			class="btn btn-error"
			onclick={() =>
				toast.error('Upload failed', {
					description: 'Your outfit photo could not reach the server due to a connection issue.',
					action: {
						label: 'Retry',
						onClick: () => toast.success('Retrying upload...'),
					},
				})}
		>
			Toast with Action
		</button>
		<Sonner />
	</div>
</Story>

<Story name="Promise" asChild>
	<div class="demo-container">
		<button
			class="btn btn-primary"
			onclick={() => {
				const promise = new Promise((resolve) => setTimeout(resolve, 2000));
				toast.promise(promise, {
					loading: 'Uploading photo...',
					success: 'Photo uploaded successfully!',
					error: 'Failed to upload photo',
				});
			}}
		>
			Promise Toast
		</button>
		<Sonner />
	</div>
</Story>

<Story name="All Types" asChild>
	<div class="demo-container demo-row">
		<button class="btn btn-neutral btn-sm" onclick={() => toast('Default notification')}>
			Default
		</button>
		<button class="btn btn-success btn-sm" onclick={() => toast.success('Success!')}>
			Success
		</button>
		<button class="btn btn-error btn-sm" onclick={() => toast.error('Error occurred')}>
			Error
		</button>
		<button class="btn btn-warning btn-sm" onclick={() => toast.warning('Warning!')}>
			Warning
		</button>
		<button class="btn btn-info btn-sm" onclick={() => toast.info('Information')}>
			Info
		</button>
		<Sonner />
	</div>
</Story>

<Story name="Bottom Right Position" asChild>
	<div class="demo-container">
		<button
			class="btn btn-primary"
			onclick={() =>
				toast('Position demo', {
					description: 'Toast appearing at bottom-right',
				})}
		>
			Show Toast (Bottom Right)
		</button>
		<Sonner position="bottom-right" />
	</div>
</Story>

<Story name="Top Center Position" asChild>
	<div class="demo-container">
		<button
			class="btn btn-primary"
			onclick={() =>
				toast('Position demo', {
					description: 'Toast appearing at top-center',
				})}
		>
			Show Toast (Top Center)
		</button>
		<Sonner position="top-center" />
	</div>
</Story>

<style>
	.demo-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 2rem;
	}

	.demo-row {
		flex-direction: row;
		flex-wrap: wrap;
	}
</style>

