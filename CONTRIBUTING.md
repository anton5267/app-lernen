# Contributing to Movie Finder

Thanks for your interest in improving Movie Finder.

## Before You Start

1. Check open issues and existing pull requests.
2. For bug fixes, include clear reproduction steps.
3. For features, describe user impact and scope.

## Development Setup

From repository root:

```bash
npm run setup
```

Run services:

```bash
npm run backend
npm run web
```

## Branching

- Use feature branches from `master`
- Naming examples:
  - `feat/search-ui-improvements`
  - `fix/oauth-web-flow`
  - `docs/release-notes-update`

## Code Quality Requirements

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:backend
```

If your change affects static web output:

```bash
npm run web:export
```

## Pull Request Checklist

- Keep PR focused on a single logical change.
- Add/update tests when behavior changes.
- Update docs (`README`, `docs/*`) when setup or UX changes.
- Include screenshots or short video for UI changes.
- Confirm no secrets are committed (`.env`, API keys, tokens).

## Commit Message Style

Use clear conventional-style messages, for example:

- `feat: add compact external search cards`
- `fix: handle empty youtube query without api request`
- `docs: update github pages setup guide`

## Security

For security issues, do not open a public issue.
Please follow [SECURITY.md](./SECURITY.md).
