"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Phone,
  DollarSign,
  Laptop,
  HelpCircle,
  MessageSquare,
  LogOut,
  Clock,
  FileText,
  Award,
  Trophy,
  User,
  Bell,
  ChevronRight,
  Zap,
  Pencil,
  Shield,
  CreditCard,
  Check,
  X,
  ChevronDown,
  Settings,
  Trash2,
  Sun,
  Moon,
  BookOpen,
} from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useAuthStore } from "@/stores/auth-store";
import { useAccountSummary } from "@/hooks/queries/use-account-summary";
import { useSubscription } from "@/hooks/queries/use-subscription";
import { usePaywallStore } from "@/stores/paywall-store";
import { useThemeStore } from "@/stores/theme-store";
import { resetAppState, purgeUserData } from "@/lib/platform";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { Dialog } from "@/components/ui/dialog";
import { AdBanner } from "@/components/ads/ad-banner";
import { deleteAccount } from "@/services/account";
import { AddPrepModal } from "@/components/learn/add-prep-modal";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { DOMAIN_LABELS } from "@/lib/types/template";
import { cn } from "@/lib/utils";
import { GLASS_BG, GLASS_BORDER, RED_SOFT_06, RED_SOFT_25, accentThemes, ACCENT_IDS } from "@/lib/theme";
import { GlassCard } from "@/components/ui/glass-card";

/* ------------------------------------------------------------------ */
/*  Reusable row item                                                   */
/* ------------------------------------------------------------------ */
type RowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  danger?: boolean;
  onClick?: () => void;
};

function Row({ icon, title, subtitle, danger, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 rounded-2xl border backdrop-blur-xl px-5 py-4 text-left transition-all hover:bg-white/[0.06] active:scale-[0.99] max-[359px]:gap-3 max-[359px]:px-4 max-[359px]:py-3"
      style={{ borderColor: GLASS_BORDER, background: GLASS_BG }}
    >
      <span className={danger ? "text-[var(--red-soft)]" : "text-primary"}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={danger ? "block text-[13px] font-semibold text-[var(--red-soft)] tracking-[-0.01em]" : "block text-[13px] font-semibold text-foreground tracking-[-0.01em]"}>
          {title}
        </span>
        <span className="block text-[12px] text-muted-foreground/40 mt-0.5 font-normal">
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
    </button>
  );
}

function HeadingTile({ icon, danger, onClick, label, heading }: { icon: React.ReactNode; danger?: boolean; onClick?: () => void; label?: string; heading: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border backdrop-blur-xl px-3 py-5 text-center transition-all hover:bg-white/[0.06] active:scale-[0.98]"
      style={{ borderColor: danger ? RED_SOFT_25 : GLASS_BORDER, background: danger ? RED_SOFT_06 : GLASS_BG }}
    >
      <span className={danger ? "text-[var(--red-soft)]" : "text-primary"}>
        {icon}
      </span>
      <span className={danger ? "block text-[12px] font-semibold text-[var(--red-soft)] tracking-[-0.01em] leading-tight break-words" : "block text-[12px] font-semibold text-foreground tracking-[-0.01em] leading-tight break-words"}>
        {heading}
      </span>
    </button>
  );
}

function CollapsibleSection({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      {open ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between pt-6 pb-3 text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase max-[359px]:pt-5 max-[359px]:pb-2"
          >
            {label}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 rotate-180" />
          </button>
          {children}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-6 flex w-full items-center justify-between rounded-2xl border backdrop-blur-xl px-5 py-4 transition-all hover:bg-white/[0.06] active:scale-[0.99] max-[359px]:px-4 max-[359px]:py-3"
          style={{ borderColor: GLASS_BORDER, background: GLASS_BG }}
        >
          <span className="text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase">
            {label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        </button>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pt-6 pb-3 text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase max-[359px]:pt-5 max-[359px]:pb-2">
      {children}
    </p>
  );
}


/* ------------------------------------------------------------------ */
/*  Profile header                                                      */
/* ------------------------------------------------------------------ */
function ProfileHeader({ name, initials, badge, onEdit }: { name: string; initials: string; badge: string; onEdit: () => void }) {
  return (
    <div className="relative flex flex-col items-center pt-2 pb-1 text-center">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--accent-25) 0%, transparent 70%)" }} />
      <div className="relative mb-4 inline-flex items-center gap-2 pill px-4 py-1.5">
          <Settings size={12} className="text-primary" />
          <span className="text-[11px] font-semibold tracking-[0.22em] text-primary/80">SETTINGS</span>
        </div>
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 backdrop-blur-sm">
          <span className="text-lg font-bold tracking-[-0.02em] text-primary">{initials}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit profile photo"
          className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_12px_var(--accent-30)]">
            <Pencil className="h-2.5 w-2.5" />
          </span>
        </button>
      </div>
      <h1 className="mt-3 text-[16px] font-bold tracking-[-0.02em] text-foreground">{name}</h1>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] max-[359px]:gap-1.5 whitespace-nowrap">
        <span className="flex items-center gap-1 font-semibold text-primary">
          <Shield className="h-3 w-3" /> {badge}
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span className="text-muted-foreground/40 font-normal">Lv. 04</span>
        <span className="text-muted-foreground/30">·</span>
        <span className="text-muted-foreground/40 font-normal">Mumbai, India</span>
      </div>
      <button type="button" onClick={onEdit} className="mt-2 flex min-h-11 items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] text-primary whitespace-nowrap">
        <Pencil className="h-3 w-3" /> EDIT PROFILE
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat cards                                                          */
/* ------------------------------------------------------------------ */
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <GlassCard radius="2xl" className="flex-1 px-4 py-4 max-[359px]:p-3">
      <div className="flex items-center justify-between text-primary">
        {icon}
        <span className="text-[17px] font-bold tracking-[-0.02em] text-foreground">{value}</span>
      </div>
      <p className="mt-2.5 text-micro font-semibold tracking-[0.14em] text-muted-foreground/60 uppercase whitespace-nowrap">{label}</p>
      <div className="mt-2 h-[2px] w-full rounded-full bg-white/[0.04]" />
    </GlassCard>
  );
}

function PerformanceOverview({ questions, streak, rank, xp }: { questions: string; streak: string; rank: string; xp: string }) {
  return (
    <div>
      <SectionLabel>PERFORMANCE OVERVIEW</SectionLabel>
      <div className="grid grid-cols-2 gap-3 max-[359px]:gap-2 md:items-stretch">
        <StatCard icon={<span className="text-lg">🎯</span>} value={questions} label="Questions" />
        <StatCard icon={<span className="text-lg">🔥</span>} value={streak} label="Streak" />
        <StatCard icon={<Trophy className="h-5 w-5" />} value={rank} label="Rank" />
        <StatCard icon={<Zap className="h-5 w-5" />} value={xp} label="XP" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subscription card                                                   */
/* ------------------------------------------------------------------ */
const PLAN_NAMES: Record<string, string> = {
  free: "Free Plan",
  pro: "Pro",
  bundle_2: "Bundle (2 seats)",
  bundle_3: "Bundle (3 seats)",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Plan, status and dates come from GET /billing/subscription; a plan picked in the UI is never shown as owned.
function SubscriptionCard() {
  const { data, isLoading, isError, refetch } = useSubscription();
  const openPaywall = usePaywallStore((st) => st.openPaywall);
  const periodEnd = formatDate(data?.periodEnd ?? null);
  const trialEnd = formatDate(data?.trialEndsAt ?? null);
  return (
    <div>
      <SectionLabel>SUBSCRIPTION</SectionLabel>
      <div className="relative overflow-hidden rounded-3xl border backdrop-blur-xl p-5 max-[359px]:p-4" style={{ borderColor: GLASS_BORDER, background: "linear-gradient(135deg, var(--accent-04) 0%, var(--glass-03) 100%)" }}>
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--accent-30), transparent)" }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3 max-[359px]:gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div data-testid="subscription-plan">
              {isLoading ? (
                <p className="text-[14px] font-bold text-foreground/60">Loading…</p>
              ) : isError || !data ? (
                <p className="text-[14px] font-bold text-destructive">Couldn&apos;t load your plan</p>
              ) : (
                <>
                  <p className="text-[14px] font-bold tracking-[-0.01em] text-foreground">{PLAN_NAMES[data.tier] ?? data.tier}</p>
                  {data.status && <p className="text-[12px] text-muted-foreground/40 mt-0.5 capitalize">{data.status.replace(/_/g, " ")}</p>}
                </>
              )}
            </div>
          </div>
          {data && (
            <span className="rounded-full bg-white/[0.06] border border-white/[0.06] px-3 py-1 text-micro font-semibold tracking-[0.05em] text-muted-foreground/60">CURRENT</span>
          )}
        </div>
        {data && (trialEnd || periodEnd) && (
          <ul className="relative mt-4 space-y-2 text-[12px] text-foreground/80 font-normal">
            {trialEnd && <li>Trial ends {trialEnd}</li>}
            {periodEnd && <li>{data.cancelAtPeriodEnd ? "Ends" : "Renews"} {periodEnd}</li>}
          </ul>
        )}
        {isError && (
          <button type="button" onClick={() => refetch()} className="relative mt-4 w-full rounded-full border border-white/10 py-3 text-[13px] font-semibold text-foreground/80">
            Retry
          </button>
        )}
        {data && !data.isPaid && (
          <button type="button" onClick={() => openPaywall("prep")} className="relative mt-5 w-full rounded-full bg-cta py-3.5 text-[13px] font-semibold tracking-[-0.01em] text-[var(--on-accent)] shadow-[0_0_20px_var(--accent-25)] transition-all hover:shadow-[0_0_30px_var(--accent-40)] active:scale-[0.98] max-[359px]:py-3 whitespace-nowrap">
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  usePageMeta("Settings — Zuzumik");
  const router = useRouter();
  const firstName = useOnboardingStore((s) => s.firstName);
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activePreps = useOnboardingStore((s) => s.activePreps);

  const [showAddPrep, setShowAddPrep] = useState(false);

const theme = useThemeStore((s) => s.theme);
const accent = useThemeStore((s) => s.accent);
const setAccent = useThemeStore((s) => s.setAccent);
const toggleTheme = useThemeStore((s) => s.toggleTheme);
const modeTitle = theme === "light" ? "Light" : theme === "study" ? "Study" : "Dark";
const ModeIcon = theme === "light" ? Sun : theme === "study" ? BookOpen : Moon;

  const prepExams = useMemo(() => {
    const others = activePreps.filter((id) => id !== targetExam && id in DOMAIN_LABELS);
    const list = [...others];
    if (targetExam && targetExam in DOMAIN_LABELS) list.unshift(targetExam);
    return list;
  }, [activePreps, targetExam]);

  const accountName = useAuthStore((st) => st.user?.name);
  const accountTier = useAuthStore((st) => st.user?.tier);
  const { data: summary } = useAccountSummary();
  const stat = (v: number | null | undefined, fmt: (n: number) => string = (n) => n.toLocaleString()) => (v == null ? "--" : fmt(v));
  const name = firstName || accountName || "Google User";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    void resetAppState().then(() => router.replace("/"));
  };

  // Delete account: DELETE /auth/me, then clear everything local. Never signs out unless the server confirmed the deletion.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteConfirm("");
    setDeleteError(null);
  };
  const handleDeleteAccount = async () => {
    if (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete your account. Please try again.");
      setDeleting(false);
      return;
    }
    await purgeUserData();
    router.replace("/");
  };

  return (
    <PageContainer className="pt-1">
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--accent-20) 0%, transparent 70%)" }} />

      {/* Profile summary */}
      <ProfileHeader
        name={name}
        initials={initials || "UA"}
        badge={(accountTier || "free").toUpperCase()}
        onEdit={() => router.push("/settings/profile/edit")}
      />

      <div className="mt-2 space-y-4 max-[359px]:space-y-3">
        <PerformanceOverview
          questions={stat(summary?.questions)}
          streak={stat(summary?.streakDays, (n) => `${n}-Day`)}
          rank={stat(summary?.rank, (n) => `#${n}`)}
          xp={stat(summary?.xp)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-stretch max-[359px]:gap-3">
          <SubscriptionCard />

          {/* Prep / Membership */}
          <div className="flex flex-col">
            <SectionLabel>PREP / MEMBERSHIP</SectionLabel>
            {prepExams.length === 0 ? (
              <div className="flex-1 rounded-2xl border border-dashed border-white/[0.06] backdrop-blur-xl py-8 text-center max-[359px]:py-6" style={{ background: GLASS_BG }}>
                <p className="text-[12px] text-muted-foreground/60 font-normal">No active preps yet</p>
              </div>
            ) : (
              <GlassCard radius="2xl" className="flex-1 p-4 max-[359px]:p-3">
                <div className="flex flex-wrap gap-2 max-[359px]:gap-1.5">
                  {prepExams.map((id) => (
                    <span
                      key={id}
                      className={cn(
                        "text-[11px] font-semibold rounded-full px-3.5 py-1.5 transition-all max-[359px]:px-3 whitespace-nowrap",
                        id === targetExam
                          ? "pill-sheen bg-primary/10 text-primary border border-primary/20"
                          : "pill bg-[var(--glass-05)] text-foreground/80",
                      )}
                    >
                      {DOMAIN_LABELS[id]}
                      {id === targetExam && <Check size={11} strokeWidth={3} className="ml-1 inline text-primary" />}
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}
            <button
              type="button"
              onClick={() => setShowAddPrep(true)}
              className="mt-3 w-full rounded-2xl border border-dashed border-primary/20 bg-primary/5 backdrop-blur-xl py-4 text-[13px] font-semibold text-primary transition-all hover:border-primary/35 hover:bg-primary/[0.08] active:scale-[0.98] max-[359px]:py-3 whitespace-nowrap"
            >
              + Add Prep
            </button>
          </div>
        </div>

        {/* Appearance */}
          <div>
            <SectionLabel>APPEARANCE</SectionLabel>
            <div className="space-y-2.5 md:hidden max-[359px]:space-y-2">
              <Row
                icon={<ModeIcon className="h-5 w-5" />}
                title="Theme"
                subtitle={`${modeTitle} mode — on`}
                onClick={toggleTheme}
              />
            </div>
            <div className="hidden md:grid md:items-stretch">
              <HeadingTile icon={<ModeIcon className="h-5 w-5" />} heading={`${modeTitle} Mode`} onClick={toggleTheme} />
            </div>
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Accent colour
              </p>
              <div
                role="group"
                aria-label="Accent colour"
                className="flex flex-wrap gap-2"
              >
                {ACCENT_IDS.map((id) => {
                  const option = accentThemes[id];
                  const selected = accent === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAccent(id)}
                      aria-label={option.label}
                      aria-pressed={selected}
                      title={option.label}
                      className={cn(
                        "flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 transition-all active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected
                          ? "border-primary shadow-[0_0_0_3px_var(--accent-soft)]"
                          : "border-border/60 hover:border-primary/50",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: option.swatch }}
                      >
                        {selected && (
                          <Check
                            size={14}
                            strokeWidth={3}
                            className="text-[#0A0C0A]"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Changes buttons, links, progress and highlights. Status colours
                stay fixed.
              </p>
            </div>
          </div>

          {/* Activity & Records + Account Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-stretch max-[359px]:gap-3">
          <CollapsibleSection label="ACTIVITY & RECORDS" defaultOpen>
            <div className="space-y-2.5 md:hidden max-[359px]:space-y-2">
              <Row icon={<Clock className="h-5 w-5" />} title="Past Sessions" subtitle="View your sprint history" onClick={() => router.push("/settings/history")} />
              <Row icon={<FileText className="h-5 w-5" />} title="Reports" subtitle="Performance analytics" onClick={() => router.push("/settings/reports")} />
              <Row icon={<Award className="h-5 w-5" />} title="Achievements" subtitle="3/6 unlocked" onClick={() => router.push("/settings/achievements")} />
              <Row icon={<Trophy className="h-5 w-5" />} title="Leaderboard" subtitle="See your ranking" onClick={() => router.push("/settings/leaderboard")} />
            </div>
            <div className="hidden md:grid grid-cols-2 gap-2.5 md:items-stretch">
              <HeadingTile icon={<Clock className="h-5 w-5" />} heading="Past Sessions" onClick={() => router.push("/settings/history")} />
              <HeadingTile icon={<FileText className="h-5 w-5" />} heading="Reports" onClick={() => router.push("/settings/reports")} />
              <HeadingTile icon={<Award className="h-5 w-5" />} heading="Achievements" onClick={() => router.push("/settings/achievements")} />
              <HeadingTile icon={<Trophy className="h-5 w-5" />} heading="Leaderboard" onClick={() => router.push("/settings/leaderboard")} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection label="ACCOUNT SETTINGS" defaultOpen>
            <div className="space-y-2.5 md:hidden max-[359px]:space-y-2">
              <Row icon={<User className="h-5 w-5" />} title="Personal Details" subtitle="Name, email, phone" onClick={() => router.push("/settings/profile")} />
              <Row icon={<Bell className="h-5 w-5" />} title="Notification Preferences" subtitle="Push & reminders" onClick={() => router.push("/settings/notifications")} />
              <Row icon={<Calendar className="h-5 w-5" />} title="Class Calendar" subtitle="Schedule & planning" onClick={() => router.push("/settings/planner")} />
              <Row icon={<Phone className="h-5 w-5" />} title="Call Reminder" subtitle="Coming soon" />
              <Row icon={<DollarSign className="h-5 w-5" />} title="Payments" subtitle="Coming soon" />
              <Row icon={<Laptop className="h-5 w-5" />} title="Linked Devices" subtitle="Manage logged-in devices" onClick={() => router.push("/settings/linked-devices")} />
            </div>
            <div className="hidden md:grid grid-cols-3 gap-2.5 md:items-stretch">
              <HeadingTile icon={<User className="h-5 w-5" />} heading="Personal Details" onClick={() => router.push("/settings/profile/edit")} />
              <HeadingTile icon={<Bell className="h-5 w-5" />} heading="Notification" onClick={() => router.push("/settings/notifications")} />
              <HeadingTile icon={<Calendar className="h-5 w-5" />} heading="Class Calendar" onClick={() => router.push("/settings/planner")} />
              <HeadingTile icon={<Phone className="h-5 w-5" />} heading="Call Reminder" />
              <HeadingTile icon={<DollarSign className="h-5 w-5" />} heading="Payments" />
              <HeadingTile icon={<Laptop className="h-5 w-5" />} heading="Linked Devices" onClick={() => router.push("/settings/linked-devices")} />
            </div>
          </CollapsibleSection>
        </div>

        {/* Support + Account & Session */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-stretch max-[359px]:gap-3">
          <CollapsibleSection label="SUPPORT" defaultOpen>
            <div className="space-y-2.5 md:hidden max-[359px]:space-y-2">
              <Row icon={<HelpCircle className="h-5 w-5" />} title="Help Center" subtitle="Guides & tutorials" onClick={() => router.push("/settings/help")} />
              <Row icon={<MessageSquare className="h-5 w-5" />} title="FAQs" subtitle="Common questions" />
              <Row icon={<Phone className="h-5 w-5" />} title="Support" subtitle="We're here to help" />
            </div>
            <div className="hidden md:grid grid-cols-3 gap-2.5 md:items-stretch">
              <HeadingTile icon={<HelpCircle className="h-5 w-5" />} heading="Help Center" onClick={() => router.push("/settings/help")} />
              <HeadingTile icon={<MessageSquare className="h-5 w-5" />} heading="FAQs" />
              <HeadingTile icon={<Phone className="h-5 w-5" />} heading="Support" />
            </div>
          </CollapsibleSection>

          <AdBanner placement="settings_banner" className="mb-4" />

          <CollapsibleSection label="ACCOUNT & SESSION" defaultOpen>
            <div className="space-y-2.5 md:hidden max-[359px]:space-y-2">
              <Row icon={<LogOut className="h-5 w-5" />} title="Logout" subtitle="Sign out of your account" danger onClick={handleLogout} />
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex w-full items-center gap-4 rounded-2xl border border-[var(--red-soft-25)] bg-[var(--red-soft-06)] backdrop-blur-xl px-5 py-4 text-left transition-all hover:bg-[var(--red-soft-12)] active:scale-[0.99] max-[359px]:gap-3 max-[359px]:px-4 max-[359px]:py-3"
              >
                <span className="text-[var(--red-soft)]">
                  <Trash2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-[var(--red-soft)]">Delete Account Permanently</span>
                  <span className="block text-[11px] text-muted-foreground/40">This cannot be undone</span>
                </span>
              </button>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-2.5 md:items-stretch">
              <HeadingTile icon={<LogOut className="h-5 w-5" />} heading="Logout" danger onClick={handleLogout} />
              <HeadingTile icon={<Trash2 className="h-5 w-5" />} heading="Delete Account" danger onClick={() => setDeleteOpen(true)} />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {showAddPrep && <AddPrepModal onClose={() => setShowAddPrep(false)} />}
      <Dialog open={deleteOpen} onClose={closeDelete} placement="center" className="max-w-[360px] border-[var(--glass-border)] bg-[var(--glass-02)]" ariaLabel="Delete account">
        <div className="p-5" data-testid="delete-account-dialog">
          <h2 className="text-[15px] font-bold text-foreground">Delete your account?</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            This permanently deletes your account and your practice history. It cannot be undone.
          </p>
          <label className="mt-4 block text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
            Type DELETE to confirm
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              disabled={deleting}
              className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-mono text-[13px] font-semibold text-foreground outline-none focus:border-destructive/50"
            />
          </label>
          {deleteError && (
            <p role="alert" data-testid="delete-account-error" className="mt-3 text-[12px] text-destructive">
              {deleteError}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={closeDelete}
              disabled={deleting}
              className="min-h-[44px] flex-1 rounded-full border border-white/[0.08] px-4 text-micro font-bold uppercase tracking-wider text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
              className="min-h-[44px] flex-1 rounded-full border border-[var(--red-soft-25)] bg-[var(--red-soft-12)] px-4 text-micro font-bold uppercase tracking-wider text-[var(--red-soft)] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </div>
      </Dialog>
      <PaywallModal />
      </div>
    </PageContainer>
  );
}
