import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';

const mockArgv = (mockedArgv: string[]) => {
	const original = process.argv;
	process.argv = mockedArgv;
	const restore = () => {
		process.argv = original;
	};
	return {
		restore,
		[Symbol.dispose]: restore,
	};
};

describe('script name inference', () => {
	test('falls back to basename of process.argv[1] when name is omitted', () => {
		const argv = mockArgv(['/usr/local/bin/node', '/path/to/my-script.ts']);
		const mocked = mockEnvFunctions();
		cli({}, undefined, ['--help']);
		mocked.restore();
		argv.restore();

		const help = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
		expect(help.startsWith('my-script.ts')).toBe(true);
	});

	test('shebang invocation: ./script.ts produces basename "script.ts"', () => {
		// Shebang scripts: shell often resolves the path; argv[1] may be relative
		// or absolute. basename strips the directory either way.
		const argv = mockArgv(['/usr/local/bin/node', './script.ts']);
		const mocked = mockEnvFunctions();
		cli({}, undefined, ['--help']);
		mocked.restore();
		argv.restore();

		const help = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
		expect(help.startsWith('script.ts')).toBe(true);
	});

	test('installed bin: argv[1] is the resolved entry file, not the bin name', () => {
		// CURRENT BEHAVIOR (not necessarily ideal): when a package is installed
		// globally and invoked by its bin name, Node receives the resolved entry
		// file path in argv[1] — NOT the bin name the user typed. cleye uses
		// `path.basename(argv[1])`, so help shows the entry filename.
		//
		// In practice users should pass `name` explicitly for published bins.
		// This test pins what we currently produce so a behavior change would
		// be deliberate.
		const argv = mockArgv(['/usr/local/bin/node', '/usr/local/lib/node_modules/mycmd/dist/cli.js']);
		const mocked = mockEnvFunctions();
		cli({}, undefined, ['--help']);
		mocked.restore();
		argv.restore();

		const help = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
		expect(help.startsWith('cli.js')).toBe(true);
		expect(help.startsWith('mycmd')).toBe(false);
	});

	test('empty / missing argv[1] does not crash; renders without a name header', () => {
		// path.basename('') === '' → name is empty, header line is omitted.
		// With no params/commands either, the empty CLI renders just the Flags
		// section. The point: doesn't crash, and doesn't fabricate a name.
		const argv = mockArgv(['/usr/local/bin/node']);
		const mocked = mockEnvFunctions();
		cli({}, undefined, ['--help']);
		mocked.restore();
		argv.restore();

		const help = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
		expect(help.startsWith('Flags:')).toBe(true);
	});

	test('explicit name: "" is honored (does NOT fall back to argv[1])', () => {
		// Falsy-but-defined name: `??` only triggers fallback for null/undefined,
		// so `name: ''` keeps the empty name. Pinning current semantics.
		const argv = mockArgv(['/usr/local/bin/node', '/path/to/my-script.ts']);
		const mocked = mockEnvFunctions();
		cli({ name: '' }, undefined, ['--help']);
		mocked.restore();
		argv.restore();

		const help = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
		expect(help.startsWith('my-script.ts')).toBe(false);
		expect(help.startsWith('Flags:')).toBe(true);
	});

	test('native-binary scenario (Bun/pkg compile): argv[0] would be the bin name, but cleye reads argv[1]', () => {
		// When cleye is bundled into a native binary (bun build --compile, pkg, etc.),
		// argv[0] is the binary name and argv[1] is the first argument (or undefined).
		// CURRENT BEHAVIOR: cleye reads argv[1], so the binary name in argv[0] is
		// ignored — name falls back to basename of argv[1] (often a non-name token
		// like a flag) or empty if argv[1] is missing.
		//
		// This test pins that limitation. A future enhancement could detect this
		// case (e.g., when argv[0] doesn't end in "node") and use argv[0] instead.
		const argv = mockArgv(['/usr/local/bin/mycmd']);
		const mocked = mockEnvFunctions();
		cli({}, undefined, ['--help']);
		mocked.restore();
		argv.restore();

		const help = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
		// argv[1] is undefined → name falls back to '' → no name header.
		expect(help.startsWith('mycmd')).toBe(false);
		expect(help.startsWith('Flags:')).toBe(true);
	});
}, { parallel: false });
