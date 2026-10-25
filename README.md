# Orbis
The monorepo of Orbis, managed with [Turborepo](https://turborepo.dev) and pnpm workspaces.

## Repositories
| Path | Repository | Description |
| --- | --- | --- |
| [server](server) | [PolsarCode/orbis.server](https://github.com/PolsarCode/orbis.server) | NestJS + Prisma (PostgreSQL) API on port `4000` |
| [web](web) | [PolsarCode/orbis.web](https://github.com/PolsarCode/orbis.web) | Next.js frontend on port `3000` |

`server` and `web` are Git submodules.

## Getting Started
For step-by-step instructions for macOS, Ubuntu, and Windows, including prerequisites, see [SETUP.md](SETUP.md).

1. **Clone over SSH**:

```bash
git clone git@github.com:PolsarCode/orbis.git
cd orbis
```

2. **Run the setup**:

```bash
pnpm run setup
```

This pulls the latest changes, clones `server` and `web` over SSH (the URLs in `.gitmodules`), checks them out on the same branch as this repository (or `main` if that branch doesn't exist in the submodule), installs dependencies, enables the git hooks, creates `server/.env` and `web/.env.local` from `example.env`, creates the database container, and generates the Prisma client.

3. **Fill in the environment variables**: replace the `XXXX` values in `server/.env` (see [server/DATABASE.md](server/DATABASE.md)) and set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `web/.env.local`.

## Scripts
| Command | Description |
| --- | --- |
| `pnpm run setup` | Pull the latest changes, update submodules, and install dependencies (safe to rerun) |
| `pnpm run release` | Bump the version, commit the new `server`/`web` commits, tag, and push |
| `pnpm run pull` | Pull this repository and the latest `main` of `server`/`web`, install dependencies, reset the local database, reapply migrations, and seed |
| `pnpm run develop` | Start the database, server, and web in development mode |
| `pnpm run build` | Build the server and web |
| `pnpm run review:start` | Ask for a `web` and a `server` PR number and check them out for review |
| `pnpm run review:end` | Switch `web` and `server` back to `main` |

## Reviewing Pull Requests
```bash
pnpm run review:start
```

This first installs the [GitHub CLI](https://cli.github.com) (with Homebrew, apt, or winget) if it's missing and runs `gh auth login` if you're not logged in. It then asks for the `web` PR number and then the `server` PR number (leave one empty to skip it), shows each PR's title, checks each PR out on a local `pr/<number>` branch with `gh pr checkout`, installs dependencies, and regenerates the Prisma client. Rerunning it with the same number updates the branch to the PR's latest commit. It stops without changing anything if a PR doesn't exist or a submodule you entered a number for has uncommitted changes.

When you're done:

```bash
pnpm run review:end
```

This switches `web` and `server` back to `main`, installs dependencies, and regenerates the Prisma client. It stops if either submodule has uncommitted changes.

Neither script applies or reverts database migrations. If a `server` PR adds migrations, apply them with `pnpm --filter orbis-server exec prisma migrate deploy`, and run `pnpm run pull` afterwards to reset the database back to `main`.

## Releasing
Commit your changes inside `server` and/or `web` first, then run from this repository (changes in this repository don't need to be committed):

```bash
pnpm run release
```

This:
1. Bumps `version` in `package.json` based on the Gitmoji of the new `server`/`web` commits: `💥` → major, `✨` → minor, anything else (or only changes in this repository) → patch.
2. Pushes `server` and `web`.
3. Commits everything here, including the new submodule commits and any uncommitted changes in this repository, with the version as the title (for example `v0.2.0`). The description lists the new `server`/`web` commits and the changed files in this repository.
4. Tags that commit (for example `v0.2.0`) and pushes the commit and tag.

It stops without changing anything if a submodule has uncommitted changes, or if nothing changed here, in `server`, or in `web`.

`pnpm install` enables the hooks in `.githooks`: `git push` here also pushes the submodule commits to a branch with the same name.

## Pulling Changes
After the initial setup, run:

```bash
pnpm run pull
```

This pulls this repository with a fast-forward merge, updates `server` and `web` to their latest `main`, installs dependencies, starts the local database and storage, regenerates the Prisma client, resets the local database, reapplies all committed migrations, and runs the seed. It stops if any step fails.

**This replaces all local database data with the seeded test data.** It only resets the standard local Orbis database (`localhost:5434/orbis_server_db`, also allowing the loopback IP addresses). Uploaded image files are not deleted. Run `pnpm run develop` afterwards to start the app.

At the end, including after a failed update, it compares `server/.env` and `web/.env.local` against their `example.env` files and warns about missing keys, empty values, or values still set to `XXXX`. It does not print or overwrite your values.

To update without resetting the database, use `pnpm run setup` and apply migrations with:

```bash
pnpm --filter orbis-server exec prisma migrate deploy
```
