"use client";

import { useEffect, useState } from "react";
import { Plus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useFeatureFlags } from "@/hooks/queries/use-feature-flags";
import { useClubSearch, useCreateClub, useJoinClub, useLeaveClub, useMyClubs } from "@/hooks/queries/use-clubs";
import { gatedFeatureMessage, isFeatureOff } from "@/services/flags";
import { HUB_TYPES, type Club, type HubType } from "@/services/clubs";

type Tab = "find" | "yours";
type TypeFilter = "all" | HubType;

const TYPE_LABEL: Record<string, string> = { city: "City", society: "Society", school: "School", college: "College", cafe: "Café" };
const label = (t: string) => TYPE_LABEL[t] ?? t;
const errorText = (err: unknown, fallback: string) => gatedFeatureMessage(err, "Clubs") ?? (err instanceof Error && err.message ? err.message : fallback);

/** Clubs against the backend's virtual hubs (GET /clubs/search, /clubs/mine, POST /clubs/create|join|leave). Real mode only. */
export function ClubsLive() {
  usePageMeta("Clubs — Zuzumik");
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const off = isFeatureOff(flags, "virtual_hubs");
  // Wait for the flag list to settle (loaded or failed) so a feature that is off never gets a pointless request.
  const ready = !flagsLoading && !off;

  const [tab, setTab] = useState<Tab>("find");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search as you type, but not on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 300);
    return () => clearTimeout(id);
  }, [input]);

  const search = useClubSearch(query, ready && tab === "find");
  const mine = useMyClubs(ready);
  const join = useJoinClub();
  const leave = useLeaveClub();

  const joinedIds = new Set((mine.data ?? []).map((c) => c.hub_id));
  const source = tab === "find" ? search : mine;
  const clubs = (source.data ?? []).filter((c) => typeFilter === "all" || c.hub_type === typeFilter);
  const busyId = join.isPending ? join.variables : leave.isPending ? leave.variables : null;

  const act = (club: Club, joined: boolean) => {
    setActionError(null);
    const m = joined ? leave : join;
    m.mutate(club.hub_id, { onError: (err) => setActionError(errorText(err, joined ? "Couldn't leave this club." : "Couldn't join this club.")) });
  };

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <Users size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">CLUBS</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal">Find and join study communities</p>
        </div>

        {off ? (
          <p role="status" data-testid="clubs-off" className="mt-10 text-center text-[12px] text-muted-foreground/60">
            Clubs aren&apos;t enabled for your account yet.
          </p>
        ) : (
          <>
            <div className="mt-5 flex gap-1 p-1 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              {(["find", "yours"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 min-h-11 py-2 rounded-xl text-[12px] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
                    tab === t ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground/50 hover:text-foreground",
                  )}
                >
                  {t === "find" ? "Find Clubs" : "Your Clubs"}
                </button>
              ))}
            </div>

            {tab === "find" && (
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search clubs by name"
                aria-label="Search clubs"
                className="mt-4 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-foreground outline-none focus:border-primary/40"
              />
            )}

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-[359px]:gap-1.5">
              {(["all", ...HUB_TYPES] as TypeFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTypeFilter(f)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap outline-none transition-all border backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-ring min-h-[32px]",
                    typeFilter === f ? "bg-primary text-primary-foreground border-primary" : "text-foreground/80 border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]",
                  )}
                >
                  {f === "all" ? "All" : label(f)}
                </button>
              ))}
            </div>

            {actionError && (
              <p role="alert" data-testid="clubs-action-error" className="mt-3 text-center text-[12px] text-destructive">
                {actionError}
              </p>
            )}

            <div className="mt-5" data-testid="clubs-list">
              {source.isLoading && <div className="h-24 rounded-2xl bg-white/[0.05] animate-pulse" aria-busy="true" data-testid="clubs-loading" />}

              {source.isError && !source.isLoading && (
                <div role="alert" data-testid="clubs-error" className="py-10 text-center">
                  <p className="text-[12px] font-semibold text-destructive">{errorText(source.error, "Couldn't load clubs.")}</p>
                  <Button onClick={() => void source.refetch()} className="mt-3 px-5 py-2.5">
                    Retry
                  </Button>
                </div>
              )}

              {!source.isLoading && !source.isError && clubs.length === 0 && (
                <div className="py-14 text-center" data-testid="clubs-empty">
                  <Users size={28} className="mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-[12px] text-muted-foreground/60">{tab === "yours" ? "You haven't joined any clubs yet" : "No clubs found"}</p>
                  <p className="text-micro text-muted-foreground/40 mt-1">{tab === "yours" ? "Find one, or create your own." : "Try a different search, or create one."}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-stretch md:gap-5 max-[359px]:gap-1.5">
                {clubs.map((club) => {
                  const joined = joinedIds.has(club.hub_id);
                  return (
                    <ClubRow key={club.hub_id} club={club} joined={joined} busy={busyId === club.hub_id} onToggle={() => act(club, joined)} />
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!off && (
          <Button
            aria-label="Create club"
            size="icon"
            onClick={() => setCreateOpen(true)}
            className="fixed right-5 bottom-20 z-40 size-14 rounded-full shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 max-[359px]:right-4"
          >
            <Plus size={22} strokeWidth={2.5} />
          </Button>
        )}
      </div>

      <CreateClubDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setTab("yours")} />
    </PageContainer>
  );
}

function ClubRow({ club, joined, busy, onToggle }: { club: Club; joined: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <GlassCard data-club-item className="flex items-center gap-3.5 p-4 max-[359px]:gap-2.5 max-[359px]:p-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-[13px] font-black text-primary" aria-hidden>
        {club.name.trim().slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold leading-tight text-foreground">{club.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50">
          {label(club.hub_type)}
          {club.city ? ` · ${club.city}` : ""}
          {club.your_role === "owner" ? " · Owner" : club.your_role === "officer" ? " · Officer" : ""}
        </p>
        <span className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/60">
          <Users size={10} /> {club.members} {club.members === 1 ? "member" : "members"}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={`${joined ? "Leave" : "Join"} ${club.name}`}
        className={cn(
          "min-h-[36px] shrink-0 rounded-full px-4 text-micro font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          joined ? "border border-white/[0.1] text-muted-foreground hover:text-destructive" : "bg-primary text-primary-foreground",
        )}
      >
        {busy ? "…" : joined ? "Leave" : "Join"}
      </button>
    </GlassCard>
  );
}

function CreateClubDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const create = useCreateClub();
  const [name, setName] = useState("");
  const [hubType, setHubType] = useState<HubType>("city");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 3 && name.trim().length <= 80;
  const submit = () => {
    if (!valid || create.isPending) return;
    setError(null);
    create.mutate(
      { name, hub_type: hubType, city },
      {
        onSuccess: () => {
          setName("");
          setCity("");
          onClose();
          onCreated();
        },
        onError: (err) => setError(errorText(err, "Couldn't create the club.")),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} placement="center" className="max-w-[380px] border-[var(--glass-border)] bg-[var(--glass-02)]" ariaLabel="Create a club">
      <form
        className="p-5"
        data-testid="create-club-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Create a club</span>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90">
            <X size={15} />
          </button>
        </div>
        <label className="mt-4 block text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="At least 3 characters"
            className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-foreground outline-none focus:border-primary/40"
          />
        </label>
        <label className="mt-3 block text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
          Type
          <select
            value={hubType}
            onChange={(e) => setHubType(e.target.value as HubType)}
            className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[var(--bg)] px-4 py-3 text-[13px] font-semibold text-foreground outline-none focus:border-primary/40"
          >
            {HUB_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
          City (optional)
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-foreground outline-none focus:border-primary/40"
          />
        </label>
        {error && (
          <p role="alert" data-testid="create-club-error" className="mt-3 text-[12px] text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={!valid || create.isPending} className="mt-4 min-h-[44px] w-full">
          {create.isPending ? "Creating…" : "Create club"}
        </Button>
      </form>
    </Dialog>
  );
}
