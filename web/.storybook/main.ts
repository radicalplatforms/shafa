import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.svelte'],
	addons: [
		'@storybook/addon-docs',
		'@storybook/addon-a11y',
		'@storybook/addon-svelte-csf',
		'@chromatic-com/storybook',
	],
	framework: '@storybook/sveltekit',
};

export default config;

