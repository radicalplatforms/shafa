<script lang="ts">
	import { Input } from '$lib/components/ui';

	let email = $state('');
	let name = $state('');
</script>

<section class="region-root">
	<div class="nav-title">
		Profile
	</div>
	<div class="region-body">
		<div class="row">
			<div class="descriptor">
				<div class="descriptor-title">Email</div>
				<div class="descriptor-note">The primary login method.</div>
			</div>
			<Input
				type="email"
				bind:value={email}
				placeholder="you@example.com"
				textAlign="start"
				aria-label="Email address"
			/>
		</div>
		<div class="row">
			<div class="descriptor">
				<div class="descriptor-title">Name</div>
				<div class="descriptor-note">How you'll be addressed.</div>
			</div>
			<Input
				type="text"
				bind:value={name}
				placeholder="Radison"
				textAlign="start"
				aria-label="Full name"
			/>
		</div>
	</div>
</section>

<style>
	.region-root {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.region-body {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-width: 0;
	}

	.row .descriptor {
		flex-shrink: 0;
	}

	.row :global(.input) {
		flex: 1;
		min-width: 10rem;
		max-width: 15rem;
		margin-left: auto;
	}
</style>
