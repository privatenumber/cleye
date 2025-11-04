import { testSuite, expect } from 'manten';
import { spy } from 'nanospy';
import { cli, command } from '#cleye';

export default testSuite(({ describe }) => {
	describe('integration', ({ test }) => {
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
});
