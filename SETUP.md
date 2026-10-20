# Local Setup

How to run Orbis on your own machine. Pick your operating system, install the prerequisites, then follow [Set Up the Project](#set-up-the-project).

When it's running:

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| PostgreSQL (Docker) | `localhost:5434` |

## Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Git | any recent | Cloning the repositories |
| Node.js | 22 LTS | Running the server and web |
| pnpm | 12.4.2 | Installing dependencies and running scripts |
| Docker | any recent | Running PostgreSQL |
| SSH key on GitHub | | `server` and `web` are cloned over SSH |

You also need access to the `PolsarCode/orbis`, `PolsarCode/orbis.server`, and `PolsarCode/orbis.web` repositories on GitHub.

### macOS

1. Install [Homebrew](https://brew.sh) if you don't have it.
2. Install Git and Node.js 22:

   ```bash
   brew install git node@22
   echo "export PATH=\"$(brew --prefix node@22)/bin:\$PATH\"" >> ~/.zshrc
   source ~/.zshrc
   node -v
   ```

3. Install pnpm:

   ```bash
   npm install -g pnpm@12.4.2
   ```

4. Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) and open it once so the Docker engine is running.

### Ubuntu

1. Install Git and build tools:

   ```bash
   sudo apt update
   sudo apt install -y git curl build-essential
   ```

2. Install Node.js 22 with [nvm](https://github.com/nvm-sh/nvm):

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   source ~/.bashrc
   nvm install 22
   ```

3. Install pnpm:

   ```bash
   npm install -g pnpm@12.4.2
   ```

4. Install Docker Engine by following [the official Ubuntu guide](https://docs.docker.com/engine/install/ubuntu/), then let your user run Docker without `sudo`:

   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   docker run --rm hello-world
   ```

### Windows

The project's scripts (`setup.sh`, the database script, `release.sh`, and the git hooks) are Bash scripts, so run Orbis inside **WSL 2** with Ubuntu rather than directly in PowerShell or Command Prompt.

1. In PowerShell **as Administrator**, install WSL with Ubuntu, then restart your computer:

   ```powershell
   wsl --install -d Ubuntu
   ```

2. Open **Ubuntu** from the Start menu and create your Linux username and password.
3. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/). In **Settings → Resources → WSL Integration**, turn on integration for **Ubuntu**.
4. In the Ubuntu terminal, keep Linux line endings so the Bash scripts work:

   ```bash
   git config --global core.autocrlf input
   ```

5. Follow the [Ubuntu](#ubuntu) steps 1–3 inside the Ubuntu terminal. Skip Ubuntu step 4: Docker Desktop provides Docker.

Run every command from here on in the Ubuntu terminal, and keep the project inside your Linux home folder (for example `~/code/orbis`), not under `/mnt/c/...`. Files on the Windows drive are much slower and can break file watching.

## Connect to GitHub over SSH

Skip this if `ssh -T git@github.com` already greets you by your username.

1. Create a key (press Enter to accept the defaults):

   ```bash
   ssh-keygen -t ed25519 -C "you@example.com"
   ```

2. Copy the public key:

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. Add it on GitHub under **Settings → SSH and GPG keys → New SSH key**.
4. Check the connection:

   ```bash
   ssh -T git@github.com
   ```

## Set Up the Project

1. Clone the repository:

   ```bash
   git clone git@github.com:PolsarCode/orbis.git
   cd orbis
   ```

2. Run the setup:

   ```bash
   pnpm run setup
   ```

   This clones `server` and `web`, installs dependencies, enables the git hooks, creates `server/.env` and `web/.env.local`, creates the PostgreSQL container, and generates the Prisma client. It warns about the `XXXX` values you fill in next.

3. Fill in `server/.env`:

   ```env
   JWT_SECRET=<a long random string>
   DATABASE_URL=postgresql://postgres:YourStrongPass123@localhost:5434/orbis_server_db
   ```

   Generate a `JWT_SECRET` with:

   ```bash
   openssl rand -hex 32
   ```

4. Fill in `web/.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

5. Create the database tables:

   ```bash
   pnpm --filter orbis-server exec prisma migrate deploy
   ```

6. Add the test accounts (optional, recommended):

   ```bash
   pnpm --filter orbis-server run prisma:seed
   ```

   | Email | Password |
   | --- | --- |
   | `bos@eriko.ph` | `boseriko` |
   | `twis@wua.ph` | `twiswua` |

   Seeding **deletes all users and communities** in your local database before creating these accounts, so only run it when you want a clean slate.

7. Start everything:

   ```bash
   pnpm run develop
   ```

   This starts the database, the API, and the web app. Open http://localhost:3000 and log in with a test account, or create your own.

## Database

PostgreSQL runs in a Docker container that `pnpm run setup` creates for you. These credentials are for local development only.

| Setting | Value |
| --- | --- |
| Container | `orbis_server_db` |
| Image | `postgres:16` |
| Host and port | `localhost:5434` (not the default 5432, to avoid clashing with a PostgreSQL already on your machine) |
| User | `postgres` |
| Password | `YourStrongPass123` |
| Database | `orbis_server_db` |

### Container

Run these from the `orbis` folder:

| Task | Command |
| --- | --- |
| Create the container (first time only) | `pnpm --filter orbis-server run db:setup` |
| Start | `pnpm --filter orbis-server run db:start` |
| Stop | `pnpm --filter orbis-server run db:stop` |
| Restart | `pnpm --filter orbis-server run db:restart` |
| Check if it's running | `pnpm --filter orbis-server run db:status` |
| Follow its logs | `pnpm --filter orbis-server run db:logs` |
| Delete the container and its data | `pnpm --filter orbis-server run db:remove` |

`pnpm run develop` restarts the database for you, so you rarely need these day to day. The database can take a few seconds to accept connections after it starts.

### Migrations and Data

| Task | Command |
| --- | --- |
| Apply migrations (after cloning or pulling) | `pnpm --filter orbis-server exec prisma migrate deploy` |
| Create a migration after editing `server/prisma/schema.prisma` | `pnpm --filter orbis-server run prisma:migrate <name>` |
| Regenerate the Prisma client | `pnpm --filter orbis-server run prisma:generate` |
| Reset to the test accounts | `pnpm --filter orbis-server run prisma:seed` |
| Browse and edit data in the browser | `pnpm --filter orbis-server run prisma:studio` |

`prisma:migrate` creates the migration file, applies it to your database, and regenerates the client. Commit the new folder under `server/prisma/migrations` with your change.

### Start Over With an Empty Database

```bash
pnpm --filter orbis-server run db:remove
pnpm --filter orbis-server run db:setup
pnpm --filter orbis-server exec prisma migrate deploy
pnpm --filter orbis-server run prisma:seed
```

## Day-to-Day

| Task | Command |
| --- | --- |
| Start developing | `pnpm run develop` |
| Pull the latest changes and update `server`/`web` | `pnpm run setup` |
| Apply new database migrations after pulling | `pnpm --filter orbis-server exec prisma migrate deploy` |
| Stop the database | `pnpm --filter orbis-server run db:stop` |

See [README.md](README.md) for releasing and the other scripts, and [Database](#database) for the database commands.

## Troubleshooting

**`pnpm run setup` says Docker is not running.** Start Docker Desktop (macOS and Windows) or `sudo systemctl start docker` (Ubuntu), then run `pnpm run setup` again. It's safe to rerun.

**`Permission denied (publickey)` when cloning `server` or `web`.** Your SSH key isn't set up or doesn't have access to the `PolsarCode` repositories. Redo [Connect to GitHub over SSH](#connect-to-github-over-ssh) and check `ssh -T git@github.com`.

**`permission denied while trying to connect to the Docker daemon socket` on Ubuntu.** Your user isn't in the `docker` group yet. Run `sudo usermod -aG docker $USER`, then log out and back in.

**`Bind for 0.0.0.0:5434 failed: port is already allocated`, or port 3000/4000 is in use.** Another process is using the port. Stop it, or find it with `lsof -i :5434` (macOS/Ubuntu/WSL).

**`/usr/bin/env: 'bash\r': No such file or directory` on Windows.** The scripts were checked out with Windows line endings. Run `git config --global core.autocrlf input`, delete the project folder, and clone again inside WSL.

**The API can't reach the database.** Check the container is running with `pnpm --filter orbis-server run db:status`, start it with `pnpm --filter orbis-server run db:start`, and confirm `DATABASE_URL` in `server/.env` matches the value above.
