/**
 * Fixture used by cli-sync.ts to verify the `() => import(...)` loader
 * pattern at runtime — exports a default function whose return is awaited
 * and forwarded by `runCommand`.
 */
const dynamicCommand = (input: { value: number }) => ({
	doubled: input.value * 2,
	source: 'dynamic-command.ts',
});

export default dynamicCommand;
