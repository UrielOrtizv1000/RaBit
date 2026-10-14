# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository instead, or email the maintainer if that is unavailable.

Include what you would in a bug report — steps to reproduce, the affected
version, and the impact you believe it has. You will get an acknowledgement,
and credit in the fix if you want it.

## Scope

RaBit is a fully local desktop application. That shapes what is and is not a
real concern here:

- **In scope:** the Tauri configuration (window capabilities and the Content
  Security Policy), SQL injection or any other injection through the
  persistence layer, path handling in the export/import flow, unsafe handling
  of imported data, and anything that lets a malicious file or window read or
  write beyond what the app should.

- **Out of scope by design:** there is no server, no account system, no
  authentication, no remote API and no telemetry to attack. The only network request is the update check against this repository's GitHub releases (a signed `latest.json`); there is nothing else to attack on the network side. Reports about the updater's signature check are in scope.

## Design commitments

These are guarantees the code is expected to keep. A pull request that breaks
one of them is a bug:

- No outbound network requests other than the update check against GitHub releases.
- No collection or transmission of user data, ever.
- Future account credentials (e.g. Gmail) are kept in the operating system's credential store, never in `rabit.db`, the
  JSON export, the upgrade backups or the logs, and are never sent to the update server.
- Updates are accepted only if signed with the project's key and downloaded over HTTPS; the private key never enters the
  repository (see `docs/UPDATES.md`).
- The Tauri CSP stays restrictive; window capabilities stay to the minimum the
  app needs.
  This is enforced, not just promised: `src-tauri/capabilities/default.json` lists only the permissions the code uses
  (`tests/capabilities.test.ts`), and `npm run qa:permissions` checks the real app (see `docs/ARCHITECTURE.md`).
- Every SQL statement goes through the parameterised adapter — no string-built
  queries.
- Errors are logged through `src/lib/log.ts` without dumping personal data.

## Known advisories

- **`glib` < 0.20 (Dependabot #1, medium, unsoundness in `VariantStrIter`)**: it comes from `gtk 0.18`, which Tauri 2 uses
  only for its Linux window (`tao`, `muda`, `tauri`). The Windows and macOS builds that RaBit releases do not compile it, and
  RaBit never calls that API. The fix needs `glib` 0.20+, which Tauri will only adopt with its gtk4 move (3.0, currently alpha);
  it cannot be patched here without forking Tauri. Re-check on every Tauri upgrade.

## Supported versions

RaBit is in beta. Only the latest release on `main` is maintained — fixes land
there and in the next tagged build.
