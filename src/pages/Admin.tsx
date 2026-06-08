import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { IconCheck, IconPlus, IconUsers } from "../components/icons";
import {
  apiAdminCreateCommunity,
  apiAdminDeleteCommunity,
  apiAdminListCommunities,
  apiAdminUpdateCommunity,
} from "../lib/api";
import type { AdminCommunity } from "../lib/types";

/**
 * Lean community admin. No auth/permissions yet (single pre-launch operator).
 * Create a community, publish it, read out its 8-digit code for the scan flow.
 */
export function Admin() {
  const [items, setItems] = useState<AdminCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [creating, setCreating] = useState(false);

  const reload = () => {
    setLoading(true);
    apiAdminListCommunities()
      .then((rows) => {
        setItems(rows);
        setError(null);
      })
      .catch(() => setError("Communities konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiAdminCreateCommunity({
        name: name.trim(),
        context: context.trim() || undefined,
        published: publishNow,
      });
      setName("");
      setContext("");
      setPublishNow(true);
      reload();
    } catch {
      setError("Community konnte nicht erstellt werden.");
    } finally {
      setCreating(false);
    }
  };

  const togglePublished = async (c: AdminCommunity) => {
    try {
      await apiAdminUpdateCommunity(c.id, { published: !c.published });
      reload();
    } catch {
      setError("Status konnte nicht geändert werden.");
    }
  };

  const remove = async (c: AdminCommunity) => {
    if (!window.confirm(`Community „${c.name}" wirklich löschen?`)) return;
    try {
      await apiAdminDeleteCommunity(c.id);
      reload();
    } catch {
      setError("Community konnte nicht gelöscht werden.");
    }
  };

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            CoMatch Admin
          </h1>
          <p className="mt-1 text-sm text-muted">
            Communities verwalten · noch ohne Login (kommt später)
          </p>
        </header>

        {error && (
          <p className="mb-5 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {/* Create */}
        <section className="mb-8 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-ink">Neue Community</h2>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (z. B. TechFest Berlin 2025)"
              className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-[15px] placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Kontext (optional, z. B. Konferenz · 12.–13. Juni)"
              className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-[15px] placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500/30"
              />
              Sofort veröffentlichen (beitretbar)
            </label>
            <Button onClick={create} disabled={!name.trim() || creating}>
              <IconPlus width={18} height={18} />
              {creating ? "Erstelle…" : "Community erstellen"}
            </Button>
          </div>
        </section>

        {/* List */}
        <section>
          <h2 className="mb-3 font-semibold text-ink">
            Communities {!loading && `(${items.length})`}
          </h2>

          {loading ? (
            <p className="text-sm text-muted">Lädt…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Community angelegt.</p>
          ) : (
            <div className="space-y-3">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-ink">{c.name}</p>
                        {c.published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                            <IconCheck width={12} height={12} /> live
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                            Entwurf
                          </span>
                        )}
                      </div>
                      {c.context && (
                        <p className="mt-0.5 truncate text-sm text-muted">{c.context}</p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-faint">
                        <IconUsers width={13} height={13} />
                        {c.memberCount} Mitglieder
                      </p>
                    </div>

                    {/* The 8-digit code, big for reading out / typing in. */}
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] uppercase tracking-wide text-faint">
                        Beitritts-Code
                      </p>
                      <p className="font-mono text-2xl font-bold tracking-[0.15em] text-ink">
                        {c.code}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => togglePublished(c)}>
                      {c.published ? "Offline nehmen" : "Veröffentlichen"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(c)}>
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
