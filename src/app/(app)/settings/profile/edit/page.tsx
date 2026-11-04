"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useProfileData } from "@/hooks/queries/use-profile";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

export default function EditProfilePage() {
  usePageMeta("Edit Profile — Zuzumik");
  const router = useRouter();
  const { data } = useProfileData();
  const profile = data?.profile;
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? profile?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { headerRef } = useEntranceAnimations();

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Enter a valid email address.");
      return;
    }
    if (trimmedPhone && !/^\+?[0-9\s-]{7,15}$/.test(trimmedPhone)) {
      setErrorMsg("Enter a valid phone number (7–15 digits).");
      return;
    }

    setErrorMsg(null);
    updateUser({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone || undefined });
    setSaved(true);
    setTimeout(() => {
      router.push("/settings/profile");
    }, 800);
  };

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-2xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <User size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">PROFILE</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Update your personal information</p>
      </div>

      <div className="mt-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-[28px] font-bold text-primary ring-2 ring-primary/20">
              {profile?.initials ?? "?"}
            </span>
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
              <Camera size={14} />
            </span>
          </div>
          <p className="mt-3 text-micro text-muted-foreground/50">Tap the camera icon to change photo</p>
        </div>

        <div className="flex flex-col gap-5 max-[359px]:gap-4">
          <div>
            <label className="mb-1.5 block text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 whitespace-nowrap">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl px-4 py-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary max-[359px]:px-3 max-[359px]:py-3"
              placeholder="Your name"
              aria-required="true"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 whitespace-nowrap">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl px-4 py-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary max-[359px]:px-3 max-[359px]:py-3"
              placeholder="email@example.com"
              aria-required="true"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 whitespace-nowrap">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl px-4 py-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary max-[359px]:px-3 max-[359px]:py-3"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive" role="alert">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          onClick={handleSave}
          disabled={saved}
          className={cn(
            "mt-8 max-[359px]:py-3",
            saved
              ? "bg-primary/30 text-primary/60 disabled:opacity-100"
              : "hover:opacity-90",
          )}
        >
          {saved ? (
            <>
              <Check size={16} /> Saved
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
      </div>
    </PageContainer>
  );
}