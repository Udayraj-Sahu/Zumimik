import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/services/offline/db";
import { useAuthStore } from "@/stores/auth-store";
import { purgeUserData, resetAppState } from "./reset-app-state";
import { allLearnerKeys, learnerKeys } from "@/lib/learning/storage-keys";

const ev = (id: string) => ({ event_id: id, event_type: "problem_attempt", client_timestamp: 1, metadata: {} });

async function seed() {
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
  for (const key of allLearnerKeys("u1")) localStorage.setItem(key, "x");
  for (const key of allLearnerKeys("u2")) localStorage.setItem(key, "x");
  await db.eventQueue.bulkPut([
    { id: "b1", userId: "u1", events: [ev("e1")], createdAt: 1, attempts: 0, status: "pending" },
    { id: "b2", userId: "u2", events: [ev("e2")], createdAt: 2, attempts: 0, status: "pending" },
  ]);
}

describe("what is kept and what is wiped", () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.eventQueue.clear();
  });

  it("covers every learner key (one place knows them all)", () => {
    expect(allLearnerKeys("u1")).toHaveLength(Object.keys(learnerKeys).length);
    expect(allLearnerKeys("u1").every((k) => k.endsWith(":u1"))).toBe(true);
  });

  it("logout / expired session keeps the unsynced events and the learner's data for the same learner", async () => {
    await seed();
    await resetAppState();
    expect(await db.eventQueue.count()).toBe(2);
    for (const key of allLearnerKeys("u1")) expect(localStorage.getItem(key)).toBe("x");
  });

  it("deleting the account wipes that learner's queued events and learner data, and nobody else's", async () => {
    await seed();
    await purgeUserData();
    for (const key of allLearnerKeys("u1")) expect(localStorage.getItem(key)).toBeNull();
    expect((await db.eventQueue.toArray()).map((b) => b.id)).toEqual(["b2"]); // the other account on this device is untouched
    for (const key of allLearnerKeys("u2")) expect(localStorage.getItem(key)).toBe("x");
  });
});
