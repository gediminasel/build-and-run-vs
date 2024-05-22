# Instructions for developers

## Contributing

Please open an issue to discuss an existing bug/a new feature before sending
PRs.

New features are welcome if they don't complicate the code base.

## Working with the code

### Testing local version

Use "Run and Debug" feature in VSCode and choose "Run Extension".

### Building a local package

```sh
vsce package
```

### Publishing to VS marketplace

Used by the owner to publish new versions.

```sh
vsce publish
```
