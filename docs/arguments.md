# Arguments
Arguments are values passed into the script that are not associated with any flags/options.

For example, in the following command, the first argument is `file-a.txt` and the second is `file-b.txt`:

```
$ my-script file-a.txt file-b.txt
```

Arguments can be accessed from the `_` array-property of the returned object.

Example:

```ts
await cli({ /* ... */ }, (argv) => {
    // $ my-script file-a.txt file-b.txt

    argv._ // => ["file-a.txt", "file-b.txt"] (string[])
})
```

## Parameters
Parameters (aka _positional arguments_) are the names that map against argument values. Think of parameters as variable names and arguments as values associated with the variables.

Parameters can be defined in the `parameters` array-property to make specific arguments accessible by name. This is useful for writing more readable code, enforcing validation, and generating help documentation.

Parameters are defined in the following formats:
- **Required parameters** are indicated by angle brackets (eg. `<parameter name>`).
- **Optional parameters** are indicated by square brackets (eg. `[parameter name]`).
- **Spread parameters** are indicated by `...` suffix. Required spread (`<files...>`) needs at least one value; optional spread (`[files...]`) accepts zero or more.

Note, required parameters cannot come after optional parameters, and spread parameters must be last. Names must contain at least one alphanumeric character (after camelCase normalization).

Parameters can be accessed in camelCase on the `_` property of the returned object.

Example:

```ts
await cli({
    parameters: [
        '<required parameter>',
        '[optional parameter]',
        '[optional spread...]'
    ]
}, (argv) => {
    // $ my-script a b c d

    argv._.requiredParameter // => "a" (string)
    argv._.optionalParameter // => "b" (string | undefined)
    argv._.optionalSpread // => ["c", "d"] (string[])
})
```

## End-of-flags
End-of-flags (`--`) (aka _end-of-options_) allows users to pass in a subset of arguments. This is useful for passing in arguments that should be parsed separately from the rest of the arguments or passing in arguments that look like flags.

An example of this is [`npm run`](https://docs.npmjs.com/cli/v8/commands/npm-run-script):
```sh
$ npm run <script> -- <script arguments>
```
The `--` indicates that all arguments afterwards should be passed into the _script_ rather than _npm_.

All end-of-flag arguments will be accessible from `argv._['--']`.

Additionally, you can specify `--` in the `parameters` array to parse end-of-flags arguments.

Example:

```ts
await cli({
    name: 'npm-run',
    parameters: [
        '<script>',
        '--',
        '[arguments...]'
    ]
}, (argv) => {
    // $ npm-run echo -- hello world

    argv._.script // => "echo" (string)
    argv._.arguments // => ["hello", "world"] (string[])
})
```

