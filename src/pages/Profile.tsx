import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ScreenHeader } from "../components/AppShell";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Notice } from "../components/ui/Notice";
import { logout, refreshUser, useAuth } from "../lib/auth";
import { useMyCommunities } from "../lib/community";
import { apiDeleteLinkedin, apiSaveLinkedin, apiSetLocale, apiUpdateProfile, ApiError } from "../lib/api";
import i18n, { currentLocale, type Locale } from "../i18n";
import { cn } from "../lib/cn";
import type { AuthUser } from "../lib/types";
import { IconLink, IconUsers } from "../components/icons";

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { communities } = useMyCommunities();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <ScreenHeader title={t("profile.title")} />
      <div className="space-y-4 px-5 py-5">
        <ProfileCard user={user} />

        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              {t("profile.communities")}
              {communities.length > 0 && (
                <span className="ml-1 text-muted">({communities.length})</span>
              )}
            </p>
            <Button size="sm" variant="ghost" onClick={() => navigate("/scan")}>
              {t("profile.joinCommunity")}
            </Button>
          </div>

          {communities.length === 0 ? (
            <p className="text-sm text-muted">{t("profile.noCommunity")}</p>
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
                      {t("profile.members", { count: c.memberCount })}
                      {c.context ? ` · ${c.context}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {communities.length > 1 && (
            <p className="mt-3 text-xs text-faint">{t("profile.poolHint")}</p>
          )}
        </Card>

        <LinkedinCard
          currentUrl={user?.linkedinUrl ?? null}
          profileRead={user?.linkedinProfileRead ?? false}
        />

        <LanguageCard />

        <div className="pt-2">
          <Badge tone="neutral">CoMatch v0.1</Badge>
        </div>

        <Button variant="secondary" fullWidth onClick={signOut}>
          {t("profile.signOut")}
        </Button>
      </div>
    </>
  );
}

/** Avatar, name and role/company — with an inline form to edit name, role,
 *  company and bio. */
function ProfileCard({ user }: { user: AuthUser | null }) {
  const { t } = useTranslation();
  const displayName = user?.name ?? user?.email ?? t("profile.you");
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
      setError(t("profile.saveError"));
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
            {subtitle || t("profile.incomplete")}
          </p>
          {!editing && (
            <button
              onClick={startEdit}
              className="mt-1 text-sm font-medium text-brand-600"
            >
              {t("profile.edit")}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Input
            label={t("profile.name")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t("profile.namePlaceholder")}
          />
          <Input
            label={t("profile.role")}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder={t("profile.rolePlaceholder")}
          />
          <Input
            label={t("profile.company")}
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder={t("profile.companyPlaceholder")}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              {t("profile.bio")}
            </span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder={t("profile.bioPlaceholder")}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-md border border-border bg-surface px-3.5 py-2 text-[15px] text-ink shadow-xs transition-colors placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          {error && <Notice>{error}</Notice>}

          <div className="flex gap-2">
            <Button size="sm" disabled={!form.name.trim() || busy} onClick={save}>
              {busy ? t("common.saving") : t("common.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Add or change the LinkedIn URL. Saving requires data-processing consent and
 *  re-reads the profile via the API. A badge shows whether the profile behind
 *  the saved URL was actually read. */
/** Language switcher — persists the explicit choice locally (detector cache)
 *  and server-side (for outgoing emails). */
function LanguageCard() {
  const { t } = useTranslation();
  const active = currentLocale();

  const choose = (locale: Locale) => {
    if (locale === active) return;
    void i18n.changeLanguage(locale);
    // Fire-and-forget: the UI switches immediately either way.
    apiSetLocale(locale).catch((err) =>
      console.error("[profile] locale save failed", err),
    );
  };

  return (
    <Card className="flex items-center justify-between p-4">
      <p className="text-sm font-medium text-ink">{t("profile.language")}</p>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {(["de", "en"] as const).map((locale) => (
          <button
            key={locale}
            onClick={() => choose(locale)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-all",
              active === locale
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink-soft",
            )}
          >
            {locale === "de" ? "Deutsch" : "English"}
          </button>
        ))}
      </div>
    </Card>
  );
}

function LinkedinCard({
  currentUrl,
  profileRead,
}: {
  currentUrl: string | null;
  profileRead: boolean;
}) {
  const { t } = useTranslation();
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
        setStatus({ ok: true, text: t("profile.linkedinSuccess") });
      } else if (res.reason === "unipile_not_configured") {
        setStatus({ ok: false, text: t("profile.linkedinDisabled") });
      } else {
        setStatus({ ok: false, text: t("profile.linkedinFetchFailed") });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 400
          ? t("profile.linkedinInvalid")
          : t("profile.linkedinError");
      setStatus({ ok: false, text: msg });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await apiDeleteLinkedin();
      setUrl("");
      setConsent(false);
      refreshUser();
    } catch {
      setStatus({ ok: false, text: t("profile.linkedinError") });
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
            {profileRead ? t("profile.linkedinRead") : t("profile.linkedinNotRead")}
          </Badge>
        )}
      </div>

      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("profile.linkedinPlaceholder")}
        inputMode="url"
        autoCapitalize="none"
      />

      {dirty && url.trim().length > 0 && (
        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
          />
          <span>{t("profile.linkedinConsent")}</span>
        </label>
      )}

      {status && (
        <Notice tone={status.ok ? "success" : "danger"}>{status.text}</Notice>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={!canSave} onClick={save}>
          {busy
            ? t("common.saving")
            : currentUrl
              ? t("profile.linkedinUpdate")
              : t("profile.linkedinConnect")}
        </Button>
        {currentUrl && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={disconnect}>
            {t("profile.linkedinDisconnect")}
          </Button>
        )}
      </div>
    </Card>
  );
}
