# Automatic updates

RaBit updates itself. People who already have it installed never download anything by hand or visit GitHub:
the app checks quietly, shows a download icon in the top bar when there is a new version, and installs it with one click.

```
app starts ──► check (and every 6 h) ──► nothing new: no UI at all
                                     └─► new version: ⬇ icon (orange dot) next to the bell
click the icon ► panel: "Update available", vX.Y.Z, "What's new", [Update] [Later]
[Update]       ► downloads in the background (progress ring on the icon, bar + % in the panel)
done           ► [Restart to update] ► installs, relaunches, your data is intact
closed earlier ► an already-downloaded update is installed when the app exits
first launch   ► the RaBit terminal types "> UPDATED TO vX.Y.Z" and one "What's new" line
failure        ► "Couldn't update — try again" + Retry (never a crash or a native dialog)
```

How it is built: `tauri-plugin-updater` (check, download, signature check, install) and `tauri-plugin-process` (`relaunch`),
both desktop-only. The logic lives in `src/services/updater.ts` (a small state machine: `idle | checking | available |
downloading | ready | error`), the UI in `src/app/UpdateButton.tsx` and `src/app/useUpdatedNotice.ts`.

## 1. Signing keys (one time, done by a person)

Updates are verified with a signature, so a tampered download is rejected. Generate a key pair:

```bash
npx tauri signer generate -w ~/.tauri/rabit.key
```

It asks for a password (you may leave it empty) and creates two files:

| File                 | What it is      | Where it goes                                                                                                                          |
| -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `rabit.key.pub`      | **public** key  | `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` (replace `<PUBLIC_KEY_HERE>` with the file's whole content)                     |
| `rabit.key`          | **private** key | GitHub → Settings → Secrets and variables → Actions → **`TAURI_SIGNING_PRIVATE_KEY`** (paste the file's content). **Never commit it.** |
| the password you set | password        | Secret **`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`** (create it empty if there is no password)                                              |

Also set the repository in the same file: `plugins.updater.endpoints` →
`https://github.com/<OWNER>/<REPO>/releases/latest/download/latest.json` (replace `<OWNER>/<REPO>`).

> **Back the private key up somewhere safe.** If you lose it, installed apps can no longer verify new updates and
> everyone would have to reinstall by hand once. Do not change the public key lightly for the same reason.

## 2. Publishing a new version

1. Bump the version in the **three** places (they must match): `package.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml` (and `src-tauri/Cargo.lock` follows when you build).
2. Add a `## 1.3.0` section to `CHANGELOG.md`. Its bullets become the release notes and the app's **What's new** list
   (keep them short and user-facing; one per line).
3. `npm run release:check` — fails if the versions differ.
4. Commit, then tag and push: `git tag v1.3.0 && git push origin v1.3.0`.
5. The workflow `.github/workflows/release.yml` does the rest: type-checks, runs the tests, builds Windows and macOS
   (universal), **signs** the updater artifacts, creates the release and uploads the installers plus `latest.json`.

Installed apps pick the new version up on their next check (at start, or within 6 hours if open).

Local builds (`npm run package:beta`) do not need the private key: the script turns the updater artifacts off for that
run, because `bundle.createUpdaterArtifacts` requires signing. The official build is the one from the workflow.

## 3. Testing the flow locally (no release needed)

In development the real check is **disabled**; there is a simulation that walks the whole flow with the same UI:

```bash
npm run tauri:update-sim       # the desktop app (tauri dev) with the simulation on
npm run dev:update-sim         # the same UI in a browser (http://localhost:1420)
# or open any dev URL with  ?update-sim  at the end
```

After about 1.5 s the ⬇ icon appears next to the bell. Click it → **Update** → the ring and the bar fill for ~4 s →
**Restart to update**. The "restart" reloads the app as if v(next minor) were installed, and the Home terminal types
`> UPDATED TO v…` once. To repeat it, clear `rabit.updater.simInstalled` and `rabit.updater.lastSeenVersion` from
`localStorage` (DevTools → Application).

`VITE_RABIT_UPDATE_SIM` and `?update-sim` are ignored in production builds.

Unit tests for the state machine, the error paths and the "UPDATED TO" notice: `npm test` (`tests/updater.test.ts`).
Rust tests for the database backup: `cd src-tauri && cargo test`.

## 4. What happens to the user's data

- Everything lives **outside the app bundle**, in the per-user config directory (`app_config_dir`, e.g.
  `%APPDATA%\app.rabit.desktop\` on Windows): the SQLite file `rabit.db` holds tasks, events, notes, routine, Savings and
  settings. Installing or replacing the app never touches that folder.
- **Migrations run automatically** when the new version starts (`PRAGMA user_version`, append-only, see
  `src/db/migrations.ts`). Never edit an existing migration; add a new one.
- **Backup before upgrading.** On the first start of a version different from the last one that ran, the app copies
  `rabit.db` to `rabit.backup-<previous version>.db` (plus its `-wal` file) _before_ the frontend opens the database and
  migrates. Only the **3 most recent** backups are kept. The version of the last run is recorded in `last_version.txt` in
  the same folder. Implementation and tests: `src-tauri/src/backup.rs`.
- To go back after a bad update: close RaBit, copy the wanted `rabit.backup-….db` over `rabit.db` (delete `rabit.db-wal`
  and `rabit.db-shm` if present) and install the older version.
- The "UPDATED TO" notice only uses small flags in the webview's `localStorage` (`rabit.updater.lastSeenVersion`,
  `rabit.updater.pending`); losing them just skips the message.

## Manual steps that still need a person

1. Generate the signing keys (section 1).
2. Put the **public key** and the real `<OWNER>/<REPO>` in `src-tauri/tauri.conf.json`.
3. Add the secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to the GitHub repository.
4. Publish a first release (`v0.1.0` or later) so there is a `latest.json`; apps built **before** this feature existed
   cannot update themselves, so that first build has to be installed once by hand.
5. Optional: macOS builds are not notarized by the workflow; add Apple signing secrets if you distribute on macOS.
