# Contributing to RaBit

Thanks for wanting to help. RaBit is a small, local-first app and it is
developed in the open, so contributions of every size are welcome — bug
reports, documentation fixes, translations, or code.

By taking part you agree that your contribution is licensed under the same
terms as the project: the GNU General Public License v3.0.

## Before you start

- **Read the architecture doc.** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
  explains the layer rules and *why* the code is arranged the way it is. Most
  review comments are about those rules.
- **For anything non-trivial, open an issue first.** A short issue describing
  the problem and your intended approach saves a lot of rework. Small fixes and
  typo corrections can go straight to a pull request.
- **Keep it local-first.** No telemetry, no analytics, no network calls, no
  accounts, and no new runtime dependency that phones home. That is a project
  requirement, not a preference.

## Setting up

```bash
npm install
npm run tauri dev
```

You need Node 20+, npm, a stable Rust toolchain, and the Tauri 2 system
dependencies for your platform.

## Branching and commits

Branch names carry a type prefix and are short-lived: `feat/…`, `fix/…`,
`chore/…`, `docs/…`, `test/…`.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
with a real sentence in the subject and a body that explains **why** the change
is needed — not what the diff already shows.

```
fix(calendar): keep overlapping events inside the day grid

Nine overlapping events used to split the day view into unreadable
strips. Cap the columns at three and show a "+N" counter for the rest.
```

Direct commits to `main` are blocked; open a pull request. Every pull request
gets squashed, and the branch is deleted afterwards.

## What has to pass

Run these before opening a pull request — CI runs the same commands:

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # oxlint
npm run format:check  # prettier --check
npm test              # vitest (logic, persistence, i18n coverage)
npm run test:e2e      # playwright
```

Notes:

- `npm test` fails if a UI string has no Spanish translation. Add the
  translation in `src/i18n/es/` for any new text.
- If you change behaviour, add or update a test. Logic in `src/domain` is pure
  and easy to test — that is deliberate.
- Keep the layering intact: a layer may only import from the ones to its right
  in the diagram in `docs/ARCHITECTURE.md`.

## Reviews

A maintainer will review your pull request. Expect questions about the
approach, not just the syntax. If a review asks for a change, push another
commit to the branch — the squash merge means the history does not need to be
tidy.

## Reporting bugs

Open an issue with:

- what you did,
- what you expected,
- what happened instead,
- your OS and RaBit version (Settings shows it),
- and, if it is a UI problem, a screenshot.

Please do not include your `rabit.db` or an exported backup — it contains your
personal data.
