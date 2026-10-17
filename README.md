# Orbis
The monorepo of Orbis, managed with [Turborepo](https://turborepo.dev) and pnpm workspaces.

## Repositories
| Path | Repository | Description |
| --- | --- | --- |
| [server](server) | [PolsarCode/orbis.server](https://github.com/PolsarCode/orbis.server) | NestJS + Prisma (PostgreSQL) API on port `4000` |
| [web](web) | [PolsarCode/orbis.web](https://github.com/PolsarCode/orbis.web) | Next.js frontend on port `3000` |

`server` and `web` are Git submodules.

## Getting Started
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
| `pnpm run git:pull` | Pull the latest `main` of `server` and `web` |
| `pnpm run develop` | Start the database, server, and web in development mode |
| `pnpm run build` | Build the server and web |

## Updating Submodules
`pnpm install` enables the hooks in `.githooks`.

Committing in this repository also commits any changes inside `server` or `web` with the same message, on a branch with the same name as this repository's branch. `git push` then pushes the changed submodules to that same branch name before pushing this repository:

```bash
git add .
git commit -m "✨ Add feature"
git push
```

If only submodules changed, use `git commit --allow-empty -m "..."`.

## Pulling Changes
Run the setup again to pull this repository and the submodules together:

```bash
pnpm run setup
```

To do it manually:

```bash
git pull
git submodule sync --recursive
git submodule update --init --recursive --merge
```

To move `server` and `web` to their latest `main` instead of the commits recorded here:

```bash
pnpm run git:pull
git add server web
git commit -m "⬆️ Update submodules"
```
