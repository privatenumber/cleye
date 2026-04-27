import { spyOn } from 'nanospy';

const noop = () => {};

export const mockEnvFunctions = () => {
	const consoleLog = spyOn(console, 'log', noop);
	const consoleError = spyOn(console, 'error', noop);
	// @ts-expect-error noop
	const processExit = spyOn(process, 'exit', noop);

	const restore = () => {
		consoleLog.restore();
		consoleError.restore();
		processExit.restore();
	};

	return {
		consoleLog,
		consoleError,
		processExit,
		restore,
		[Symbol.dispose]: restore,
	};
};
