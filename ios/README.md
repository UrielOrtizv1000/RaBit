# RaBitIOS

Native iPhone/iPad client for RaBit. **SwiftUI**, local-first, no network, no accounts.

> Status: not started. This folder is the placeholder for the Xcode project.

## Contract

Follow [`../shared/`](../shared): the SQLite schema (`schema/v1.sql`), the `.json` backup
format and the design tokens. Test your importer against `../shared/fixtures/sample-backup.json`.

## Planned layout

```
ios/
  RaBitIOS.xcodeproj
  RaBitIOS/
    App/           entry point, tab bar, navigation
    Domain/        pure models and rules (mirror src/domain)
    Data/          SQLite access, migrations, repository
    Features/      Home, Calendar, Routine, Notes, Settings, Onboarding
    Services/      reminders (UserNotifications), backup import/export
    Resources/     Assets.xcassets, Localizable.xcstrings (en, es)
  RaBitIOSTests/
```

## Decisions to make first

- Persistence: SQLite via GRDB or SwiftData over the same schema (the backup format must stay identical either way).
- Minimum iOS version.
- Bundle id (desktop uses `app.rabit.desktop`; suggested `app.rabit.ios`).
- App icon: reuse `../src-tauri/icons/ios/` (already generated).

## Rules

Same as the rest of the repo: no telemetry, no secrets in the diff, Conventional Commits
(scope `ios`), see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
