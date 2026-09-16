# Security policy

## Supported versions

Security reports for the latest source preview are welcome. There are no signed binary releases yet.

## Reporting a vulnerability

Please do not open a public issue containing an exploit, credential, private download URL, or personal data. Use GitHub's private vulnerability reporting for this repository when available. Otherwise, contact the repository owner privately through their GitHub profile and include steps to reproduce, impact, and the affected version. Do not attach live Castbox tokens or account cookies.

## Credential handling

- Never commit API keys, passwords, OAuth tokens, cookies, authorization headers, private RSS URLs, or `.env` files.
- `files.txt` is excluded from Git because it contains captured credentials and identity data. It is not part of the application.
- Personal access tokens entered in settings are kept strictly in local application data (0600 mode) and never shared, logged, or bundled with repository code.
- If a credential is exposed, revoke or rotate it at its issuer first. Removing it from a later commit does not remove it from Git history.

## Application security boundaries

The renderer is sandboxed and communicates with the main process only through named typed preload operations. Keep sender validation, context isolation, navigation restrictions, directory grants, URL validation, and safe file publication in place. Report regressions that bypass these boundaries as security issues.
