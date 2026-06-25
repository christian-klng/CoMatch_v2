import { useEffect, useRef, useState } from "react";
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
import {
  apiDeleteFile,
  apiDeleteLinkedin,
  apiDeleteWebsite,
  apiDownloadFile,
  apiListFiles,
  apiSaveLinkedin,
  apiSaveWebsite,
  apiSetLocale,
  apiUpdateProfile,
  ApiError,
  apiUploadFile,
} from "../lib/api";
import i18n, { currentLocale, type Locale } from "../i18n";
import { cn } from "../lib/cn";
import type { AuthUser, UserFile } from "../lib/types";
import {
  IconFile,
  IconGlobe,
  IconLink,
  IconTrash,
  IconUpload,
  IconUsers,
} from "../components/icons";

// File-upload limits — mirror the API (api/src/files.ts) for instant feedback.
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

        <WebsiteCard currentUrl={user?.websiteUrl ?? null} />

        <FilesCard />

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

  const hasLinkedin = Boolean(user?.linkedinUrl);

  const [editing, setEditing] = useState(false);
  // attributes is edited as a comma-separated string; split/trimmed on save.
  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    bio: "",
    contactChannel: "email" as "email" | "linkedin",
    contactNote: "",
    attributes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setForm({
      name: user?.name ?? "",
      role: user?.role ?? "",
      company: user?.company ?? "",
      bio: user?.bio ?? "",
      // 'linkedin' is only selectable with a stored LinkedIn URL.
      contactChannel: user?.contactChannel === "linkedin" && hasLinkedin ? "linkedin" : "email",
      contactNote: user?.contactNote ?? "",
      attributes: (user?.attributes ?? []).join(", "),
    });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const attributes = form.attributes
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 3);
      await apiUpdateProfile({ ...form, attributes });
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
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              {t("profile.contactChannel")}
            </span>
            <select
              value={form.contactChannel}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactChannel: e.target.value as "email" | "linkedin" }))
              }
              className="w-full cursor-pointer rounded-md border border-border bg-surface px-3.5 py-2 text-[15px] text-ink shadow-xs transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="email">{t("profile.contactChannelEmail")}</option>
              {hasLinkedin && (
                <option value="linkedin">{t("profile.contactChannelLinkedin")}</option>
              )}
            </select>
            <p className="mt-1 text-xs text-faint">{t("profile.contactChannelHint")}</p>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              {t("profile.contactNote")}
            </span>
            <textarea
              value={form.contactNote}
              onChange={(e) => setForm((f) => ({ ...f, contactNote: e.target.value }))}
              placeholder={t("profile.contactNotePlaceholder")}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-md border border-border bg-surface px-3.5 py-2 text-[15px] text-ink shadow-xs transition-colors placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>
          <div>
            <Input
              label={t("profile.attributes")}
              value={form.attributes}
              onChange={(e) => setForm((f) => ({ ...f, attributes: e.target.value }))}
              placeholder={t("profile.attributesPlaceholder")}
            />
            <p className="mt-1 text-xs text-faint">{t("profile.attributesHint")}</p>
          </div>

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

/** The user's own website URL — stored as-is, reading the site comes later. */
function WebsiteCard({ currentUrl }: { currentUrl: string | null }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(currentUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = url.trim() !== (currentUrl ?? "").trim();
  const canSave = url.trim().length > 0 && dirty && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setStatus(null);
    try {
      await apiSaveWebsite(url.trim());
      refreshUser();
      setStatus({ ok: true, text: t("profile.websiteSaved") });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 400
          ? t("profile.websiteInvalid")
          : t("profile.websiteError");
      setStatus({ ok: false, text: msg });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await apiDeleteWebsite();
      setUrl("");
      refreshUser();
    } catch {
      setStatus({ ok: false, text: t("profile.websiteError") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <IconGlobe width={18} height={18} className="text-brand-600" />
        <p className="text-sm font-medium text-ink">{t("profile.websiteTitle")}</p>
      </div>

      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("profile.websitePlaceholder")}
        inputMode="url"
        autoCapitalize="none"
      />

      {status && (
        <Notice tone={status.ok ? "success" : "danger"}>{status.text}</Notice>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={!canSave} onClick={save}>
          {busy
            ? t("common.saving")
            : currentUrl
              ? t("profile.websiteUpdate")
              : t("profile.websiteSave")}
        </Button>
        {currentUrl && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={clear}>
            {t("profile.websiteRemove")}
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Drag-&-drop upload of files about the user (CV, pitch deck, …). Reading the
 *  files comes later; for now they can be uploaded, downloaded and deleted. */
function FilesCard() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiListFiles()
      .then(setFiles)
      .catch(() => {});
  }, []);

  const atLimit = files.length >= MAX_FILES;

  const upload = async (selected: File[]) => {
    if (selected.length === 0) return;
    setError(null);
    let count = files.length;
    setBusy(true);
    try {
      for (const f of selected) {
        if (count >= MAX_FILES) {
          setError(t("profile.filesTooMany", { max: MAX_FILES }));
          break;
        }
        if (!ALLOWED_MIME.includes(f.type)) {
          setError(t("profile.fileUnsupported"));
          continue;
        }
        if (f.size > MAX_FILE_BYTES) {
          setError(t("profile.fileTooLarge"));
          continue;
        }
        const created = await apiUploadFile(f);
        setFiles((prev) => [created, ...prev]);
        count++;
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.message : "";
      setError(
        code === "too_many_files"
          ? t("profile.filesTooMany", { max: MAX_FILES })
          : code === "file_too_large"
            ? t("profile.fileTooLarge")
            : code === "unsupported_type"
              ? t("profile.fileUnsupported")
              : t("profile.filesError"),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiDeleteFile(id);
      setFiles((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setError(t("profile.filesError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <IconUpload width={18} height={18} className="text-brand-600" />
        <p className="text-sm font-medium text-ink">{t("profile.filesTitle")}</p>
        <span className="ml-auto text-xs text-muted">
          {files.length}/{MAX_FILES}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-muted">{t("profile.filesHint")}</p>

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit && !busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!atLimit && !busy) upload(Array.from(e.dataTransfer.files));
        }}
        onClick={() => !atLimit && !busy && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-brand-500 bg-brand-50" : "border-border",
          (busy || atLimit) && "pointer-events-none opacity-50",
        )}
      >
        <IconUpload width={22} height={22} className="text-muted" />
        <p className="text-sm text-ink-soft">{t("profile.filesDrop")}</p>
        <p className="text-xs text-faint">{t("profile.filesFormats")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
        onChange={(e) => upload(Array.from(e.target.files ?? []))}
      />

      {error && <Notice tone="danger">{error}</Notice>}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <IconFile width={18} height={18} className="shrink-0 text-muted" />
              <button
                type="button"
                onClick={() => apiDownloadFile(f).catch(() => setError(t("profile.filesError")))}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm text-ink">{f.filename}</p>
                <p className="text-xs text-faint">{formatBytes(f.sizeBytes)}</p>
              </button>
              <button
                type="button"
                onClick={() => remove(f.id)}
                disabled={busy}
                aria-label={t("profile.fileRemove")}
                className="shrink-0 text-muted transition-colors hover:text-danger"
              >
                <IconTrash width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
