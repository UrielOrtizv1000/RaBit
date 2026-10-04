<!--
Keep it short and concrete. Reviewers read the diff for the "what";
this is for the "why" and for what you actually verified.
-->

## What this changes

<!-- One paragraph. What behaviour changes, and why it needs to change. -->

## Related issue

<!-- Closes #123 — or "none". -->

## How it was tested

<!-- Commands you ran, and what you exercised by hand. -->

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm test`
- [ ] `npm run test:e2e`

## Checklist

- [ ] No network calls, telemetry or accounts were added.
- [ ] The layer rules in `docs/ARCHITECTURE.md` are respected.
- [ ] New UI strings have a Spanish translation in `src/i18n/es/`.
- [ ] Tests were added or updated for behaviour changes.
- [ ] No personal data, database files or secrets are in the diff.
