# Package Naming

This repository follows the shared usmhic package-naming policy in `STANDARDS.md`.
Names below are public identifiers and should be treated as compatibility surfaces.

## Existing names

| Surface | Public name | Rule |
| --- | --- | --- |
| Repository | `skadoosh` | GitHub repository name; lowercase |
| Product | `skaddosh` | Intentional product spelling |
| Workspace packages | `@skaddosh/<name>` | Product-owned npm scope |
| Web application | `@skaddosh/web` | Workspace package name |
| Mobile application | `@skaddosh/mobile` | Workspace package name |
| API/auth/data packages | `@skaddosh/api`, `@skaddosh/auth`, `@skaddosh/db` | Product-owned workspace packages |
| Android package | `com.osascloud.skadoosh` | Reverse-domain, lowercase identifier |

## Rules for new code

- All workspace packages use the `@skaddosh/*` scope and a short lowercase name.
- Keep package names aligned with their directory and responsibility.
- Use `skadoosh` for repository URLs and `skaddosh` for product/package identifiers.
- Do not introduce a second npm scope or silently correct the established spelling.
- Do not rename a package or Android identifier without a migration plan and release-note entry.
