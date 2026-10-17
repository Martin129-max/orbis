# Orbis
The monorepo of Orbis, managed with [Turborepo](https://turborepo.dev) and pnpm workspaces.

## Repositories
| Path | Repository | Description |
| --- | --- | --- |
| [server](server) | [PolsarCode/orbis.server](https://github.com/PolsarCode/orbis.server) | NestJS + Prisma (PostgreSQL) API on port `4000` |
| [web](web) | [PolsarCode/orbis.web](https://github.com/PolsarCode/orbis.web) | Next.js frontend on port `3000` |

`server` and `web` are Git submodules.

## Getting Started
1. **Clone with submodules**:

```bash
git clone --recurse-submodules https://github.com/PolsarCode/orbis.git
```

If already cloned:

```bash
git submodule update --init --recursive
```

2. **Install dependencies**:

```bash
pnpm install
```

3. **Set up environment variables**:
   - `server`: copy `example.env` to `.env` (see [server/DATABASE.md](server/DATABASE.md))
   - `web`: copy `example.env` to `.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:4000`

4. **Set up the database** (first time only):

```bash
pnpm --filter orbis-server run db:setup
```

## Scripts
| Command | Description |
| --- | --- |
| `pnpm run develop` | Start the database, server, and web in development mode |
| `pnpm run build` | Build the server and web |

## Updating Submodules
`pnpm install` enables the hooks in `.githooks` and sets `push.recurseSubmodules=on-demand`.

Committing in this repository also commits any changes inside `server` or `web` with the same message, and `git push` pushes those submodule commits first:

```bash
git add .
git commit -m "✨ Add feature"
git push
```

If only submodules changed, use `git commit --allow-empty -m "..."`.
