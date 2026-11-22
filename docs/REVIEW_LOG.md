# Repository review — 2026-10-11

Changes are prepared locally on `dev` for the maintainer to review, commit, and push.
No source commits, merges, source pushes, deployments, or store submissions were made.
The GitHub PR closures and remote bot-branch deletions below were explicitly requested.

## Product, branding, and content

- Rebuilt the signed-out creator landing page with paper/sage colors, editorial typography, a creative-process illustration, responsive sections, dark-mode and reduced-motion support.
- Added landing/discovery copy in English, French, Spanish, and Arabic, including navigation labels, mode descriptions, error/empty states, and RTL layouts. Live discovery queries and signed-in behavior remain in place.
- Clarified project Kudos distributions and capped returns; no wallet logic, amounts, schemas, or API contracts changed.
- Corrected contributor guidance about automated tests, Node/pnpm versions, branch policy, release images, and native mobile delivery.

## Workflows and contributor guidance

- All existing Node setup steps now use the repository pin, Node 24.18.0; pnpm remains 11.6.0.
- Web CI checks the environment template after toolchain setup, verifies its log runner, checks types/tests where configured, and runs a production build before image publication.
- Check output is retained in `ci-logs/*.log`, summarized in GitHub Actions, and uploaded as `web-check-logs` for 14 days, including failed checks. The runner preserves failures and redacts known secret environment values; tests cover failure propagation and secrets split across output chunks. Logs are ignored locally.
- Development and contributor PRs target `dev`. Existing image publication remains restricted to pushes to `dev`; store submissions remain manual from `dev` through the production environment. Release tags must be reachable from `dev`.
- Scheduled Dependabot version PRs are paused locally with limit 0 and explicit `dev` targets. This takes effect after the maintainer pushes. GitHub security-alert/security-update settings were not changed; manual dependency and security-alert triage is still required.
- Corrected documentation that described `main`, automatic `latest` images, obsolete EAS delivery, and inconsistent environment-template rules. Non-secret localhost defaults are allowed; secrets stay empty in the committed template.

## GitHub cleanup

- Confirmed the default and working branch is `dev`.
- Closed 10 bot PRs without merging: [#12](https://github.com/usmhic/skadoosh/pull/12), [#11](https://github.com/usmhic/skadoosh/pull/11), [#10](https://github.com/usmhic/skadoosh/pull/10), [#9](https://github.com/usmhic/skadoosh/pull/9), [#8](https://github.com/usmhic/skadoosh/pull/8), [#7](https://github.com/usmhic/skadoosh/pull/7), [#4](https://github.com/usmhic/skadoosh/pull/4), [#3](https://github.com/usmhic/skadoosh/pull/3), [#2](https://github.com/usmhic/skadoosh/pull/2), [#1](https://github.com/usmhic/skadoosh/pull/1).
- Removed 11 remote bot branches, including branches GitHub automatically deleted after PR closure. Verified that only `dev` remains on the remote.
- Before cleanup, fetched bot branch tips and created a verified local recovery bundle at `.cache/repository-audit/bot-branches-2026-10-11.bundle`. JSON snapshots and cleanup results are beside it; these local artifacts are ignored by Git.
- Recovery: inspect with `git bundle list-heads .cache/repository-audit/bot-branches-2026-10-11.bundle`; fetch an explicitly selected archived ref into a new recovery branch if needed.

| Removed branch | Archived tip |
| --- | --- |
| `claude/skadoosh-creator-platform-82q9er` | `d5f2922b9c220bcb0c13fa4bd3eecbf1765cb880` |
| `dependabot/github_actions/actions/setup-java-6` | `203e77bd22f0aaa1119f9349eb20fecc6b7e1777` |
| `dependabot/github_actions/actions/setup-node-7` | `1598c45a505f075594a1fd0b133cb6cd20050a92` |
| `dependabot/github_actions/docker/login-action-4` | `ef122e7dade3c0c60d759ccf9957a901165cc61d` |
| `dependabot/github_actions/docker/setup-buildx-action-4` | `8a00687bb26ee15603706710918bfd3896906458` |
| `dependabot/github_actions/pnpm/action-setup-6` | `3936797c291a32d5e366f9d4338bf90a3e0e36c5` |
| `dependabot/npm_and_yarn/expo-linking-57.0.5` | `83b6852fd80e468e0aa126eb7aad0d23df2148a4` |
| `dependabot/npm_and_yarn/expo-web-browser-57.0.2` | `fce8028d1f01c97cc355d479faecf0a523de4424` |
| `dependabot/npm_and_yarn/npm-minor-21a9c77e24` | `07ad57c400b1abf0ded72774dc4341f92665f1f8` |
| `dependabot/npm_and_yarn/react-i18next-17.0.11` | `e606ade47f760a0a09993bc2282b437ebf7095da` |
| `dependabot/npm_and_yarn/superjson-2.2.6` | `7712043836fb9efc3cc5436dcf8296cb67016811` |

## Validation

- Production Next.js build passed using the pinned Node version.
- Type checks passed for the web/mobile apps and configured shared packages; 23 existing Kudos economy tests passed.
- CI log-runner tests passed (successful check, failing check, output redaction, and summaries).
- All workflow files passed Actionlint 1.7.7. Environment-template validation passed.
- Tracked Markdown/MDX relative-file links were checked: 46 links, no missing targets (URL fragments and live external destinations excluded).
- Browser checks cover 320, 375, 768, 1024, and 1440 px: no document overflow, one primary heading, no nested main/link elements, and no broken images. Also checked all four languages at phone/tablet/desktop widths and Arabic RTL.
- Local check logs are under `ci-logs/`. Browser screenshots and the complete responsive run are under the Skaddosh checkout’s `.cache/landing-qa/` and `ci-logs/responsive.log`.

## Review limits and follow-ups

This review covered public landing content, branding exports, contributor/setup/release guidance, relative documentation links, dependency-bot cleanup, and workflow configuration. It is not a complete security or legal audit of all application code.

- Local backend services were not running during the landing preview. Authenticated journeys, receipt processing, database migrations, payments, email, and external storage were not exercised end to end. The Skaddosh UI preview explicitly disabled startup migrations; production migration behavior was not changed.
- Docker/container builds and signed Android/iOS delivery were not run locally; Docker and Apple signing infrastructure were unavailable. The updated hosted workflows have not run because source changes remain local.
- Expenn’s existing Next.js middleware naming emits a migration deprecation warning. Existing Windows environment wrappers also emit Node’s shell-argument deprecation warning. Neither warning prevented the builds.
- Privacy/security policy statements about hosting, encryption at rest, retention, and support response times need confirmation against the actual operator’s deployment; infrastructure guarantees were not inferred from UI code.

## Addendum — 2026-11-22

- The sage creator-landing prototype (`components/discovery/creator-landing.*`, `discovery-copy.ts`) was
  never wired into a route and is superseded by the brand redesign in `components/landing/landing.tsx`
  (#23, #25). It was removed rather than committed.
- Moving the web CI type-check to `pnpm lint` dropped `packages/db` and `packages/auth`, which had no
  `lint` script. Both now run `tsc --noEmit` under `lint`.
- Root-level `app.json` and `eas.json` from an `eas init` run were removed; Expo config lives in
  `apps/mobile/app.config.ts` and `apps/mobile/eas.json`.
