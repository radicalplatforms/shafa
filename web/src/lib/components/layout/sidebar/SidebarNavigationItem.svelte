<script lang="ts">
	interface Props {
		href: string;
		label: string;
		isActive?: boolean;
	}

	let { href, label, isActive = false }: Props = $props();
</script>

<a
	class="link"
	class:is-active={isActive}
	href={href}
	data-sveltekit-preload-code="viewport"
>
	<span class="title">{label}</span>
</a>

<style>
	.link {
		display: grid;
		text-decoration: none;
		background: transparent;
		border-radius: var(--radius-selector);
		padding: 1.25px 0 3px 12px;
		transition: background-color 200ms ease-out;
	}

	.link:hover {
		background: var(--color-base-200);
	}

	.link:not(.is-active) .title {
		color: var(--color-neutral);
	}

	.link.is-active .title {
		color: var(--color-base-content);
	}

	.title {
		font-size: var(--nav-label-size);
		font-weight: var(--nav-label-weight);
		line-height: var(--nav-label-line-height);
		letter-spacing: var(--nav-label-letter-spacing);
		color: var(--nav-label-color);
	}

	@media (prefers-reduced-motion: reduce) {
		.link {
			transition: none;
		}
	}
</style>
