
<p align="center">
	<img width="110" src=".github/logo.webp">
</p>
<h1 align="center">
	cleye
	<br>
	<a href="https://npm.im/cleye"><img src="https://badgen.net/npm/v/cleye"></a> <a href="https://npm.im/cleye"><img src="https://badgen.net/npm/dm/cleye"></a>
</h1>

The intuitive command-line interface (CLI) development tool.

### Features
- Single API — just `cli()`
- Strongly typed parameters and flags
- Commands as lazy imports with automatic argv routing
- Per-command type narrowing on `runCommand` — handler args & return values flow through
- Nested command support
- Middleware-style callbacks with data passing — _or_ flat sync style for top-level use
- `--help` documentation generation (customizable)
- Strict mode for flags and commands with typo suggestions

> [Try it out online](https://stackblitz.com/edit/cleye-demo?devtoolsheight=50&file=examples/greet.ts&view=editor)

<br>

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/cleye">Development repo</a>!</sup></p>

## Install

```bash
npm i cleye
```

## Quick start

Declare your parameters and flags, and cleye gives you a strongly typed `argv` plus generated `--help` — no boilerplate:

```ts
import { cli } from 'cleye'

await cli({
    name: 'greet.js',

    parameters: [
        '<first name>',
        '[last name]'
    ],

    flags: {
        time: {
            type: String,
            description: 'Time of day to greet (morning or evening)',
            default: 'morning'
        }
    }
}, (argv) => {
    const name = [argv._.firstName, argv._.lastName].filter(Boolean).join(' ')
    const greeting = argv.flags.time === 'morning' ? 'Good morning' : 'Good evening'

    console.log(`${greeting} ${name}!`)
})
```

```sh
$ node greet.js John Doe --time evening
Good evening John Doe!
```

Generated `--help`:

```sh
$ node greet.js --help

greet.js

Usage: greet.js [flags...] <first name> [last name]

Flags:
  -h, --help           Show help (-h for short form)
      --time <string>  Time of day to greet (morning or evening) (default: "morning")
```

## Documentation

Full docs live in [`docs/`](./docs):

- [Getting started](./docs/getting-started.md) — install and your first CLI
- [Flags](./docs/flags.md) — defining, validating, grouping, and strict mode
- [Arguments](./docs/arguments.md) — positional parameters and end-of-flags
- [Commands](./docs/commands.md) — subcommands, command files, passing data, nested commands
- [Sync mode](./docs/sync-mode.md) — the no-callback API
- [Help documentation](./docs/help.md) — generated help and customization
- [Embedding](./docs/embedding.md) — running cleye inside a host process
- [API reference](./docs/api.md) — `cli()`, `ParsedArgv`, options, and type exports
- [Migration: v2 → v3](./docs/migration/v2-v3.md)

Browse [`examples/`](./examples) for a numbered, progressive set — start with [`01-minimal`](./examples/01-minimal/index.ts).

## Agent Skills

_Cleye_ ships with a bundled [agent skill](https://agentskills.io) for AI coding assistants, in the package's `skills/` directory.

Projects using [`skills-npm`](https://github.com/antfu/skills-npm) can discover the skill from installed dependencies and link it into supported agent setups.

## Sponsors
<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
