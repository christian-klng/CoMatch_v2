# CoMatch

Skill-Matching-App für Communities (Events, Inkubatoren). Monorepo mit **drei
Apps** — nicht übersehen:

| Pfad | App | Stack | Coolify-Service |
|---|---|---|---|
| `/` (Repo-Root, `src/`) | Nutzer-Frontend (SPA) | React 19 + Vite + Tailwind v4 | Frontend |
| `api/` | REST-API | Hono + node-postgres | API |
| `admin/` | Admin-SPA (Communities/Mitglieder verwalten) | React + Vite, eigenes `styles.css` | Admin |

Vierter Coolify-Service: Postgres (nur intern erreichbar, keine öffentliche Domain).

## Kommandos

- Frontend: `npm run build` (Root) · Typecheck: `npx tsc --noEmit -p .`
- API: `cd api && npm run build` · Migrationen lokal: `npm run migrate`
- Admin: `cd admin && npm run build`
- Node liegt unter `~/.local/node/bin` (kein Homebrew/Docker auf diesem Mac).

## Architektur-Eckpunkte

- **Skills sind zweisprachige Konzepte:** `skills.label` = kanonisches deutsches
  Label (IDs/Matching hängen daran), `skills.label_en` = englische Variante
  (NULL = unübersetzt, Clients fallen auf Deutsch zurück). Kanonisierung
  (`api/src/skillcatalog.ts`) löst Freitext beider Sprachen per Lookup +
  Mistral-Übersetzung auf EIN Konzept auf. Backfill:
  `POST /api/admin/skills/translate` (idempotent).
- **i18n Frontend:** react-i18next, Ressourcen in `src/locales/{de,en}.json`,
  Setup `src/i18n.ts`. Explizite Sprachwahl liegt in `users.locale`
  (NULL = Browser-Erkennung) und gewinnt nach Login.
- **Matching** (`api/src/routes/matches.ts`): Label-Set-Vergleich über alle
  gemeinsamen Communities; `?lang=` lokalisiert die Labels (gleicher
  SQL-Ausdruck für Viewer und Kandidaten, sonst bricht das Matching).
- **Auth:** passwortlose Magic-Links (15 min, einmalig), JWT im localStorage.
  E-Mail-Templates zweisprachig in `api/src/mailer.ts`.
- **Join-Deep-Link:** `/join/<8-stelliger-Code>` parkt den Code in
  localStorage und übersteht den Registrierungs-Umweg (`src/lib/joinCode.ts`).
- **API-Fehler sind Codes** (`error: "no_profile"`), übersetzt wird nur im
  Frontend — beibehalten.
- Admin-Routen (`api/src/routes/admin.ts`) sind bewusst noch **ohne Auth**
  (Pre-Launch); nicht öffentlich verlinken.

## Deployment (Coolify, manuell durch Christian)

- Nach jeder Änderung angeben, welche Services neu deployed werden müssen.
- DB-Migrationen (`api/migrations/*.sql`, forward-only) laufen seit der
  Dockerfile-CMD-Änderung automatisch vor dem API-Start (`migrate.js`).
- `VITE_API_URL` (Frontend + Admin) und `VITE_APP_URL` (Admin, Join-Links)
  sind **Build-Args** — Änderungen brauchen einen Rebuild, kein Restart.
- Domains: Frontend `comatch.startup-incubator.berlin`, API
  `comatch-api.startup-incubator.berlin`. Details in `DEPLOYMENT.md`.
