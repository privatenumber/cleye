# Help documentation
_Cleye_ uses all information provided to generate rich help documentation. The more information you give, the better the docs!

## Dynamic help options

`help` can be a function that receives `{ name, command, version }` and returns the help options. Use it to reference the command name without repeating it — handy for `examples` and `usage`:

```ts
cli({
    name: 'mycli',
    help: ({ command }) => ({
        examples: [
            `${command} search <query>`,
            `${command} get <id>`
        ]
    })
})
```

The context:

- `name` — the command's own name (the program name at the root).
- `command` — the full invocation path the user types, e.g. `mycli remote add` for a nested command. Equals `name` at the root.
- `version` — the configured version, if any.

Because `command` is the full path, a nested command's `--help` renders `Usage: mycli remote add …` instead of just the leaf name.

## Help customization

_Cleye_'s default help output is built by composing components — small rendering units exported from `cleye/help`. To customize the output, pass a `help.render` function that returns an array of components (cleye joins them with blank lines). A single component or a pre-rendered string also work.

### Tweak the default

The most common need is to append content or prepend a header. `defaultHelp` returns an array of components — spread it and add your own:

```ts
import { cli } from 'cleye'
import { defaultHelp, footer } from 'cleye/help'

cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: (options, { form }) => [
            ...defaultHelp(options, { form }),
            footer('More at https://example.com/docs')
        ]
    }
})
```

### Fully custom layout

Build the output entirely from components imported from `cleye/help`:

```ts
import { cli } from 'cleye'
import {
    p, usage, section, flags, footer
} from 'cleye/help'

cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: options => [
            p('Custom CLI description.'),
            usage(options.name ?? 'mycli', '[flags...]'),
            section('Options', flags([
                {
                    long: 'verbose',
                    description: 'Enable verbose logging'
                }
            ])),
            footer('https://example.com/docs')
        ]
    }
})
```

### Force a specific flag layout

`cleye/help`'s `flags()` always uses the columns layout. (In `cleye/help/responsive`, `flags()` switches between columns and stacked based on terminal width.) To render a fixed layout directly, use `flagsColumns` or `flagsStacked`:

```ts
import { cli } from 'cleye'
import { section, flagsStacked } from 'cleye/help'

cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: () => section('Options', flagsStacked([
            {
                long: 'verbose',
                description: 'Enable verbose logging'
            }
        ]))
    }
})
```

### Available components (`cleye/help`)

| Component | Signature | Description |
| - | - | - |
| `p` | `p(text)` | Paragraph |
| `usage` | `usage(name, pattern)` | Styled `Usage: name pattern` line |
| `section` | `section(title, ...body)` | Bold heading followed by body nodes |
| `cmds` | `cmds(commands)` | Two-column command table |
| `flags` | `flags(list)` | Flag table; columns layout in `cleye/help`, adjusts to terminal width in `cleye/help/responsive` |
| `flagsColumns` | `flagsColumns(list)` | Flag table, columns layout (description aligned beside each flag) |
| `flagsStacked` | `flagsStacked(list)` | Flag table, stacked layout (description on its own indented line below each flag) |
| `footer` | `footer(text)` | Literal trailing text |
| `render` | `render(...nodes)` | Joins nodes into a string. cleye does this for you when `help.render` returns components; export is for testing or manual rendering. |
| `defaultHelp` | `defaultHelp(options, { form? })` | Returns the default help document as a component array — spread it to extend |

These default components are **static**: columns are aligned, but there's no terminal-width awareness, so long descriptions overflow rather than wrap. For help that wraps to the terminal width, degrades `flags` to a stacked layout on narrow terminals, and aligns CJK/emoji/wide characters by display width, import the same components (plus `defaultHelp`) from `cleye/help/responsive` instead.

