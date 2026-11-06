import { spawnSync } from 'node:child_process';
import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli, command } from '#cleye';

describe('integration', () => {
	test('help output is not colored when piped with COLORTERM set', () => {
		const entrypoint = new URL('../../dist/index.mjs', import.meta.url).href;
		const script = `import { cli } from '${entrypoint}'; cli({ name: 'my-cli' }, undefined, ['--help']);`;
		const env: NodeJS.ProcessEnv = {
			...process.env,
			COLORTERM: 'truecolor',
		};
		delete env.FORCE_COLOR;
		delete env.NO_COLOR;

		const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
			encoding: 'utf8',
			env,
		});

		expect(result.status).toBe(0);
		expect(result.stdout.toLowerCase()).toContain('usage:');
		expect(result.stdout.includes('\u001B[')).toBe(false);
	});

	test('full CLI with all features', () => {
		const buildCallback = spy();
		const buildCommand = command(
			{
				name: 'build',
				parameters: ['<input>', '[output]'],
				flags: {
					minify: Boolean,
					watch: {
						type: Boolean,
						alias: 'w',
					},
				},
			},
			(parsed) => {
				expect<string>(parsed._.input).toBe('src/');
				expect<boolean | undefined>(parsed.flags.minify).toBe(true);
				buildCallback();
			},
		);

		const parsed = cli(
			{
				name: 'my-cli',
				version: '1.0.0',
				parameters: ['[global-arg]'],
				flags: {
					verbose: Boolean,
				},
				commands: [buildCommand],
			},
			undefined,
			['build', 'src/', '--minify', '--verbose'],
		);

		if (parsed.command === 'build') {
			expect<string>(parsed._.input).toBe('src/');
			expect<boolean | undefined>(parsed.flags.minify).toBe(true);
		}

		expect(buildCallback.called).toBe(true);
	});
});
