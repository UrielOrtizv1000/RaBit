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
  authentication, no remote API and no telemetry to attack. The app makes no
  network requests, so reports about the network surface do not apply.

## Design commitments

These are guarantees the code is expected to keep. A pull request that breaks
one of them is a bug:

- No outbound network requests of any kind.
- No collection or transmission of user data, ever.
- The Tauri CSP stays restrictive; window capabilities stay to the minimum the
  app needs.
- Every SQL statement goes through the parameterised adapter — no string-built
  queries.
- Errors are logged through `src/lib/log.ts` without dumping personal data.

## Supported versions

RaBit is in beta. Only the latest release on `main` is maintained — fixes land
there and in the next tagged build.
