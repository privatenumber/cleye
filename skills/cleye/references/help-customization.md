# Help Customization

Use this reference only when declarative help metadata is not enough. Most CLIs should start with `name`, `version`, `help.description`, `help.usage`, and `help.examples`.

## Declarative Help First

```ts
cli({
    name: 'weather',
    version: '1.0.0',
    flags: {
        location: {
            type: String,
            alias: 'l',
            description: 'Location to forecast',
            default: 'here'
        }
    },
    help: {
        description: 'Show the local weather forecast.',
        examples: [
            'weather --location Tokyo',
            'weather -l "New York"'
        ]
    }
})
```

`--help` prints long help. `-h` prints short help. If both are present, `--help` wins.

## Dynamic Help (Function Form)

`help` can be a function that receives `{ name, command, version }` and returns the help options. Use it to interpolate the command name into `examples` or `usage` without repeating it:

```ts
cli({
    name: 'weather',
    help: ({ command }) => ({
        examples: [
            `${command} --location Tokyo`,
            `${command} -l "New York"`
        ]
    })
})
```

- `name` — the command's own name (the program name at the root).
- `command` — the full invocation path, e.g. `weather config get` for a nested command; equals `name` at the root.
- `version` — the configured version, if any.

`command` reflects the full path the user types, so a nested command's `--help` shows `Usage: weather config get …` rather than just the leaf.

## Extending Default Help

`help.render` receives the resolved CLI options and a render context containing `form: 'long' | 'short'`. Return a component, a component array, or a string:

```ts
import { cli } from 'cleye'
import { defaultHelp, footer } from 'cleye/help'

await cli({
    name: 'tool',
    flags: { verbose: Boolean },
    help: {
        render: (options, { form }) => [
            ...defaultHelp(options, { form }),
            footer('Docs: https://example.com')
        ]
    }
})
```

Use this for small additions, such as a footer or banner, without replacing the whole default layout.

## Fully Custom Layouts

Build custom documents from `cleye/help` components:

```ts
import { cli } from 'cleye'
import {
    flags,
    footer,
    p,
    section,
    usage,
    type Flag
} from 'cleye/help'

const flagList: Flag[] = [
    {
        long: 'verbose',
        short: 'v',
        description: 'Enable verbose logs'
    }
]

await cli({
    help: {
        render: () => [
            p('Custom CLI description.'),
            usage('tool', '[options] [file...]'),
            section('Options', flags(flagList)),
            footer('https://example.com/docs')
        ]
    }
})
```

Common components:

| Component | Use |
| --- | --- |
| `p(text)` | Paragraph text (verbatim — no wrapping). |
| `usage(name, pattern)` | Styled usage line. |
| `section(title, ...body)` | Heading plus body components. |
| `cmds(commands)` | Command table. |
| `flags(list)` | Flag table; columns layout here, adjusts to terminal width in `cleye/help/responsive`. |
| `flagsColumns(list)` | Columns flag table (description aligned beside each flag). |
| `flagsStacked(list)` | Stacked flag table (description on its own indented line below each flag). |
| `footer(text)` | Literal trailing text. |

The default components (`cleye/help`, and what `cli()` uses) are **static**: columns are aligned, but there is no terminal-width awareness — long descriptions overflow rather than wrap, and `flags` always uses the columns layout. For help that wraps to the terminal width, degrades `flags` to a stacked layout on narrow terminals, and aligns CJK/emoji/wide characters by display width, import the responsive variant instead:

```ts
import { flags, section } from 'cleye/help/responsive'
```

Use `render(...nodes)` or `renderToString(result)` only when manually rendering outside cleye. `cli()` already renders the return value of `help.render`.
