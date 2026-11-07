"use client";
import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyClubs } from "@/hooks/queries/use-clubs";
import { checkInToHub, getCurrentPosition, positionMessage, PositionError } from "@/services/hub-checkin";

type State = { kind: "idle" } | { kind: "locating" } | { kind: "done" } | { kind: "error"; message: string };

/**
 * Double-XP hub check-in on the Duel screen. Shown only when the learner belongs to at least one hub (club); location is requested
 * when they tap the button, never on page load.
 */
export function HubCheckinCard() {
  const { data: clubs } = useMyClubs();
  const [picked, setPicked] = useState<string>("");
  const [state, setState] = useState<State>({ kind: "idle" });
  if (!clubs || clubs.length === 0) return null;
  const hubId = picked || clubs[0].hub_id;

  const checkIn = async () => {
    setState({ kind: "locating" });
    try {
      const { latitude, longitude } = await getCurrentPosition();
      await checkInToHub(hubId, latitude, longitude);
      setState({ kind: "done" });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof PositionError
            ? positionMessage(err.reason)
            : err instanceof Error && err.message
              ? err.message
              : "Couldn't check you in. Try again.",
      });
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-border p-4" aria-labelledby="hub-checkin" data-testid="hub-checkin">
      <h3 id="hub-checkin" className="flex items-center gap-2 text-[13px] font-bold text-foreground">
        <MapPin size={14} className="text-primary" aria-hidden /> Check in for double XP
      </h3>
      <p className="mt-1 text-[12px] text-muted-foreground">Stand within 20 m of your hub to earn double XP for an hour. Your location is checked and not stored.</p>
      {clubs.length > 1 && (
        <select
          aria-label="Hub"
          value={hubId}
          onChange={(e) => setPicked(e.target.value)}
          className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground"
        >
          {clubs.map((c) => (
            <option key={c.hub_id} value={c.hub_id}>{c.name}</option>
          ))}
        </select>
      )}
      {clubs.length === 1 && <p className="mt-2 text-[12px] font-semibold text-foreground/80">{clubs[0].name}</p>}
      <Button className="mt-3" variant="glass" fullWidth onClick={() => void checkIn()} disabled={state.kind === "locating"} data-testid="hub-checkin-button">
        {state.kind === "locating" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <MapPin size={14} aria-hidden />}
        {state.kind === "locating" ? "Finding you…" : "Check in here"}
      </Button>
      <p role="status" className="mt-2 text-[12px]" data-testid="hub-checkin-status">
        {state.kind === "done" && <span className="font-semibold text-primary">Checked in. Double XP is on for the next hour.</span>}
        {state.kind === "error" && <span className="text-destructive">{state.message}</span>}
      </p>
    </section>
  );
}
