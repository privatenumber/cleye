// Temporarily replace `process.argv` for tests that exercise script-name
// inference, hashbang scenarios, etc. Pair with `.restore()` (or `using`
// once the engines minimum allows the syntax) to avoid leaking state.

export const mockArgv = (mockedArgv: string[]) => {
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
