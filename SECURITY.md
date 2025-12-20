# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

Please report (suspected) security vulnerabilities to **contact@hirejeffgreen.com**. You will receive a response within 48 hours. If the issue is confirmed, we will release a patch as soon as possible depending on complexity but historically within a few days.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Security Considerations

logpare processes log data in memory and does not:

- Execute user-provided code
- Make network requests
- Access the file system beyond reading input files
- Persist data to disk or external systems

However, please be aware that:

- Large log files may consume significant memory
- The CLI reads files from the filesystem as specified by the user
- Output is written to stdout or files as specified by the user

If you discover a security vulnerability, please follow the reporting process above rather than opening a public issue.

