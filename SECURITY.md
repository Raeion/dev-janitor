# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.2.x | Yes |
| 1.1.x | Yes |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report security issues privately by opening a GitHub Security Advisory
on the repository, or contact the maintainer ([@wordrae on X](https://x.com/wordrae))
through GitHub.

Include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact (especially data loss or arbitrary file deletion scope)

We aim to acknowledge reports within 72 hours and provide a fix or mitigation plan
as soon as possible.

## Scope

Dev Janitor deletes files and runs `git` and `docker` commands based on user
confirmation. Security concerns include:

- Path traversal or deletion outside the user-specified scan root
- Unsafe defaults that delete without confirmation
- Command injection via config or finding metadata

We treat any of the above as high severity.
