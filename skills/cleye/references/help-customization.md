# Help Customization

Use this reference only when declarative help metadata is not enough. Most CLIs
should start with `name`, `version`, `help.description`, `help.usage`, and
`help.examples`.

## Declarative Help First

```ts
cli({
    name: 'cheat',
    version: '1.2.3',
    flags: {
        topic: {
            type: String,
            alias: 't',
            description: 'Cheat sheet topic',
            default: 'tar'
        }
    },
    help: {
        description: 'Quick command reminders.',
        examples: [
            'cheat -t tar',
            'cheat --topic git-rebase'
        ]
    }
})
```

`--help` prints long help. `-h` prints short help. If both are present,
`--help` wins.

## Extending Default Help

`help.render` receives the resolved CLI options and a render context containing
`form: 'long' | 'short'`. Return a component, a component array, or a string:

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

Use this for small additions, such as a footer or banner, without replacing the
whole default layout.

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
| `p(text)` | Paragraph text wrapped to terminal width. |
| `usage(name, pattern)` | Styled usage line. |
| `section(title, ...body)` | Heading plus body components. |
| `cmds(commands)` | Command table. |
| `flags(list)` | Auto-responsive flag table. |
| `flagsInline(list)` | Force inline flag table. |
| `flagsHanging(list)` | Force hanging flag table. |
| `footer(text)` | Literal trailing text. |

Use `cleye/help/responsive` when display-width-aware alignment matters for CJK,
emoji, or other wide characters:

```ts
import { flags, section } from 'cleye/help/responsive'
```

Use `render(...nodes)` or `renderToString(result)` only when manually rendering
outside cleye. `cli()` already renders the return value of `help.render`.
