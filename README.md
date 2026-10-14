# BLGF Region II Document Tracking System

Full-stack document tracking, routing, archiving, and records management system.

## Project structure

```text
frontend/
  src/                  Ionic Angular application
  angular.json
  package.json

backend/
  server.ts             Express API and production server
  data/                  Local JSON fallback data
  records-management/    Stored records and attachments

dist/
  frontend/              Production frontend build
  backend/server.cjs     Production backend build
```

## Local development

```bash
npm install
npm run dev
```

The command installs/builds the Ionic Angular frontend, then serves the full
application at `http://localhost:3001`. If that port belongs to another process,
the launcher automatically selects the next free port and prints the URL it
selected. It never terminates a process it does not own. For Ionic live reload
during frontend work, run `npm run preview` in a second terminal while the API
is running; the preview proxy automatically follows the selected API port.

## Production build

```bash
npm run build
npm start
```

## Offline/local operation

After running `npm run build` once, the system can run without an internet or
MySQL connection:

```bash
npm run offline
```

Open the localhost URL printed by the command. Offline mode reads and writes
the local recovery database under `backend/data/`; changes are preserved on
that computer. Run `npm run offline:prepare` after pulling frontend or backend
code changes so the local production bundle and offline asset cache are fresh.
The installed browser app also caches its complete application shell after one
successful load. Features that inherently require an external service, such as
sending email, remain unavailable while disconnected.

### Install on a phone using this laptop as the server

Run the following while the laptop has internet access:

```powershell
npm.cmd run mobile
```

The launcher starts the local JSON server, creates a temporary secure HTTPS
link through Cloudflare Tunnel, and writes a scannable QR image to
`output/mobile-install-qr.png`. Keep the command window and laptop open while
the phone is using or synchronizing with the system. The tunnel URL changes
whenever the command is restarted. Mobile browsers always require the user to
confirm **Install app** or **Add to Home Screen**; operating systems do not
permit silent installation.

Production is hosted on Vercel and reads/writes a MySQL database through
Prisma. Configure `MYSQL_DATABASE_URL` (recommended) or the individual `MYSQL_*`
values documented in `.env.example`. Never commit `.env` files or expose
database and SMTP credentials.

## Docker (portable local installation)

Install Docker Desktop, then create the Docker settings file and replace every
placeholder password:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

Open `http://localhost:3002`. Port `3000` is reserved for the local MySQL
service on this workstation, so the default published port is `3002`. Change
`APP_PORT` in `.env.docker` if you need a different host port. The MySQL
database, application data, and uploaded
records are kept in Docker volumes, so normal container restarts do not erase
them. View status and logs with:

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app
```

Stop the system with `docker compose --env-file .env.docker down`. Do not add
`--volumes` unless you intentionally want to delete all Docker-managed data.

Copying only the project folder does not include an already-running MySQL Docker
volume. Before moving an installation to another computer, export the database:

```powershell
docker compose --env-file .env.docker exec db mysqldump -u root -p blgf_region2_doctrack > blgf-backup.sql
```

Also back up the `app_data` and `records_data` Docker volumes when transferring
existing uploaded files. For a brand-new installation, copying this project and
running the first command is sufficient.
