import { defineConfig, pvtnbr } from 'lintroll';

export default defineConfig([
	...pvtnbr(),
	{
		rules: {
			'pvtnbr/prefer-arrow-functions': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
]);
