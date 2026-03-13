# DekoApp WG - Gemeinsame Deko-Planung

DekoApp ist eine moderne Webanwendung, die es einer Gruppe/WG ermöglicht, potenzielle Deko-Gegenstände (z.B. von Amazon) gemeinsam zu bewerten. Sie bietet ein Echtzeit-Ranking nach Durchschnittsbewertungen, individuelle Notizen, ein aufgeräumtes und responsives "Premium"-Design und Features wie Dunkelmodus (Dark Mode).

## Features
- **Authentifizierung**: Sichere Registrierung & Login via Supabase Auth.
- **Rollen-System**: User & Admin Accounts (`admin` kann z.B. Räume zuweisen).
- **Bewertungssystem**: Jeder Nutzer kann Gegenstände von 0 bis 10 Sternen bewerten.
- **Intelligentes Ranking**: Items werden automatisch nach der besten Durchschnittsnote und anschließend nach Anzahl der meisten Votes sortiert. Unbewertete Items bleiben unten.
- **Volltextsuche & Filter**: Nach Raum filtern und suchen.
- **Top Picks & Neu**: Eigene Sektionen für die besten Items und unbewertete Einträge.
- **Live Amazon Import**: Direkter Import von öffentlichen Amazon-Wunschlisten per Knopfdruck aus dem Dashboard (via integrierter Supabase Edge Function).

---

## 🚀 Setup & Deployment Anleitung (Schritt für Schritt)

Genaue Anleitung, um deine lokale App auf **GitHub Pages** für alle zugänglich online zu bringen:

### 1. Supabase Vorbereiten
1. Logge dich auf [Supabase](https://supabase.com/) ein und notiere dir unter **Project Settings -> API**:
   - Deine **Project URL** (`https://xxx.supabase.co`)
   - Deinen **anon** `public` Key
   - Deinen **service_role** `secret` Key

2. Lade im Supabase "**SQL Editor**" einmalig die Dateien hoch und führe sie aus:
   - `supabase/schema.sql`: Erstellt das komplette Backend, die Tabellen und die Sicherheitsregeln (RLS).
   - `supabase/seed.sql`: Erstellt den ersten Login (`admin@deko.local` mit Passwort `admin`).

3. Lade die Web-Scraper Edge Function aus dem Terminal in dein Projekt hoch:
   ```bash
   npx supabase login
   npx supabase link --project-ref DEINE_PROJEKT_REFERENZ_ID
   npx supabase secrets set APP_SUPABASE_URL=DEINE_URL APP_SUPABASE_SERVICE_ROLE_KEY=DEIN_SERVICE_ROLE_KEY
   npx supabase functions deploy amazon-scraper --no-verify-jwt
   ```

### 2. GitHub Pages Deployment (Live stellen)
1. **GitHub Repository erstellen**: 
   Geh auf GitHub, erstelle ein neues leeres Repository (z.B. `dekoapp`) und lade deinen kompletten lokalen Code (den ganzen `Dekoapp` Ordner) hoch.
   Das geht im Terminal z.B. mit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DEIN_NAME/DEIN_REPO.git
   git push -u origin main
   ```

2. **Secrets für GitHub Actions hinterlegen**:
   - Gehe in deinem GitHub Repository auf **Settings -> Secrets and variables -> Actions**.
   - Klicke auf **New repository secret**.
   - Lege ein Secret namens `VITE_SUPABASE_URL` an und füge deine Supabase URL als Wert ein.
   - Lege ein zweites Secret namens `VITE_SUPABASE_ANON_KEY` an und füge deinen Supabase Anon Key ein.

3. **Vite "Base Path" anpassen**:
   - Öffne die Datei `vite.config.ts`.
   - Suche nach der Zeile `base: '/Dekoapp/'` und stelle sicher, dass `/Dekoapp/` exakt dem Namen deines GitHub Repositories entspricht. (Heißt dein Repo z.B. "deko-planer", muss dort `/deko-planer/` stehen).
   - *Pushe diese Änderung nochmal zu GitHub.*

4. **GitHub Pages aktivieren**:
   - Gehe in die **Settings** deines Repositories, dann links auf **Pages**.
   - Wähle unter "Source" im Dropdown: **GitHub Actions**.

5. **Deployment abwarten**:
   Gehe oben auf den Reiter **Actions**. Du wirst sehen, dass dein Projekt jetzt automatisch gebaut (Build) und online gestellt (Deploy) wird. Sobald das grün durchgelaufen ist, steht dort der Live-Link zu deiner Webseite!

---

## 🛠️ Architektur & Technologien
- **Frontend**: React 18, TypeScript, Vite, React Router (HashRouter für einfache GitHub Pages Kompatibilität).
- **Styling**: 100% Custom Vanilla CSS unter Einsatz moderner CSS Variables.
- **Backend & Auth & DB**: Supabase (Postgres). 
- **Scraper**: Supabase Edge Functions (Deno + Cheerio) für Live-Imports.
- **CI/CD**: Vollautomatisierter Deploy über GitHub Actions (`.github/workflows/deploy.yml`).
