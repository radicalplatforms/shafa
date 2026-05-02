<script lang="ts">
	interface Props {
		value?: string;
		type?: 'text' | 'email' | 'password' | 'search' | 'url';
		placeholder?: string;
		disabled?: boolean;
		textAlign?: 'start' | 'end';
		class?: string;
		name?: string;
		autocomplete?: HTMLInputElement['autocomplete'];
		readonly?: boolean;
		'aria-label'?: string;
	}

	let {
		value = $bindable(''),
		type = 'text',
		placeholder,
		disabled = false,
		textAlign = 'start',
		class: className = '',
		name,
		autocomplete,
		readonly = false,
		'aria-label': ariaLabel,
	}: Props = $props();
</script>

<input
	class="input {className}"
	class:text-end={textAlign === 'end'}
	type={type}
	bind:value
	{placeholder}
	{disabled}
	{readonly}
	{name}
	{autocomplete}
	aria-label={ariaLabel}
/>

<style>
	.input {
		display: block;
		width: 100%;
		min-width: 0;
		padding: 0.375rem 0.75rem;
		border: var(--border) solid var(--color-base-300);
		border-radius: var(--radius-field);
		background-color: var(--color-base-200);
		color: var(--color-base-content);
		font-family: var(--font-sans);
		font-size: var(--descriptor-title-size);
		font-weight: var(--descriptor-title-weight);
		line-height: var(--descriptor-title-line-height);
		letter-spacing: var(--descriptor-title-letter-spacing);
	}

	.input::placeholder {
		color: var(--color-neutral);
	}

	.input:focus {
		outline: none;
	}

	.input:focus-visible {
		border: var(--border) solid var(--color-neutral);
	}

	.input.text-end {
		text-align: end;
	}
</style>
