# CoMatch — Deployment & lokale Entwicklung

Architektur: **Frontend (SPA) → API (Hono) → Postgres**. Der Browser spricht
nie direkt mit der DB. Ein Mono-Repo, ein git-Repo, drei Coolify-Services.

```
Browser ── HTTPS ──> Frontend (nginx static)   app.comatch...
   │
   └──── /api ──────> API (Hono, :3000)         api.comatch...
                          │
                          └──> Postgres (:5432, intern)
```

---

## 1. Lokal entwickeln (der normale Tag)

```bash
# 1. Postgres starten
docker compose up -d

# 2. API einrichten + migrieren + starten
cd api
cp .env.example .env          # DATABASE_URL zeigt schon auf localhost:5432
npm install
npm run migrate               # legt Schema + Seed-Daten an
npm run dev                   # API auf http://localhost:3000

# 3. Frontend (neues Terminal, im Repo-Root)
cp .env.example .env          # VITE_API_URL=http://localhost:3000
npm install
npm run dev                   # SPA auf http://localhost:5173
```

Smoke-Test der API:
```bash
curl localhost:3000/health
curl localhost:3000/api/skills
# Anna in der Demo-Community sieht ihre Matches:
curl "localhost:3000/api/matches?viewer=00000000-0000-0000-0000-0000000000a1&community=00000000-0000-0000-0000-0000000000c1"
```

---

## 2. Auf Coolify deployen (einmalig einrichten)

Voraussetzung: Repo liegt auf GitHub (siehe unten), Coolify ist mit dem GitHub
verbunden. **Nicht auf dem Server editieren** — Coolify deployt bei jedem Push.

### a) Postgres-Service
- Coolify → Project → **+ New → Database → PostgreSQL 17**.
- Coolify zeigt dir die **interne Connection-URL** (`postgres://...@<host>:5432/...`).
  Die kommt gleich in die API als `DATABASE_URL`.

### b) API-Service
- **+ New → Application → from GitHub repo**, Branch `main`.
- **Base Directory:** `/api`  ·  **Build Pack:** Dockerfile.
- Environment:
  - `DATABASE_URL` = interne URL aus Schritt (a)
  - `CORS_ORIGIN` = die Frontend-Domain (z. B. `https://app.comatch.example`)
  - `PORT` = `3000`
- **Port** auf 3000 stellen, Health-Check-Pfad `/health`.
- Domain setzen, z. B. `api.comatch.example`.
- Migrationen anstoßen: einmalig im API-Container-Terminal
  `npm run migrate:prod` (oder als Coolify "post-deployment command").

### c) Frontend-Service
- **+ New → Application → from GitHub repo**, gleicher Branch.
- **Base Directory:** `/` (Root)  ·  **Build Pack:** Dockerfile.
- Build-Arg / Env: `VITE_API_URL` = `https://api.comatch.example`
  (wird zur Build-Zeit eingebacken!).
- **Port** auf 80, Domain z. B. `app.comatch.example`.

### d) Danach
Jeder `git push` auf `main` → Coolify baut & deployt automatisch.

---

## 3. GitHub-Remote anlegen (noch offen — von dir)

Das Repo ist lokal initialisiert, aber hat noch kein Remote:

```bash
# Repo auf GitHub anlegen (via gh CLI):
gh repo create comatch --private --source=. --remote=origin --push
# ODER manuell:
git remote add origin git@github.com:<user>/comatch.git
git push -u origin main
```

---

## Offene Punkte vor „echtem" Betrieb
- **Auth ist noch Dummy** (`src/pages/Login.tsx`). Bis dahin sind alle Daten offen.
- **Frontend nutzt noch Mockdaten** — Umstellung auf die API ist der nächste Schritt.
- **QR-Codes** sind noch unsignierte Raw-Join-Codes (siehe `types.ts`-Kommentar).
- **DSGVO / Sichtbarkeitsregeln** noch nicht umgesetzt.
