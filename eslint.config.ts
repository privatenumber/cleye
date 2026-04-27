import { defineConfig, pvtnbr } from 'lintroll';

export default defineConfig([
	...pvtnbr(),
	{
		rules: {
			'pvtnbr/prefer-arrow-functions': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		// Examples teach the canonical pattern; inline `export default () => {}`
		// reads better than naming a const just to satisfy the rule.
		files: ['examples/**'],
		rules: {
			'unicorn/no-anonymous-default-export': 'off',
		},
	},
]);
