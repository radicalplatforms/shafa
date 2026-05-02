import type { Preview } from '@storybook/sveltekit';
import '../src/routes/layout.css';

const preview: Preview = {
	parameters: {
		backgrounds: {
			disabled: true,
		},
		layout: 'centered',
	},
};

export default preview;

