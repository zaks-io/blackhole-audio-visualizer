# Contributing

Thanks for your interest. This is a personal project opened under MIT — issues
and PRs are welcome, but maintenance and review are best-effort.

## Getting set up

See the [Setup section in the README](./README.md#setup). Short version:

```bash
bun install
cp .env.example .env.local     # fill in values
bun dev
```

## Before you open a PR

CI runs these on every PR against `main`. Run them locally first:

```bash
bun run lint
bun run format:check           # or `bun run format` to auto-fix
bun run typecheck
bun run test
```

A pre-commit hook (Husky) and CI also run [gitleaks](https://github.com/gitleaks/gitleaks)
to catch committed secrets. Never commit real credentials — `.env.local` is
gitignored; keep it that way.

## Conventions

- **Keep it simple and DRY.** Small files (aim under ~300 lines), one component
  per file. Code should read as self-documenting; comment the _why_, not the _what_.
- **Naming** — hooks are `use[Feature].ts`; components are PascalCase directories
  with an `index.ts` barrel; shaders are `{purpose}Vertex.glsl` /
  `{purpose}Fragment.glsl`. See [CLAUDE.md](./CLAUDE.md) for the full conventions.
- **Convex** — if you touch the schema or backend functions, commit the generated
  `packages/backend/convex/_generated/` files alongside your changes. They're
  required for Convex to work.
- **Imports** — the frontend imports backend code via `@blackhole/backend/convex/...`.

## Project structure

[CLAUDE.md](./CLAUDE.md) is the source of truth for architecture, the data flow,
key files, and directory conventions. Start there before making structural changes.

## Reporting issues

Open a GitHub issue with steps to reproduce, what you expected, and what happened.
Note whether you hit it on the web or desktop build, and your OS/browser.
