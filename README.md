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
application at `http://localhost:3001`. For Ionic live reload during frontend
work, run `npm run preview` in a second terminal while the API is running.

## Production build

```bash
npm run build
npm start
```

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

Open `http://localhost:3000`. The MySQL database, application data, and uploaded
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
