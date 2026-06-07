# CoMatch v0.1

Matchmaking-App für Professionals. Web-App (React) als erste Stufe – später
via **Tauri** zu nativen iOS/Android-Apps weiterentwickelbar, gegen dieselbe
Postgres-DB (Deployment via Coolify).

> **Stand v0.1:** Styleguide + Dummy-UI mit Mock-Daten. Noch kein Backend,
> keine echte Auth, keine echte DB. Alle Daten sind statisch in `src/lib/mockData.ts`.

## Stack

- **Vite + React 19 + TypeScript** – bewusst SPA (kein Next.js), weil das den
  Tauri-/Native-Pfad am saubersten unterstützt.
- **Tailwind CSS v4** – Design-Tokens in `src/index.css` (`@theme`).
- **React Router 7** – Routing in `src/router.tsx`.
- **@yudiel/react-qr-scanner** – Kamera-QR, gekapselt in `src/components/QRScanner.tsx`.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Produktions-Build
npm run preview  # Build lokal ansehen
```

> **Kamera/QR:** funktioniert auf `localhost` und über HTTPS. Zum Test auf dem
> Handy: über einen HTTPS-Tunnel (z. B. ngrok/cloudflared) oder Coolify-Preview.

## Screens & Flow

`/login` · `/register` → `/scan` (Community per QR) → `/skills`
(ich suche / ich kann) → `/matches` → `/matches/:id` · `/profile` ·
`/styleguide`

## Design-System

Quelle der Wahrheit: `src/index.css` (`@theme`-Block). Live-Doku unter
`/styleguide` (auch via Profil erreichbar).

- **Richtung:** Professional & Clean
- **Akzent:** Deep Blue `#2563EB`
- **Skill-Akzente:** `seek` = Violett, `offer` = Teal
- **Font:** Inter · **Radius-Basis:** 8px

## Architektur-Notizen (für v0.2+)

Die App ist so strukturiert, dass der Sprung von Mock zu echt mechanisch wird:

- **`src/lib/matchStore.ts`** – Observable-Store hinter Hooks (`useMatches`).
  Später hier die API-Calls einsetzen, Komponenten bleiben unverändert.
- **`src/lib/types.ts`** – Domänen-Typen, nah am späteren Postgres-Schema.
- **`src/components/QRScanner.tsx`** – Kamera vollständig isoliert; der native
  Build tauscht nur diese Datei.

### Offene Architektur-Entscheidungen (siehe Chat: „logische Lücken")

1. **Backend/Auth:** Empfehlung Supabase (self-hosted via Coolify) = Postgres +
   Auth + Storage + pgvector + RLS. Alternative: eigenes API-Backend.
2. **Matching-Engine:** Hybrid (Vorschläge + Connect-Requests) gewählt. Bei
   Freitext-Skills → Embeddings/pgvector einplanen.
3. **Kontakt nach Match:** Chat vs. Kontaktdaten-Austausch – noch offen (v0.2).
4. **QR-Sicherheit:** signierte, ablaufende Codes statt statischer IDs.
5. **DSGVO:** Sichtbarkeitsregeln, Einwilligung, Löschkonzept.
