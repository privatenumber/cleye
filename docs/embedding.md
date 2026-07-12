# Embedding cleye in a host process (`throwOnExit`)
By default, cleye calls `process.exit` on `--help`, `--version`, missing required parameters, invalid flag values, `strictFlags`, `strictCommands`, and the sync no-command-match path. If you're embedding cleye inside a larger program (a wrapper script, a long-running service, a test harness) and don't want it to terminate the host process, set `throwOnExit: true` and catch `CleyeExit`:

```ts
import { cli, CleyeExit } from 'cleye'

try {
    cli({
        throwOnExit: true,
        commands: { build: () => import('./commands/build.ts') }
    })
} catch (error) {
    if (error instanceof CleyeExit) {
        // error.code: 0 for --help / --version, 1 for validation failures
        // error.reason: 'help' | 'version' | 'missing-required-parameter' |
        //               'unknown-flag' | 'invalid-flag-value' |
        //               'unknown-command' | 'no-command-match'
        // For 'invalid-flag-value', error.cause is type-flag's FlagParseError.
        // It exposes the flag name, and its cause is the original parser error.
        if (error.code !== 0) {
            console.error('cli failed:', error.reason)
        }
        return
    }
    throw error
}
```

cleye throws `CleyeExit` from the actual exit point (e.g. the line that resolves the unknown command), so stack traces point directly at the source. Inheritance is automatic via try/catch propagation — nesting works without any special wiring.
