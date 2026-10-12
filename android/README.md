# RaBitAndroid

Native Android client for RaBit. **Kotlin + Jetpack Compose**, local-first, no network, no accounts.

> Status: not started. This folder is the placeholder for the Gradle project.

## Contract

Follow [`../shared/`](../shared): the SQLite schema (`schema/v1.sql`), the `.json` backup
format and the design tokens. Test your importer against `../shared/fixtures/sample-backup.json`.

## Planned layout

```
android/
  settings.gradle.kts
  build.gradle.kts
  app/
    src/main/kotlin/app/rabit/android/
      app/         Activity, navigation
      domain/      pure models and rules (mirror src/domain)
      data/        Room/SQLite, migrations, repository
      features/    home, calendar, routine, notes, settings, onboarding
      services/    reminders (AlarmManager/WorkManager), backup import/export
    src/main/res/  strings (values, values-es), launcher icons
    src/test/      unit tests
    src/androidTest/
```

## Decisions to make first

- Persistence: Room over the same schema (the backup format must stay identical).
- `minSdk` / `targetSdk`.
- Application id (desktop uses `app.rabit.desktop`; suggested `app.rabit.android`).
- Launcher icons: reuse `../src-tauri/icons/android/` (already generated).
- Exact-alarm permission strategy for reminders (Android 12+).

## Rules

Same as the rest of the repo: no telemetry, no secrets in the diff, Conventional Commits
(scope `android`), see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
