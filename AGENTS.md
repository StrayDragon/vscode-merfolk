# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the TypeScript source. The entry point is `src/extension.ts` (IoC container setup and activation).
- `src/core/` contains the container and shared types; `src/services/` implements features; `src/providers/` wires VS Code commands/providers; `src/ui/` contains the preview webview.
- `assets/` stores webview runtime assets (local Mermaid.js). `syntaxes/` and `language-configuration.json` define the Mermaid language support.
- `dist/` and `out/` are generated build artifacts; avoid editing these directly.
- `docs/` and `examples/` contain design notes and sample diagrams.

## Build, Test, and Development Commands
Use `pnpm` for installs and scripts.

```bash
pnpm install           # Install dependencies
pnpm run watch         # Dev watch: esbuild + tsc --watch
pnpm run compile       # Lint + type check + bundle
pnpm run package       # Production bundle
pnpm run lint          # ESLint for src/
pnpm run check-types   # TypeScript type check
```

`just` is also available for common tasks (`just lint`, `just build`, `just package-vsix`).

## Coding Style & Naming Conventions
- Indentation is 4 spaces; strings typically use single quotes in TypeScript.
- File names are lower camel case (e.g., `previewService.ts`, `commandProvider.ts`).
- Prefer `*Service.ts`, `*Provider.ts`, and `*Panel.ts` suffixes for new modules.
- ESLint is configured in `eslint.config.mjs` (e.g., `eqeqeq`, `curly`, and import naming conventions).

## Testing Guidelines
- Automated tests are not implemented yet; `pnpm run test` is a placeholder.
- CI currently runs `pnpm run lint` and `pnpm run check-types`.
- If you add tests, document the runner in `package.json`, keep files under a `test/` or `src/test/` folder, and use a clear naming pattern such as `*.test.ts`.

## Commit & Pull Request Guidelines
- Commit messages follow a concise `type: summary` format (e.g., `feat: add preview export`, `fix: handle empty link`), sometimes with scopes like `feat(syntax): ...`.
- Common types in history include `feat`, `fix`, `doc`, `refactor`, `ci`, `bump`, and `clean`.
- PRs should include a short description, test/verification steps, and screenshots or GIFs for UI changes. Update `CHANGELOG.md` for user-facing behavior changes.
