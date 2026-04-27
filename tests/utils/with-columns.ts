// Temporarily override `process.stdout.columns` for help-rendering tests.
// Returns a restore function so callers can pair with try/finally.
//
// Why a helper: `process.stdout.columns` is a global. Tests that mutate it
// inline (without restoring) leak the value into every spec that runs after,
// silently changing wrap behavior. Past bugs in `tests/specs/help.ts` had to
// defensively re-set the value as a workaround. Use this helper instead.

export const withColumns = (columns: number) => {
	const original = process.stdout.columns;
	process.stdout.columns = columns;
	return () => {
		process.stdout.columns = original;
	};
};
