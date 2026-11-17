# Security policy

ImmoDash is a static website built from public data. It has no login, stores no personal data and runs no
server in production. The FastAPI service and the Dash dashboard are run locally only.

## Reporting a vulnerability

Please report security problems privately through GitHub: **Security → Report a vulnerability** on
https://github.com/zoeb-ali/immodash (private vulnerability reporting). Do not open a public issue.
You can expect a first answer within 7 days.

## What is in place

- Security headers on the live site (Content-Security-Policy, frame-ancestors, nosniff, referrer and
  permissions policies) in `web/vercel.json`.
- Python dependencies locked with hashes (`requirements*.lock`), npm with `package-lock.json`, GitHub
  Actions pinned to commit SHAs. Dependabot opens weekly update pull requests.
- CI runs `pip-audit` and `npm audit` on every push; CI tokens are read-only.
- The weekly data job is split: the job that runs project code and holds API keys has a read-only token;
  only a small publish job without secrets can push.
- Third-party files are pinned (commit SHA and SHA-256) and every download has a size cap.
- Secrets live only in GitHub Actions secrets or a local `.env` (git-ignored, excluded from Docker builds).

## Scope

In scope: this repository, the published site and its build pipeline. The upstream data providers and
hosting platforms have their own security contacts.
