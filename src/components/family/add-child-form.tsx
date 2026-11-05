"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useCreateSeat } from "@/hooks/queries/use-family";

const FIELD =
  "mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-primary/40";
const LABEL = "text-left text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50";

/** Create a child seat: POST /family/sub-account/create { email, password (8+), display_name?, age 8-17 }. */
export function AddChildForm({ onCreated }: { onCreated?: () => void }) {
  const create = useCreateSeat();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <GlassCard className="p-5 max-[359px]:p-4">
      <p className="text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase">Add a child</p>
      <form
        data-testid="add-child-form"
        noValidate
        className="mt-3 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className={LABEL}>
          Child&apos;s email
          <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="child@example.com" className={FIELD} />
        </label>
        <label className={LABEL}>
          Password
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={FIELD} />
        </label>
        <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
          <label className={LABEL}>
            Name (optional)
            <input type="text" autoComplete="off" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="First name" className={FIELD} />
          </label>
          <label className={LABEL}>
            Age
            <input type="number" inputMode="numeric" min={8} max={17} value={age} onChange={(e) => setAge(e.target.value)} placeholder="8 to 17" className={FIELD} />
          </label>
        </div>
        <Button type="submit" disabled={create.isPending} className="min-h-11">
          {create.isPending ? "Creating…" : "Create seat"}
        </Button>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} data-testid="add-child-message" className={message.kind === "error" ? "text-[12px] text-destructive" : "text-[12px] text-primary"}>
            {message.text}
          </p>
        )}
      </form>
    </GlassCard>
  );
}
