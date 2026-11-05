import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/services/offline/db";
import { settleAcknowledged } from "@/services/offline/sync";
import { advanceSnapshot, recallSnapshot, rememberSnapshot } from "./snapshot-memory";

const states = (n: number) => ({ Fractions: { totalAttempts: n } });
const sessionEnd = (id: string, ts: number, n: number) => ({ event_id: id, event_type: "session_end", client_timestamp: ts, metadata: { technique_states: states(n) } });

describe("the remembered snapshot", () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.eventQueue.clear();
  });

  it("is kept per learner and survives a read", () => {
    rememberSnapshot("u1", { technique_states: states(3), as_of: 1000 });
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(3));
    expect(recallSnapshot("u2")).toBeNull();
    expect(recallSnapshot("")).toBeNull();
  });

  it("advances to a newer acknowledged picture and never moves back to an older one", () => {
    rememberSnapshot("u1", { technique_states: states(3), as_of: 1000 });
    advanceSnapshot("u1", states(5), 2000);
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(5));
    advanceSnapshot("u1", states(4), 1500); // an older acknowledgement arriving late
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(5));
    advanceSnapshot("u1", states(9), Number.NaN); // an unusable time changes nothing
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(5));
  });

  it("reads a server snapshot time given as an ISO string", () => {
    rememberSnapshot("u1", { technique_states: states(3), as_of: "2026-11-06T10:00:00Z" });
    advanceSnapshot("u1", states(5), Date.parse("2026-11-06T09:00:00Z")); // older than what is remembered
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(3));
    advanceSnapshot("u1", states(6), Date.parse("2026-11-06T11:00:00Z"));
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(6));
  });

  it("an acknowledged batch advances it, but a session_end the server REJECTED does not", async () => {
    rememberSnapshot("u1", { technique_states: states(3), as_of: 1000 });
    const ok = [sessionEnd("e1", 5000, 7)];
    await db.eventQueue.put({ id: "b1", userId: "u1", events: ok, createdAt: 1, attempts: 0, status: "pending" });
    await settleAcknowledged({ id: "b1", userId: "u1", events: ok }, { accepted: 1, rejected: [] });
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(7));

    const refused = [sessionEnd("e2", 9000, 11)];
    await db.eventQueue.put({ id: "b2", userId: "u1", events: refused, createdAt: 2, attempts: 0, status: "pending" });
    await settleAcknowledged({ id: "b2", userId: "u1", events: refused }, { accepted: 0, rejected: [{ event_id: "e2", index: 0, reason: "bad" }] });
    expect(recallSnapshot("u1")?.technique_states).toEqual(states(7)); // the rejected picture is not trusted
  });
});
