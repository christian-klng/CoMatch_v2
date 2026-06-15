export function PrivacyPolicy() {
  return (
    <div className="min-h-full bg-bg px-6 py-12">
      <div className="mx-auto max-w-[680px] space-y-8 text-[15px] leading-relaxed text-ink">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Datenschutzerklärung
          </h1>
          <p className="mt-1 text-sm text-muted">Stand: Juni 2026</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-ink">
            <span aria-label="EU-Flagge">🇪🇺</span>
            100 % verarbeitet und gespeichert in der Europäischen Union
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Verantwortlicher</h2>
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
            ist:
          </p>
          <address className="not-italic text-muted">
            Christian Klang
            <br />
            Hochschule für Wirtschaft und Recht Berlin
            <br />
            Badensche Straße 51, 10825 Berlin
            <br />
            E-Mail:{" "}
            <a
              href="mailto:christian.klang@hwr-berlin.de"
              className="text-brand-600 underline"
            >
              christian.klang@hwr-berlin.de
            </a>
          </address>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Erhobene Daten</h2>
          <p>
            Bei der Nutzung von CoMatch werden folgende personenbezogene Daten
            verarbeitet:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>
              <strong className="text-ink">E-Mail-Adresse</strong> – für
              Registrierung und passwortlosen Login via Magic-Link
            </li>
            <li>
              <strong className="text-ink">Profilangaben</strong> – Name, Rolle,
              Unternehmen, Kurzbio (freiwillig)
            </li>
            <li>
              <strong className="text-ink">Skills</strong> – selbst gewählte
              oder aus LinkedIn importierte Fähigkeiten und Suchanfragen
            </li>
            <li>
              <strong className="text-ink">LinkedIn-URL</strong> – optional,
              nur bei eigenem Einverständnis
            </li>
            <li>
              <strong className="text-ink">IP-Adresse</strong> – technisch
              bedingt bei Serveranfragen, keine gesonderte Auswertung
            </li>
          </ul>
          <p className="text-muted">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
            sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für optionale
            Integrationen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            3. Hosting – Hetzner Online GmbH
          </h2>
          <p>
            Unsere Anwendung und Datenbank werden auf Servern der{" "}
            <strong>Hetzner Online GmbH</strong>, Industriestr. 25, 91710
            Gunzenhausen, Deutschland, betrieben. Hetzner ist
            ISO-27001-zertifiziert; alle Daten werden ausschließlich in
            Rechenzentren innerhalb der EU/EWR gespeichert. Mit Hetzner besteht
            ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            4. LinkedIn-Import – Unipile
          </h2>
          <p>
            Wenn du freiwillig dein LinkedIn-Profil verknüpfst, wird dein
            öffentliches Profil über den Dienst{" "}
            <strong>Unipile</strong> (49 Rue des Acacias, 75017 Paris,
            Frankreich) abgerufen. Die übermittelten Daten (Name, Headline,
            Berufserfahrung, Skills) werden ausschließlich zur Generierung von
            Skill-Vorschlägen genutzt und danach nicht dauerhaft bei Unipile
            gespeichert. Die Verbindung ist optional und kann jederzeit im Profil
            entfernt werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. KI-Verarbeitung – Mistral AI</h2>
          <p>
            Zur automatischen Skill-Erkennung und -Übersetzung werden
            Profilinhalte an{" "}
            <strong>Mistral AI S.A.S.</strong> (15 Rue des Halles, 75001 Paris,
            Frankreich) übermittelt. Dies geschieht ausschließlich, wenn du
            deinen LinkedIn-Import nutzt oder eigene Freitexteingaben machst.
            Mit Mistral AI besteht ein Auftragsverarbeitungsvertrag nach
            Art. 28 DSGVO; Daten werden nicht für das Training von Mistral-Modellen
            verwendet. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Speicherdauer</h2>
          <p>
            Deine Daten werden gespeichert, solange dein Konto aktiv ist.
            Inaktive Konten ohne Community-Mitgliedschaft werden nach 12 Monaten
            gelöscht. Du kannst die Löschung deines Kontos jederzeit per E-Mail
            an{" "}
            <a
              href="mailto:christian.klang@hwr-berlin.de"
              className="text-brand-600 underline"
            >
              christian.klang@hwr-berlin.de
            </a>{" "}
            beantragen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Lokaler Speicher (localStorage)</h2>
          <p>
            Die App speichert dein Authentifizierungs-Token und optionale
            Beitritts-Codes im <code>localStorage</code> deines Browsers. Es
            werden keine Tracking-Cookies gesetzt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            8. Deine Rechte (Art. 15–22 DSGVO)
          </h2>
          <p>Du hast das Recht auf:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Auskunft über deine gespeicherten Daten (Art. 15)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16)</li>
            <li>Löschung („Recht auf Vergessenwerden", Art. 17)</li>
            <li>Einschränkung der Verarbeitung (Art. 18)</li>
            <li>Datenübertragbarkeit (Art. 20)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
            <li>Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3)</li>
          </ul>
          <p className="text-muted">
            Zur Ausübung deiner Rechte genügt eine E-Mail an{" "}
            <a
              href="mailto:christian.klang@hwr-berlin.de"
              className="text-brand-600 underline"
            >
              christian.klang@hwr-berlin.de
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">9. Beschwerderecht</h2>
          <p>
            Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu
            beschweren. Zuständig für Berlin ist:
          </p>
          <address className="not-italic text-muted">
            Berliner Beauftragte für Datenschutz und Informationsfreiheit
            <br />
            Friedrichstr. 219, 10969 Berlin
            <br />
            <a
              href="https://www.datenschutz-berlin.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 underline"
            >
              www.datenschutz-berlin.de
            </a>
          </address>
        </section>

        <p className="border-t border-border pt-6 text-sm text-muted">
          Diese Datenschutzerklärung gilt für die Anwendung CoMatch unter der
          Domain{" "}
          <span className="font-mono text-xs">
            comatch.startup-incubator.berlin
          </span>
          .
        </p>
      </div>
    </div>
  );
}
