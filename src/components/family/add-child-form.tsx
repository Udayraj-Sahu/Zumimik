"use client";

import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdaptiveCard, IconTile } from "@/components/adaptive/adaptive-card";
import { useCreateSeat } from "@/hooks/queries/use-family";

const FIELD =
  "mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] font-semibold text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/40 focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring";
const LABEL = "block text-left text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/55";

/** Create a child seat: POST /family/sub-account/create { email, password (8+), display_name?, age 8-17 }. */
export function AddChildForm({ onCreated }: { onCreated?: () => void }) {
  const create = useCreateSeat();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const submit = () => {
    const ageNumber = Number(age);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMessage({ kind: "error", text: "Enter a valid email address for the child." });
    if (password.length < 8) return setMessage({ kind: "error", text: "The password must be at least 8 characters." });
    if (!Number.isInteger(ageNumber) || ageNumber < 8 || ageNumber > 17) return setMessage({ kind: "error", text: "Child accounts are for ages 8 to 17." });
    setMessage(null);
    create.mutate(
      { email, password, displayName, age: ageNumber },
      {
        onSuccess: () => {
          setMessage({ kind: "ok", text: "Seat created." });
          setEmail("");
          setPassword("");
          setDisplayName("");
          setAge("");
          onCreated?.();
        },
        // The backend's own reason is shown (paid plan needed, family full, email already registered, ...).
        onError: (err) => setMessage({ kind: "error", text: err instanceof Error ? err.message : "Couldn't create the seat." }),
      },
    );
  };

  return (
    <AdaptiveCard label="Add a child">
      <div className="mt-3 flex items-start gap-3.5">
        <IconTile>
          <UserPlus size={18} />
        </IconTile>
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground">Give your child their own seat</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground/60">
            They sign in with the email and password you set here, and keep their own learning history.
          </p>
        </div>
      </div>
      <form
        data-testid="add-child-form"
        noValidate
        className="mt-4 flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3.5 md:grid-cols-2">
          <label className={LABEL}>
            Child&apos;s email
            <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="child@example.com" className={FIELD} />
          </label>
          <label className={LABEL}>
            Password
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`${FIELD} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-[calc(50%+4px)] grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground/60 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </span>
          </label>
        </div>
        <div className="grid grid-cols-[1fr_8rem] gap-3.5 max-[359px]:grid-cols-1">
          <label className={LABEL}>
            Name (optional)
            <input type="text" autoComplete="off" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="First name" className={FIELD} />
          </label>
          <label className={LABEL}>
            Age
            <input type="number" inputMode="numeric" min={8} max={17} value={age} onChange={(e) => setAge(e.target.value)} placeholder="8 to 17" className={FIELD} />
          </label>
        </div>
        <Button type="submit" size="lg" disabled={create.isPending} className="min-h-11">
          {create.isPending ? "Creating…" : "Create seat"}
        </Button>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            data-testid="add-child-message"
            className={message.kind === "error" ? "rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-[12px] text-destructive" : "rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[12px] text-primary"}
          >
            {message.text}
          </p>
        )}
      </form>
    </AdaptiveCard>
  );
}
