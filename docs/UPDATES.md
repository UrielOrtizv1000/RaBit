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

## How the app knows there is an update, and why it can be trusted

```
RaBit (installed)                                   GitHub (public repo)
  ├─ endpoint, hard-coded in the app ────────────►  releases/latest/download/latest.json
  │    https://github.com/UrielOrtizv1000/RaBit/…      { version, notes, url, signature }
  ├─ is `version` newer than mine? (semver; never an older one)
  ├─ download `url` over HTTPS (only https is accepted in installed builds)
  ├─ verify `signature` with the PUBLIC key embedded in the app
  └─ valid → install · invalid → rejected, nothing is installed
```

- **Where the information comes from:** only from the endpoint written in `src-tauri/tauri.conf.json`, which is compiled into
  the app. A manifest hosted anywhere else is never consulted. The request has no template variables, so GitHub does not
  even learn the installed version; it only sees the usual IP address and User-Agent of any HTTPS request.
- **The public key is not a secret.** It only _verifies_ signatures; with it nobody can create one. Anyone can read it
  from the app or this repository.
- **The private key is the only thing that can authorize an update.** Without it, a tampered installer, a fake
  `latest.json` or even full control of the GitHub release is rejected by every installed app.
- **What an attacker would need to push a malicious update:** the private key _and_ a way to publish to this repository's
  releases (or to break TLS to github.com). Protect both.

### Protecting the private key and the release

1. Keep `rabit.key` out of the repository, with a **password**, and keep one offline backup. Never paste it in chats or issues.
2. The only place it lives online is the GitHub Actions secrets `TAURI_SIGNING_PRIVATE_KEY` and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, used by `release.yml` and nothing else.
3. Enable two-factor authentication on the GitHub account that owns the repository.
4. In GitHub → Settings → Rules, protect tags `v*` so only the owner can create them, and keep `main` protected.
5. Third-party actions in `release.yml` are pinned by commit SHA, because that workflow can read the signing key.
6. If the key is ever exposed: generate a new pair, run `npm run release:set-pubkey`, publish a release signed with the
   **old** key that ships the new public key, and revoke the old secret. Installed apps can only be rotated to a new key
   through an update signed by the old one, which is why leaks must be handled quickly.

### Rules for when accounts (e.g. Gmail) arrive

Updating must never be able to expose them:

- Account tokens go in the operating system's credential store (Windows Credential Manager, macOS Keychain), **never**
  in `rabit.db`, in the `.json` export, in `rabit.backup-*.db` files or in logs.
- The update request carries no user data, no account identifiers and no tokens; keep it that way.
- Any code that handles accounts must be reviewed against `SECURITY.md` before it ships.

## 1. Signing keys (one time, done by a person)

Updates are verified with a signature, so a tampered download is rejected. Generate a key pair:

```bash
npx tauri signer generate -w ~/.tauri/rabit.key
```

Set a **password** when it asks (an empty one works but leaves the key unprotected if the file leaks). It creates two files:

| File                 | What it is      | Where it goes                                                                                                                           |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `rabit.key.pub`      | **public** key  | `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` (run `npm run release:set-pubkey` to copy it, or paste the file's whole content) |
| `rabit.key`          | **private** key | GitHub → Settings → Secrets and variables → Actions → **`TAURI_SIGNING_PRIVATE_KEY`** (paste the file's content). **Never commit it.**  |
| the password you set | password        | Secret **`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`** (GitHub does not accept empty secrets: if the key has no password, do not create it)    |

The repository is already set in the same file (`plugins.updater.endpoints` →
`https://github.com/UrielOrtizv1000/RaBit/releases/latest/download/latest.json`). Change it only if you fork the project;
`npm run release:check` refuses `<OWNER>`, `<REPO>` and `<PUBLIC_KEY_HERE>` placeholders.

> **Back the private key up somewhere safe.** If you lose it, installed apps can no longer verify new updates and
> everyone would have to reinstall by hand once. Do not change the public key lightly for the same reason.

## 2. Publishing a new version

1. Bump the version in the **three** places (they must match): `package.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml` (and `src-tauri/Cargo.lock` follows when you build).
2. Add a `## 0.2.0` section to `CHANGELOG.md`. Its bullets become the release notes and the app's **What's new** list
   (keep them short and user-facing; one per line).
3. `npm run release:check` — fails if the versions differ.
4. Commit, then tag and push: `git tag v0.2.0 && git push origin v0.2.0`.
5. The workflow `.github/workflows/release.yml` does the rest: type-checks, runs the tests, builds Windows and macOS
   (universal), **signs** the updater artifacts, creates the release and uploads the installers plus `latest.json`.

Installed apps pick the new version up on their next check (at start, or within 6 hours if open).

Local builds (`npm run package`) do not need the private key: the script turns the updater artifacts off for that
run, because `bundle.createUpdaterArtifacts` requires signing. The official build is the one from the workflow.

## 3. Testing the flow locally (no release needed)

In development the real check is **disabled**; there is a simulation that walks the whole flow with the same UI:

```bash
npm run update-sim            # the desktop app (tauri dev) with the simulation on
npm run update-sim:web        # the same UI in a browser (http://localhost:1420)
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

1. Generate the signing keys (section 1) and keep a copy of the private key outside the repository.
2. Put the **public key** in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). The endpoint already points to
   `UrielOrtizv1000/RaBit`. `npm run release:check` fails while any `<…>` placeholder is left.
3. Add the secret `TAURI_SIGNING_PRIVATE_KEY` to the GitHub repository, and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key has a password.
4. Publish a first release with a `v*` tag as a **normal release, not a pre-release** (`releases/latest` ignores
   pre-releases). Apps built **before** this feature existed (the `0.1.0-beta` installer) cannot update themselves, so
   that first build has to be installed once by hand. The workflow's last job (`Verify updater manifest`) fails if
   `latest.json` is missing, is not for this version or has no Windows signature.
5. Optional: macOS builds are not notarized by the workflow; add Apple signing secrets if you distribute on macOS.
   Windows installers are not code-signed either, so SmartScreen may warn on first run.
