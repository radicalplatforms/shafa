import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			'@rak3rman/configs': join(__dirname, 'node_modules', '@rak3rman', 'configs'),
		},
	},
	server: {
		fs: {
			allow: [join(__dirname, 'node_modules')],
		},
	},
});
