<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Toast from './Toast.svelte';

	const { Story } = defineMeta({
		title: 'UI/Toast',
		component: Toast,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered',
			docs: {
				description: {
					component:
						'Static toast component for inline display. Use this when you need toast-style messaging rendered directly in the DOM rather than as an overlay notification.',
				},
			},
		},
		argTypes: {
			type: {
				control: 'select',
				options: ['default', 'success', 'error', 'warning', 'info', 'loading'],
				description: 'Visual style variant',
			},
			title: {
				control: 'text',
				description: 'Primary message text',
			},
			description: {
				control: 'text',
				description: 'Secondary descriptive text',
			},
			showCloseButton: {
				control: 'boolean',
				description: 'Display close button (default: true)',
			},
			showIcon: {
				control: 'boolean',
				description: 'Display type-specific icon (default: true)',
			},
		},
	});
</script>

<script lang="ts">
	let dismissed = $state(false);

	function reset() {
		dismissed = false;
	}
</script>

<Story name="Default" args={{ title: 'Copied outfit ID to clipboard' }} />

<Story
	name="With Description"
	args={{
		title: 'Sync in progress...',
		description: 'Your recent item edits are moving from local storage to the server.',
	}}
/>

<Story
	name="Success"
	args={{
		type: 'success',
		title: 'Item saved',
		description: 'Your changes have been saved successfully.',
	}}
/>

<Story
	name="Error"
	args={{
		type: 'error',
		title: 'Upload failed',
		description: 'Your outfit photo could not reach the server due to a connection issue.',
	}}
/>

<Story
	name="Warning"
	args={{
		type: 'warning',
		title: 'Backend stability issues',
		description: "We're having issues with our backend service provider. Please try again later.",
	}}
/>

<Story
	name="Info"
	args={{
		type: 'info',
		title: 'New feature available',
		description: 'Check out the new outfit recommendations in your wardrobe.',
	}}
/>

<Story
	name="Loading"
	args={{
		type: 'loading',
		title: 'Uploading photo...',
		description: 'Please wait while we process your image.',
	}}
/>

<Story
	name="Without Close Button"
	args={{
		title: 'Notification',
		description: 'This toast has no close button.',
		showCloseButton: false,
	}}
/>

<Story name="Dismissible" asChild>
	<div class="story-container">
		{#if !dismissed}
			<Toast
				title="Dismissible notification"
				description="Click the X to dismiss this toast."
				onClose={() => (dismissed = true)}
			/>
		{:else}
			<button class="btn btn-sm btn-neutral" onclick={reset}>Show again</button>
		{/if}
	</div>
</Story>

<Story name="With Action" asChild>
	<div class="story-container">
		<Toast
			type="error"
			title="Upload failed"
			description="Your outfit photo could not reach the server due to a connection issue."
		>
			{#snippet action()}
				<button>Retry</button>
			{/snippet}
		</Toast>
	</div>
</Story>

<Story name="All Types" asChild>
	<div class="all-types-container">
		<Toast title="Default notification" showCloseButton={false} />
		<Toast
			type="success"
			title="Success!"
			description="Operation completed successfully."
			showCloseButton={false}
		/>
		<Toast
			type="error"
			title="Error occurred"
			description="Something went wrong."
			showCloseButton={false}
		/>
		<Toast
			type="warning"
			title="Warning!"
			description="Please review before continuing."
			showCloseButton={false}
		/>
		<Toast
			type="info"
			title="Information"
			description="Here's something you should know."
			showCloseButton={false}
		/>
		<Toast type="loading" title="Loading..." description="Please wait." showCloseButton={false} />
	</div>
</Story>

<Story name="Stacked" asChild>
	<div class="stacked-container">
		<Toast title="Copied outfit ID to clipboard" />
		<Toast
			title="Sync in progress..."
			description="Your recent item edits are moving from local storage to the server."
		/>
		<Toast
			type="error"
			title="Upload failed"
			description="Your outfit photo could not reach the server due to a connection issue."
		>
			{#snippet action()}
				<button>Retry</button>
			{/snippet}
		</Toast>
	</div>
</Story>

<Story name="Warning Example" asChild>
	<div class="story-container">
		<Toast
			type="warning"
			title="Backend stability issues"
			description="We're having issues with our backend service provider. Please try again later."
		/>
	</div>
</Story>

<style>
	.story-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
	}

	.all-types-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
		padding: 2rem;
	}

	.stacked-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
		padding: 2rem;
	}
</style>
