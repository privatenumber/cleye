# cleye

The intuitive command-line interface (CLI) development tool.

## Features

- Single API — just `cli()`
- Strongly typed parameters and flags
- Commands as lazy imports with automatic argv routing
- Per-command type narrowing on `runCommand` — handler args & return values flow through
- Nested command support
- Middleware-style callbacks with data passing — _or_ flat sync style for top-level use
- `--help` documentation generation (customizable)
- Strict mode for flags and commands with typo suggestions

## Documentation

- [Getting started](./getting-started.md) — install and your first CLI
- [Flags](./flags.md) — defining, validating, grouping, and strict mode
- [Arguments](./arguments.md) — positional parameters and end-of-flags
- [Commands](./commands.md) — subcommands, command files, passing data, nested commands
- [Sync mode](./sync-mode.md) — the no-callback API
- [Help documentation](./help.md) — generated help and customization
- [Embedding](./embedding.md) — running cleye inside a host process
- [API reference](./api.md) — `cli()`, `ParsedArgv`, options, and type exports
- [Migration: v2 → v3](./migration/v2-v3.md)
