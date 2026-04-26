import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';

describe('integration', () => {
	test('full CLI with flags, parameters, and command', async () => {
		const buildCallback = spy();

		const parsed = await cli({
			name: 'my-cli',
			version: '1.0.0',
			flags: {
				verbose: Boolean,
			},
			commands: {
				build: {
					description: 'Build the project',
					loader: () => {
						buildCallback();
					},
				},
			},
		}, p => p, ['--verbose', 'build']);

		expect(parsed.command).toBe('build');
		// --verbose is before command, so parent parses it
		expect<boolean | undefined>(parsed.flags.verbose).toBe(true);
		expect(buildCallback.called).toBe(true);
	});

	test('command with runCommand and auto-invoke', async () => {
		const commandHandler = spy();

		const parsed = await cli({
			name: 'my-cli',
			flags: {
				debug: Boolean,
			},
			commands: {
				deploy: () => {
					commandHandler();
				},
			},
		}, p => p, ['--debug', 'deploy']);

		expect(parsed.command).toBe('deploy');
		expect<boolean | undefined>(parsed.flags.debug).toBe(true);
		expect(commandHandler.called).toBe(true);
	});

	test('command via alias', async () => {
		const handlerSpy = spy();

		const parsed = await cli({
			name: 'my-cli',
			commands: {
				install: {
					alias: 'i',
					loader: () => {
						handlerSpy();
					},
				},
			},
		}, p => p, ['i']);

		expect(parsed.command).toBe('install');
		expect(handlerSpy.called).toBe(true);
	});

	test('callback receives parsed argv and runCommand', async () => {
		const callbackSpy = spy();

		await cli(
			{
				name: 'my-cli',
				parameters: ['<source>'],
				flags: {
					minify: Boolean,
				},
			},
			(parsed) => {
				expect<string>(parsed._.source).toBe('app/');
				expect<boolean | undefined>(parsed.flags.minify).toBe(true);
				callbackSpy();
			},
			['app/', '--minify'],
		);

		expect(callbackSpy.called).toBe(true);
	});

	test('command with alias array', async () => {
		const handlerSpy = spy();

		const parsed = await cli({
			name: 'my-cli',
			commands: {
				remove: {
					alias: ['rm', 'del'],
					loader: () => {
						handlerSpy();
					},
				},
			},
		}, p => p, ['del']);

		expect(parsed.command).toBe('remove');
		expect(handlerSpy.called).toBe(true);
	});

	test('multiple commands with mixed entry types', async () => {
		const buildSpy = spy();
		const testSpy = spy();

		const options = {
			name: 'my-cli',
			version: '2.0.0',
			flags: {
				verbose: Boolean,
			},
			commands: {
				build: () => {
					buildSpy();
				},
				test: {
					description: 'Run tests',
					alias: 't',
					loader: () => {
						testSpy();
					},
				},
			},
		} as const;

		// Test shorthand function command
		const buildResult = await cli({ ...options }, p => p, ['build', '--verbose']);

		expect(buildResult.command).toBe('build');
		expect(buildSpy.called).toBe(true);
		expect(testSpy.called).toBe(false);

		// Test full object command via alias
		const testResult = await cli({ ...options }, p => p, ['t']);

		expect(testResult.command).toBe('test');
		expect(testSpy.called).toBe(true);
	});

	test('runCommand is callable manually in callback', async () => {
		const commandSpy = spy();
		let runCommandCalledManually = false;

		await cli(
			{
				name: 'my-cli',
				commands: {
					serve: () => {
						commandSpy();
					},
				},
			},
			async ({ runCommand }) => {
				if (runCommand) {
					runCommandCalledManually = true;
					await runCommand();
				}
			},
			['serve'],
		);

		expect(runCommandCalledManually).toBe(true);
		expect(commandSpy.called).toBe(true);
		expect(commandSpy.callCount).toBe(1);
	});

	test('command auto-invoked without callback', async () => {
		const commandSpy = spy();

		const parsed = await cli({
			name: 'my-cli',
			commands: {
				lint: () => {
					commandSpy();
				},
			},
		}, p => p, ['lint']);

		await parsed.runCommand();
		expect(parsed.command).toBe('lint');
		expect(commandSpy.called).toBe(true);
		expect(commandSpy.callCount).toBe(1);
	});
});
