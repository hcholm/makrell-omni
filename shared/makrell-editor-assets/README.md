# Makrell Editor Assets

This directory is the shared source of truth for Makrell family editor-facing
assets that should be reused by multiple tools.

Current contents:

- `language-configuration.json`
- `languages.json`
- `snippets/makrell.code-snippets.json`
- `syntaxes/makrell.tmLanguage.json`

Current consumers:

- `vscode-makrell/`
- future browser playground/editor work

For `vscode-makrell`, the checked-in copies under the extension directory are
synced from this folder by `vscode-makrell/scripts/sync-shared-assets.mjs`.
