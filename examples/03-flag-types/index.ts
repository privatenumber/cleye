/**
 * Flag mechanics beyond the basics — `OneOf`, `Integer`, array flags,
 * `booleanFlagNegation`.
 *
 * Any function `(input: string) => T` works as a flag's `type`. Wrap a type
 * in an array (`type: [Number]`) to accept multiple values. The
 * `cleye/formats` subpath ships canonical helpers — `OneOf`, `Integer`,
 * `Float`, `Range`, `CommaList`, `Url` — that throw with friendly messages
 * when the input is invalid.
 *
 * Vehicle: a tiny `cowsay`-like — pick a style, repeat the message N times,
 * sprinkle some moods, optionally enable rainbow mode.
 *
 * Usage:
 *  node examples/03-flag-types/index.ts --message hi --style fancy --repeat 3
 *  node examples/03-flag-types/index.ts -m hi -s fancy --mood happy --mood proud
 *  node examples/03-flag-types/index.ts --rainbow                # rainbow on
 *  node examples/03-flag-types/index.ts --no-rainbow             # rainbow off
 *  node examples/03-flag-types/index.ts --style weird   # → "one of: classic, fancy"
 *  node examples/03-flag-types/index.ts --repeat 3.5    # → "Expected an integer"
 */

import { cli } from '#cleye';
import { Integer, OneOf } from '#cleye/formats';

await cli({
	name: 'cowsay',

	// `booleanFlagNegation` enables the `--no-<flag>` form for *every* boolean
	// flag in this CLI. With it on, `--rainbow` (default true) can be turned
	// off explicitly with `--no-rainbow`. Without it, you'd have to declare
	// the negative form yourself (`noRainbow: Boolean`) — see 07-git for that
	// pattern.
	booleanFlagNegation: true,

	flags: {
		message: {
			type: String,
			alias: 'm',
			description: 'What the cow says',
			default: 'moo',
		},
		// `OneOf([...])` narrows the type to the literal union `'classic' | 'fancy'`.
		// Invalid values throw at parse time with the list of valid options.
		style: {
			type: OneOf(['classic', 'fancy']),
			alias: 's',
			description: 'Output style',
			default: 'classic',
		},
		// `Integer` rejects floats, hex literals, etc. with a clear error.
		// (Plain `Number` would silently accept `3.5` or `1e2`.)
		repeat: {
			type: Integer,
			description: 'How many times to repeat',
			default: 1,
		},
		// Array flags: wrap the type in a tuple to collect multiple values.
		// `argv.flags.mood` is typed as `string[]` and defaults to `[]`
		// automatically — no need to declare `default: () => []`.
		mood: {
			type: [String],
			description: 'Moods to display (repeat for multiple)',
		},
		// Boolean default: true. With `booleanFlagNegation` on, users can
		// pass `--no-rainbow` to turn it off.
		rainbow: {
			type: Boolean,
			description: 'Rainbow mode (disable with --no-rainbow)',
			default: true,
		},
	},
}, (argv) => {
	const decoration = argv.flags.style === 'fancy' ? '✨' : '';
	const moods = argv.flags.mood.length > 0 ? ` [${argv.flags.mood.join(', ')}]` : '';
	const rainbowTag = argv.flags.rainbow ? '🌈 ' : '';
	for (let i = 0; i < argv.flags.repeat; i += 1) {
		console.log(`${rainbowTag}${decoration}🐮 ${argv.flags.message}${moods}${decoration}`);
	}
});
