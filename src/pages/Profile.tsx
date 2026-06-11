import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppShell";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { logout, refreshUser, useAuth } from "../lib/auth";
import { useMyCommunities } from "../lib/community";
import { apiSaveLinkedin, apiUpdateProfile, ApiError } from "../lib/api";
import type { AuthUser } from "../lib/types";
import { IconLink, IconUsers } from "../components/icons";

export function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { communities } = useMyCommunities();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <ScreenHeader title="Profil" />
      <div className="space-y-4 px-5 py-5">
        <ProfileCard user={user} />

        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              Meine Communities
              {communities.length > 0 && (
                <span className="ml-1 text-muted">({communities.length})</span>
              )}
            </p>
            <Button size="sm" variant="ghost" onClick={() => navigate("/scan")}>
              Beitreten
            </Button>
          </div>

          {communities.length === 0 ? (
            <p className="text-sm text-muted">Noch keiner Community beigetreten.</p>
          ) : (
            <ul className="space-y-2">
              {communities.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <IconUsers width={18} height={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">
                      {c.memberCount} Mitglieder
                      {c.context ? ` · ${c.context}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {communities.length > 1 && (
            <p className="mt-3 text-xs text-faint">
              Deine Matches kommen aus allen deinen Communities zusammen.
            </p>
          )}
        </Card>

        <LinkedinCard
          currentUrl={user?.linkedinUrl ?? null}
          profileRead={user?.linkedinProfileRead ?? false}
        />

        <div className="pt-2">
          <Badge tone="neutral">CoMatch v0.1</Badge>
        </div>

        <Button variant="secondary" fullWidth onClick={signOut}>
          Abmelden
        </Button>
      </div>
    </>
  );
}

/** Avatar, name and role/company — with an inline form to edit name, role,
 *  company and bio. */
function ProfileCard({ user }: { user: AuthUser | null }) {
  const displayName = user?.name ?? user?.email ?? "Du";
  const subtitle = [user?.role, user?.company].filter(Boolean).join(" · ");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", company: "", bio: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setForm({
      name: user?.name ?? "",
      role: user?.role ?? "",
      company: user?.company ?? "",
      bio: user?.bio ?? "",
    });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiUpdateProfile(form);
      refreshUser();
      setEditing(false);
    } catch (err) {
      console.error("[profile] save failed", err);
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <Avatar src={user?.avatarUrl ?? undefined} name={displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-ink">{displayName}</h2>
          <p className="truncate text-sm text-muted">
            {subtitle || "Profil noch nicht vervollständigt"}
          </p>
          {!editing && (
            <button
              onClick={startEdit}
              className="mt-1 text-sm font-medium text-brand-600"
            >
              Profil bearbeiten
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <ProfileField
            label="Name"
            value={form.name}
            onChange={(name) => setForm((f) => ({ ...f, name }))}
            placeholder="Dein Name"
          />
          <ProfileField
            label="Rolle"
            value={form.role}
            onChange={(role) => setForm((f) => ({ ...f, role }))}
            placeholder="z. B. Frontend-Entwicklerin"
          />
          <ProfileField
            label="Unternehmen"
            value={form.company}
            onChange={(company) => setForm((f) => ({ ...f, company }))}
            placeholder="z. B. ACME GmbH"
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Über mich
            </span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Ein paar Sätze über dich – sichtbar auf deiner Match-Detailseite."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[15px] placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" disabled={!form.name.trim() || busy} onClick={save}>
              {busy ? "Speichere…" : "Speichern"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[15px] placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}

/** Add or change the LinkedIn URL. Saving requires data-processing consent and
 *  re-reads the profile via the API. A badge shows whether the profile behind
 *  the saved URL was actually read. */
function LinkedinCard({
  currentUrl,
  profileRead,
}: {
  currentUrl: string | null;
  profileRead: boolean;
}) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = url.trim() !== (currentUrl ?? "").trim();
  const canSave = url.trim().length > 0 && consent && dirty && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await apiSaveLinkedin(url.trim(), consent);
      refreshUser();
      setConsent(false);
      if (res.profileFetched) {
        setStatus({
          ok: true,
          text: "Profil erfolgreich ausgelesen. Deine Skill-Vorschläge werden neu erstellt.",
        });
      } else if (res.reason === "unipile_not_configured") {
        setStatus({
          ok: false,
          text: "URL gespeichert – der Profil-Import ist derzeit deaktiviert.",
        });
      } else {
        setStatus({
          ok: false,
          text: "URL gespeichert, aber das Profil konnte nicht ausgelesen werden. Bitte prüfe die URL und versuche es erneut.",
        });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 400
          ? "Bitte gib eine gültige LinkedIn-URL ein."
          : "Speichern fehlgeschlagen. Bitte erneut versuchen.";
      setStatus({ ok: false, text: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <IconLink width={18} height={18} className="text-brand-600" />
        <p className="text-sm font-medium text-ink">LinkedIn</p>
        {currentUrl && (
          <Badge tone={profileRead ? "success" : "warning"} className="ml-auto">
            {profileRead ? "Profil ausgelesen" : "Nicht ausgelesen"}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="linkedin.com/in/deinname"
          inputMode="url"
          autoCapitalize="none"
          className="h-10 flex-1 bg-transparent text-[15px] placeholder:text-faint focus:outline-none"
        />
      </div>

      {dirty && url.trim().length > 0 && (
        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand-600 focus:ring-brand-500/30"
          />
          <span>
            Ich stimme zu, dass mein öffentliches LinkedIn-Profil ausgelesen,
            verarbeitet und gespeichert wird.
          </span>
        </label>
      )}

      {status && (
        <p className={status.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {status.text}
        </p>
      )}

      <Button size="sm" disabled={!canSave} onClick={save}>
        {busy ? "Speichere…" : currentUrl ? "Aktualisieren" : "Verbinden"}
      </Button>
    </Card>
  );
}
