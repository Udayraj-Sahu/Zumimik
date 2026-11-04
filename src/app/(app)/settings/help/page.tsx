"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { ChevronDown, HelpCircle, Mail, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useHelpData } from "@/hooks/queries/use-help";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { FaqItem } from "@/lib/types/help";
import { GLASS_BG } from "@/lib/theme";

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const toggle = (id: string) => {
    const prev = openId;
    const next = prev === id ? null : id;

    if (prev) {
      const prevEl = contentRefs.current.get(prev);
      if (prevEl) {
        gsap.to(prevEl, { height: 0, opacity: 0, duration: 0.2, ease: "power2.in" });
      }
    }

    if (next) {
      const nextEl = contentRefs.current.get(next);
      if (nextEl) {
        const scrollHeight = nextEl.scrollHeight;
        gsap.set(nextEl, { height: scrollHeight });
        gsap.fromTo(nextEl, { height: 0, opacity: 0 }, { height: scrollHeight, opacity: 1, duration: 0.25, ease: "power2.out" });
      }
    }

    setOpenId(next);
  };

  return (
    <div className="divide-y divide-white/[0.06]">
      {items.map((item) => (
        <div key={item.id}>
          <button
            type="button"
            onClick={() => toggle(item.id)}
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring rounded-xl max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-3"
          >
            <span className="text-[12px] font-semibold text-foreground/80">{item.question}</span>
            <ChevronDown
              size={16}
              className={cn(
                "shrink-0 text-muted-foreground/40 transition-transform duration-200",
                openId === item.id && "rotate-180",
              )}
            />
          </button>
          <div
            ref={(el) => { if (el) contentRefs.current.set(item.id, el); }}
            className={cn(
              "overflow-hidden",
              openId !== item.id && "h-0 opacity-0",
            )}
            style={openId === item.id ? undefined : { height: 0, opacity: 0 }}
          >
            <div className="px-4 pb-4 text-[12px] text-muted-foreground/60 leading-relaxed">
              {item.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HelpPage() {
  usePageMeta("Help & About — Zuzumik");
  const { data, isLoading, error } = useHelpData();
  const sectionsRef = useRef<HTMLDivElement>(null);
  const { headerRef, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (sectionsRef.current && data) {
      const cards = sectionsRef.current.querySelectorAll<HTMLElement>("[data-help-section]");
      staggerIn(cards, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: "power2.out" });
    }
  }, [data, staggerIn]);

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <HelpCircle size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">HELP</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Frequently asked questions and app information</p>
      </div>

      <div ref={sectionsRef} className="mt-6 flex flex-col gap-6 md:grid md:grid-cols-2 md:items-stretch md:gap-6">
        {isLoading && (
          <div className="animate-pulse space-y-4 md:col-span-2">
            <div className="h-52 rounded-3xl" style={{ background: GLASS_BG }} />
            <div className="h-24 rounded-3xl" style={{ background: GLASS_BG }} />
            <div className="h-20 rounded-3xl" style={{ background: GLASS_BG }} />
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center backdrop-blur-xl md:col-span-2">
            <p className="text-[12px] font-semibold text-destructive">Failed to load help content</p>
            <p className="mt-1 text-micro text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
          </div>
        )}

        {data && (
          <>
            <div data-help-section className="rounded-3xl border border-white/[0.06] backdrop-blur-xl overflow-hidden" style={{ background: GLASS_BG }}>
              <div className="px-4 pt-4 pb-2 flex items-center gap-2 max-[359px]:px-3 max-[359px]:pt-3 max-[359px]:pb-2">
                <HelpCircle size={16} className="text-primary" />
                <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">FAQ</h2>
              </div>
              <FaqAccordion items={data.faq} />
            </div>

            <div data-help-section className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 sm:p-5 max-[359px]:p-3" style={{ background: GLASS_BG }}>
              <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">App Info</h2>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Version</span>
                  <span className="font-semibold text-foreground/80">{data.appInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Platform</span>
                  <span className="font-semibold text-foreground/80">{data.appInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Build</span>
                  <span className="font-semibold text-foreground/80">{data.appInfo.buildNumber}</span>
                </div>
              </div>
            </div>

            <div data-help-section className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 sm:p-5 max-[359px]:p-3" style={{ background: GLASS_BG }}>
              <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">Contact & Support</h2>
              <a
                href="mailto:report@zuzumik.io"
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-3 text-[12px] font-semibold text-foreground/80 outline-none transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring backdrop-blur-xl max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-2.5 whitespace-nowrap"
                style={{ background: GLASS_BG }}
              >
                <Mail size={16} className="text-muted-foreground/40" />
                report@zuzumik.io
              </a>
            </div>

            <div data-help-section className="rounded-3xl border border-white/[0.06] backdrop-blur-xl overflow-hidden divide-y divide-white/[0.06]" style={{ background: GLASS_BG }}>
              <h2 className="px-4 pt-4 pb-2 text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 max-[359px]:px-3 max-[359px]:pt-3 max-[359px]:pb-2">Legal</h2>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[12px] font-semibold text-foreground/80 outline-none transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-3 whitespace-nowrap"
              >
                <FileText size={16} className="text-muted-foreground/40" />
                Terms of Service
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[12px] font-semibold text-foreground/80 outline-none transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-3 whitespace-nowrap"
              >
                <ShieldCheck size={16} className="text-muted-foreground/40" />
                Privacy Policy
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
