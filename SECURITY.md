# Security Policy

## Supported Versions

Security fixes are applied to the latest `master` branch.

| Version | Supported |
| --- | --- |
| Latest (`master`) | Yes |
| Older snapshots | No |

## Reporting a Vulnerability

If you find a security issue, please report it privately:

- Open a private security report via GitHub Security Advisories (preferred), or
- Contact the maintainer directly at: `antonlistva47@gmail.com`

Please include:

- Clear reproduction steps
- Affected endpoints/files
- Expected vs actual behavior
- Potential impact
- Proof of concept (if available)

Do **not** post security vulnerabilities in public issues.

## Response Targets

- Initial acknowledgment: within 72 hours
- Triage and severity assessment: within 7 days
- Fix timeline: depends on severity and complexity

## Scope

This policy covers:

- `backend/` API and auth/session flows
- `my-app-2/` frontend handling of auth/session/api calls
- CI/CD and repository configuration

Out of scope:

- Issues caused by third-party service outages (TMDB, YouTube, Twitch, Google)
- Local misconfiguration in private environments

## Disclosure

Please allow time for a fix before public disclosure. Coordinated disclosure is appreciated.
