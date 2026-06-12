# CoMatch — Deployment & lokale Entwicklung

Architektur: **Frontend (SPA) + Admin (SPA) → API (Hono) → Postgres**. Der
Browser spricht nie direkt mit der DB. Ein Mono-Repo, ein git-Repo
(`github.com/christian-klng/CoMatch_v2`), **vier Coolify-Services**.

```
Browser ── HTTPS ──> Frontend (nginx static)   comatch.startup-incubator.berlin
   │
   ├──── HTTPS ────> Admin (nginx static)      (separate Domain, intern halten!)
   │
   └──── /api ─────> API (Hono, :3000)         comatch-api.startup-incubator.berlin
                         │
                         └──> Postgres (:5432, nur intern)
```

---

## 1. Lokal entwickeln

```bash
# 1. Postgres starten (braucht Docker; auf Christians Mac nicht vorhanden —
#    dort gegen die Coolify-DB oder per Review-Umgebung arbeiten)
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

# 4. Admin (optional, neues Terminal)
cd admin && npm install && npm run dev
```

Smoke-Test der API (Matches/me-Endpoints brauchen ein Bearer-JWT aus dem
Magic-Link-Login):
```bash
curl localhost:3000/health
curl localhost:3000/api/skills
```
Ohne SMTP-Konfiguration loggt die API den Magic-Link in die Konsole — damit
lässt sich lokal einloggen.

---

## 2. Coolify-Setup (Stand Juni 2026)

Coolify deployt bei jedem Push auf `main`. **Nicht auf dem Server editieren.**
Christian stößt Deploys manuell an.

### a) Postgres-Service
- PostgreSQL, nur intern erreichbar. Interne Connection-URL → `DATABASE_URL`
  der API.

### b) API-Service — `comatch-api.startup-incubator.berlin`
- **Base Directory:** `/api` · **Build Pack:** Dockerfile · Port 3000,
  Health-Check `/health`.
- **Migrationen laufen automatisch** vor dem Serverstart (Dockerfile-CMD führt
  `migrate.js` aus, forward-only & idempotent) — kein manueller Schritt mehr.
- Environment (siehe `api/.env.example` für alle Variablen):
  - `DATABASE_URL` — interne URL aus (a)
  - `CORS_ORIGIN` — kommagetrennt: Frontend- **und** Admin-Origin
  - `JWT_SECRET`, `APP_URL` (Frontend-URL, für Magic-Link-Ziele)
  - `SMTP_HOST/PORT/USER/PASS/FROM` (Magic-Link-Mails)
  - `MISTRAL_API_KEY` (+ optional `MISTRAL_MODEL`) — Skill-Vorschläge &
    Label-Übersetzung
  - `UNIPILE_DSN`, `UNIPILE_API_KEY`, `UNIPILE_ACCOUNT_ID` — LinkedIn-Import

### c) Frontend-Service — `comatch.startup-incubator.berlin`
- **Base Directory:** `/` (Root) · Dockerfile · Port 80.
- **Build-Arg** `VITE_API_URL` = API-Domain (wird zur Build-Zeit eingebacken —
  Änderung braucht Rebuild, kein Restart).

### d) Admin-Service
- **Base Directory:** `/admin` · Dockerfile bzw. Static-Build · Port 80.
- **Build-Args:** `VITE_API_URL` (wie Frontend) und optional `VITE_APP_URL`
  (Frontend-Basis für die Join-Links; Default ist die Prod-Domain).
- ⚠️ Admin-API-Routen sind noch **ohne Auth** — Domain nicht öffentlich
  verlinken, idealerweise per Coolify-Basic-Auth schützen.

---

## Offene Punkte vor „echtem" Betrieb
- **Admin-Auth** fehlt (s. o.).
- **Feature-Flag `CONNECTION_GATING`** ist für die Testphase `false`
  (Anfrage-Flow + Namens-/Foto-Maskierung aus) — vor echtem Betrieb beide
  Flags (`api/src/featureFlags.ts`, `src/lib/featureFlags.ts`) auf `true`.
- **DSGVO / Sichtbarkeitsregeln** noch nicht vollständig umgesetzt.
