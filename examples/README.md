# cleye examples

Examples are numbered by reading order. Each one introduces **one new concept** on top of the previous; nothing earlier uses anything from later. Each file's docstring header lists exact commands to try.

## The basics

- [`01-minimal`](./01-minimal/index.ts) — the simplest possible CLI: `cli()` with flags, no params, no commands. Fits on one screen.
- [`02-parameters`](./02-parameters/index.ts) — positional arguments: `<required>`, `[optional]`, `<spread...>`. Reimplements a `cp`-style invocation.
- [`03-flag-types`](./03-flag-types/index.ts) — flag mechanics beyond String/Number/Boolean: custom types from `cleye/formats` (`OneOf`, `Integer`), array flags, `booleanFlagNegation` for `--no-<flag>` shorthand. Vehicle: `cowsay`-like.
- [`04-help`](./04-help/index.ts) — declarative help: `version`, `help.description`, `help.examples`. Auto-injected `--help` / `--version`. Vehicle: a tiny `weather` CLI.

## Commands

- [`05-npm`](./05-npm/index.ts) — multi-command CLI with lazy-loaded subcommands and aliases. Reimplements `npm install` + `npm run-script`.
- [`06-strict-mode`](./06-strict-mode/index.ts) — `strictFlags` + `strictCommands` with typo suggestions, including alias-aware suggestions.

## Composition

- [`07-git`](./07-git/index.ts) — passing data parent → child via `runCommand(data)`. Default-export command style. Reimplements `git -C <path>` and `git --no-pager` flowing into subcommands.
- [`08-embedded`](./08-embedded/index.ts) — `throwOnExit` + `CleyeExit` for embedding cleye in a host process (wrapper, service, test harness) that shouldn't terminate.

## Variants

- [`09-sync-mode`](./09-sync-mode/index.ts) — `cli()` without a callback. Sync return, but you must call `argv.runCommand()` yourself if you have commands. (Read `07-git` first to understand `runCommand`.)

## Custom help layouts

- [`10-tsc`](./10-tsc/index.ts) — building a complex help page from scratch with the `cleye/help` component API. Reach for this when declarative help (`04-help`) isn't shaped right. Reimplements the TypeScript compiler's intricate help.
