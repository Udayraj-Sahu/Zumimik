"use client";

import { Zap, Trophy, Target, Star, Flame, Shield, Swords, Medal, User } from "lucide-react";
import { useProfileData } from "@/hooks/queries/use-profile";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, React.ElementType> = {
  Flame, Zap, Medal, Star, Shield, Swords,
};

export default function ProfilePage() {
  usePageMeta("Profile — Zuzumik");
  const { data, isLoading, error } = useProfileData();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {error ? (
          <div className="text-center">
            <p className="text-[13px] text-destructive">{error instanceof Error ? error.message : "Something went wrong"}</p>
            <Button
              onClick={() => location.reload()}
              className="mt-4 px-6 uppercase tracking-wider"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  const { profile, stats, achievements } = data;

  return (
      <PageContainer className="pt-0">
        <div className="mx-auto w-full md:max-w-3xl">
        <div className="pt-5 pb-4 mb-5 text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-2 max-[359px]:px-3">
            <User size={12} className="text-primary" />
            <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">PROFILE</span>
          </div>
        </div>

        <header className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <span className="relative grid size-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-fluid-3xl font-black text-primary ring-2 ring-primary/30 sm:size-24">
            {profile.initials}
          </span>
          <div className="text-center sm:text-left">
            <h1 className="text-fluid-2xl font-black tracking-tight text-foreground">
              {profile.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-fluid-xs font-bold uppercase tracking-wider text-primary">
                <Zap size={10} />
                {profile.badge}
              </span>
              <span className="text-fluid-xs text-muted-foreground/60">{profile.level}</span>
              <span className="text-fluid-xs text-muted-foreground/60">&middot;</span>
              <span className="text-fluid-xs font-semibold text-chart-4">{profile.streak}</span>
            </div>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 max-[359px]:gap-2 md:items-stretch">
          {stats.map((s) => {
            const Icon = s.label === "Sessions" ? Target : s.label === "Streak" ? Flame : Trophy;
            return (
              <div
                key={s.label}
                className="relative overflow-hidden rounded-2xl border border-border/40 bg-card px-3 py-4 text-center transition-all active:scale-95 sm:p-5 max-[359px]:p-2.5"
              >
                <Icon className="mx-auto size-3.5 text-muted-foreground/30 sm:size-4" aria-hidden="true" />
                <p className="mt-1.5 text-fluid-xl font-black tracking-tight text-primary sm:text-fluid-2xl">
                  {s.value}
                </p>
                <p className="text-fluid-xs font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        <section className="mt-6 mb-4" aria-label="Achievements">
          <h2 className="mb-3 text-fluid-sm font-bold uppercase tracking-widest text-primary">
            Achievements
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6 max-[359px]:gap-2 md:items-stretch">
            {achievements.map((a) => {
              const Icon = ICON_MAP[a.icon] || Star;
              return (
                <div
                  key={a.label}
                  className={`rounded-2xl border px-3 py-4 text-center transition-all sm:p-5 max-[359px]:p-2.5 ${
                    a.unlocked
                      ? "border-border/40 bg-card"
                      : "border-dashed border-border/20"
                  }`}
                >
                  <div
                    className={`mx-auto mb-2 grid size-8 place-items-center rounded-xl sm:size-10 ${
                      a.unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4 sm:size-5" aria-hidden="true" />
                  </div>
                  <p className="text-fluid-xs font-bold uppercase tracking-wide sm:text-fluid-sm whitespace-nowrap">
                    {a.label}
                  </p>
                  <p className="mt-0.5 text-fluid-xs text-muted-foreground">
                    {a.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        </div>
      </PageContainer>
  );
}
